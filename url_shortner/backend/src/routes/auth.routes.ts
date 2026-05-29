import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRegistrationInput, requestSanitizer } from '../validators/input.validator.js';

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Prevent spam, allow high threshold in tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 15 minutes.',
    error: { code: 'FORGOT_PASSWORD_RATE_LIMIT_EXCEEDED' }
  }
});

export const authRoutes = Router();

authRoutes.post('/register', requestSanitizer, validateRegistrationInput, asyncHandler(authController.register));
authRoutes.post('/verify-otp', requestSanitizer, asyncHandler(authController.verifyOtp));
authRoutes.post('/resend-otp', requestSanitizer, asyncHandler(authController.resendOtp));
authRoutes.post('/forgot-password', requestSanitizer, forgotPasswordLimiter, asyncHandler(authController.forgotPassword));
authRoutes.post('/reset-password', requestSanitizer, asyncHandler(authController.resetPassword));
authRoutes.post('/login', requestSanitizer, asyncHandler(authController.login));
authRoutes.post('/google', requestSanitizer, asyncHandler(authController.googleLogin));
authRoutes.post('/apple', requestSanitizer, asyncHandler(authController.appleLogin));
authRoutes.post('/refresh', requestSanitizer, asyncHandler(authController.refresh));
authRoutes.post('/logout', requestSanitizer, asyncHandler(authController.logout));
authRoutes.get('/config', asyncHandler(authController.getConfig));

// Protected routes
authRoutes.get('/me', requireAuth, asyncHandler(authController.getMe));
