import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { validateRegistrationInput, requestSanitizer } from '../validators/input.validator.js';

export const authRoutes = Router();

authRoutes.post('/register', requestSanitizer, validateRegistrationInput, asyncHandler(authController.register));
authRoutes.post('/verify-otp', requestSanitizer, asyncHandler(authController.verifyOtp));
authRoutes.post('/resend-otp', requestSanitizer, asyncHandler(authController.resendOtp));
authRoutes.post('/login', requestSanitizer, asyncHandler(authController.login));
authRoutes.post('/google', requestSanitizer, asyncHandler(authController.googleLogin));
authRoutes.post('/apple', requestSanitizer, asyncHandler(authController.appleLogin));
authRoutes.post('/refresh', requestSanitizer, asyncHandler(authController.refresh));
authRoutes.post('/logout', requestSanitizer, asyncHandler(authController.logout));
authRoutes.get('/config', asyncHandler(authController.getConfig));

// Protected routes
authRoutes.get('/me', requireAuth, asyncHandler(authController.getMe));
