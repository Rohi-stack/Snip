import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { authService } from '../services/auth.service.js';
import { AppError } from '../types/app-error.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email and password are required', 'MISSING_CREDENTIALS');
    }

    const user = await authService.register({ email, password, name });
    
    res.status(HTTP.CREATED).json({
      success: true,
      data: user,
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email and password are required', 'MISSING_CREDENTIALS');
    }

    const { user, tokens } = await authService.login({ email, password });

    res.status(HTTP.OK).json({
      success: true,
      data: { user, tokens },
    });
  },

  async googleLogin(req: Request, res: Response): Promise<void> {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError(HTTP.BAD_REQUEST, 'Google ID token is required', 'MISSING_ID_TOKEN');
    }

    const { user, tokens } = await authService.loginWithGoogle({ idToken });

    res.status(HTTP.OK).json({
      success: true,
      data: { user, tokens },
    });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(HTTP.BAD_REQUEST, 'Refresh token is required', 'MISSING_REFRESH_TOKEN');
    }

    const tokens = await authService.refresh(refreshToken);

    res.status(HTTP.OK).json({
      success: true,
      data: tokens,
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(HTTP.BAD_REQUEST, 'Refresh token is required', 'MISSING_REFRESH_TOKEN');
    }

    await authService.logout(refreshToken);

    res.status(HTTP.OK).json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  async getMe(req: Request, res: Response): Promise<void> {
    // req.user is populated by requireAuth middleware
    if (!req.user) {
        throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');
    }

    res.status(HTTP.OK).json({
      success: true,
      data: req.user,
    });
  },
};
