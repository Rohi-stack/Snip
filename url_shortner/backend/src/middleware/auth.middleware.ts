import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

// Extend Express Request type to include `user`
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Missing or malformed Authorization header', 'MISSING_AUTH_HEADER');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Attach minimal identity to request.
    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = verifyAccessToken(token);
        req.user = {
          id: payload.userId,
          email: payload.email,
        };
      } catch (e) {
        // Ignore invalid tokens for optional routes
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
