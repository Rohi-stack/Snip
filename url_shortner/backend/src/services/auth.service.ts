import crypto from 'crypto';
import { AuthProvider } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository.js';
import { hashPassword, verifyPassword } from '../utils/hash-password.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { verifyGoogleToken } from '../utils/google-oauth.js';
import { verifyAppleToken } from '../utils/apple-oauth.js';
import { mailService } from '../modules/mail/mail.service.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';
import type { RegisterInput, LoginInput, AuthTokens, AuthenticatedUser } from '../types/auth.types.js';

interface GoogleLoginInput {
  idToken?: string;
  accessToken?: string;
}

const REFRESH_TOKEN_TTL_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Shared pipeline to securely spawn and persist authorization sessions and JSON Web Tokens.
 */
async function createAuthSession(user: { id: string; email: string; name: string | null }): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
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
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    const existing = await authRepository.findUserByEmail(input.email);
    
    if (existing) {
      if (existing.emailVerified) {
        throw new AppError(HTTP.CONFLICT, 'Email is already registered', 'EMAIL_IN_USE');
      }
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      
      await authRepository.updateUserOtp(existing.id, otp, expiresAt, new Date());
      await mailService.sendVerificationOtp(existing.email, otp, 15);
      
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
      };
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
      emailVerified: false,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await authRepository.updateUserOtp(user.id, otp, expiresAt, new Date());
    await mailService.sendVerificationOtp(user.email, otp, 15);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },

  async verifyOtp(email: string, otp: string): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError(HTTP.NOT_FOUND, 'User not found', 'USER_NOT_FOUND');
    }

    if (user.emailVerified) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email is already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    if (!user.otpCode || user.otpCode !== otp) {
      throw new AppError(HTTP.BAD_REQUEST, 'Incorrect verification code', 'INVALID_OTP');
    }

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      throw new AppError(HTTP.BAD_REQUEST, 'Verification code has expired', 'OTP_EXPIRED');
    }

    await authRepository.updateUserVerificationStatus(user.id, true, new Date());
    await authRepository.updateUserOtp(user.id, null, null, null);

    mailService.sendWelcomeEmail(user.email, user.name ?? undefined).catch(() => {});

    return createAuthSession(user);
  },

  async resendOtp(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError(HTTP.NOT_FOUND, 'User not found', 'USER_NOT_FOUND');
    }

    if (user.emailVerified) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email is already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    const COOLDOWN_MS = 60 * 1000;
    if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - user.otpSentAt.getTime())) / 1000);
      throw new AppError(
        HTTP.TOO_MANY_REQUESTS,
        `Please wait ${remaining} seconds before requesting a new code.`,
        'OTP_COOLDOWN'
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await authRepository.updateUserOtp(user.id, otp, expiresAt, new Date());
    await mailService.sendVerificationOtp(user.email, otp, 15);
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

    if (!user.emailVerified) {
      throw new AppError(HTTP.FORBIDDEN, 'Email is not verified', 'EMAIL_NOT_VERIFIED');
    }

    return createAuthSession(user);
  },

  async loginWithGoogle(input: GoogleLoginInput): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const payload = await verifyGoogleToken(input);

    let user = await authRepository.findUserByGoogleId(payload.googleId);

    if (!user) {
      user = await authRepository.findUserByEmail(payload.email);

      if (user) {
        user = await authRepository.linkGoogleAccount(user.id, payload.googleId, payload.picture);
        if (!user.emailVerified) {
          user = await authRepository.updateUserVerificationStatus(user.id, true, new Date());
        }
      } else {
        user = await authRepository.createUser({
          email: payload.email,
          name: payload.name,
          googleId: payload.googleId,
          profilePicture: payload.picture,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: true,
          verifiedAt: new Date(),
        });
        
        mailService.sendWelcomeEmail(user.email, user.name ?? undefined).catch(() => {});
      }
    }

    return createAuthSession(user);
  },

  async loginWithApple(identityToken: string, name?: string): Promise<{ user: AuthenticatedUser; tokens: AuthTokens }> {
    const payload = await verifyAppleToken(identityToken);

    let user = await authRepository.findUserByAppleId(payload.appleId);

    if (!user) {
      user = await authRepository.findUserByEmail(payload.email);

      if (user) {
        // Link pre-existing account
        user = await authRepository.linkAppleAccount(user.id, payload.appleId);
        if (!user.emailVerified) {
          user = await authRepository.updateUserVerificationStatus(user.id, true, new Date());
        }
      } else {
        // Create new Apple OAuth user
        const resolvedName = name || payload.name || 'Apple User';
        user = await authRepository.createUser({
          email: payload.email,
          name: resolvedName,
          appleId: payload.appleId,
          authProvider: AuthProvider.APPLE,
          emailVerified: true,
          verifiedAt: new Date(),
        });

        mailService.sendWelcomeEmail(user.email, user.name ?? undefined).catch(() => {});
      }
    }

    return createAuthSession(user);
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
    await authRepository.deleteSession(refreshTokenHash);
  },
};
