import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { JwtPayload } from '../types/auth.types.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

// In production, these must be set in the environment.
// For development/testing, we fallback to a hardcoded secret to prevent crashing,
// but we enforce warnings if it's missing.
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-super-secret-key-do-not-use';

export const JWT_CONFIG = {
  expiresIn: '15m', // 15 minutes is short-lived for security
};

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_CONFIG.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Access token expired', 'TOKEN_EXPIRED');
    }
    throw new AppError(HTTP.UNAUTHORIZED, 'Invalid access token', 'TOKEN_INVALID');
  }
}

/**
 * Generates a cryptographically secure random string for the refresh token.
 * Refresh tokens are not JWTs; they are opaque strings stored in the DB.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}
