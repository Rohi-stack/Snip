import crypto from 'crypto';
import { AuthProvider } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository.js';
import { hashPassword, verifyPassword } from '../utils/hash-password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { verifyGoogleToken } from '../utils/google-oauth.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';
import type { RegisterInput, LoginInput, AuthTokens, AuthenticatedUser } from '../types/auth.types.js';

interface GoogleLoginInput {
  idToken?: string;
  accessToken?: string;
}

const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * We hash the refresh token before storing it.
 * This way, if the DB is compromised, the attacker only gets hashes, not usable refresh tokens.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError(HTTP.CONFLICT, 'Email is already registered', 'EMAIL_IN_USE');
    }

    if (!input.password && input.authProvider !== AuthProvider.GOOGLE) {
      throw new AppError(HTTP.BAD_REQUEST, 'Password is required for local registration', 'PASSWORD_REQUIRED');
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;

    const user = await authRepository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      authProvider: input.authProvider || AuthProvider.LOCAL,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },

  async login(input: LoginInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (!input.password) {
      throw new AppError(HTTP.BAD_REQUEST, 'Password is required', 'PASSWORD_REQUIRED');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await authRepository.createSession(user.id, refreshTokenHash, expiresAt);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens: { accessToken, refreshToken },
    };
  },

  async loginWithGoogle(input: GoogleLoginInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const payload = await verifyGoogleToken(input);

    let user = await authRepository.findUserByGoogleId(payload.googleId);

    if (!user) {
      user = await authRepository.findUserByEmail(payload.email);

      if (user) {
        // Account linking
        user = await authRepository.linkGoogleAccount(user.id, payload.googleId, payload.picture);
      } else {
        // Create new account
        user = await authRepository.createUser({
          email: payload.email,
          name: payload.name,
          googleId: payload.googleId,
          profilePicture: payload.picture,
          authProvider: AuthProvider.GOOGLE,
        });
      }
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await authRepository.createSession(user.id, refreshTokenHash, expiresAt);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens: { accessToken, refreshToken },
    };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const refreshTokenHash = hashToken(refreshToken);
    const session = await authRepository.findSession(refreshTokenHash);

    if (!session) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (new Date() > session.expiresAt) {
      await authRepository.deleteSession(refreshTokenHash);
      throw new AppError(HTTP.UNAUTHORIZED, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Revoke the old token (token rotation prevents replay attacks if intercepted)
    await authRepository.deleteSession(refreshTokenHash);

    const newAccessToken = generateAccessToken({ userId: session.userId, email: session.user.email });
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await authRepository.createSession(session.userId, newRefreshTokenHash, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },

  async logout(refreshToken: string): Promise<void> {
    const refreshTokenHash = hashToken(refreshToken);
    // Silent fail if already logged out
    await authRepository.deleteSession(refreshTokenHash);
  },
};
