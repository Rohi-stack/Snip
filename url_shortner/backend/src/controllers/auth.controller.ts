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
      message: 'Verification code sent to your email.',
      data: user,
    });
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email and verification code are required', 'MISSING_FIELDS');
    }

    const { user, tokens } = await authService.verifyOtp(email, otp);

    res.status(HTTP.OK).json({
      success: true,
      message: 'Email verified successfully.',
      data: { user, tokens },
    });
  },

  async resendOtp(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email is required', 'MISSING_EMAIL');
    }

    await authService.resendOtp(email);

    res.status(HTTP.OK).json({
      success: true,
      message: 'Verification code resent successfully.',
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
    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      throw new AppError(HTTP.BAD_REQUEST, 'Google idToken or accessToken is required', 'MISSING_ID_TOKEN');
    }

    const { user, tokens } = await authService.loginWithGoogle({ idToken, accessToken });

    res.status(HTTP.OK).json({
      success: true,
      data: { user, tokens },
    });
  },

  async appleLogin(req: Request, res: Response): Promise<void> {
    const { idToken, name } = req.body;

    if (!idToken) {
      throw new AppError(HTTP.BAD_REQUEST, 'Apple idToken is required', 'MISSING_APPLE_TOKEN');
    }

    const { user, tokens } = await authService.loginWithApple(idToken, name);

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
    if (!req.user) {
        throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');
    }

    res.status(HTTP.OK).json({
      success: true,
      data: req.user,
    });
  },

  async getConfig(_req: Request, res: Response): Promise<void> {
    res.status(HTTP.OK).json({
      success: true,
      data: {
        googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        appleClientId: process.env.APPLE_CLIENT_ID || '',
        appleRedirectUri: process.env.APPLE_REDIRECT_URI || '',
      },
    });
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new AppError(HTTP.BAD_REQUEST, 'Email is required', 'MISSING_EMAIL');
    }

    await authService.forgotPassword(email);

    res.status(HTTP.OK).json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError(HTTP.BAD_REQUEST, 'Reset token and password are required', 'MISSING_FIELDS');
    }

    await authService.resetPassword(token, password);

    res.status(HTTP.OK).json({
      success: true,
      message: 'Password reset successfully.',
    });
  },
};
