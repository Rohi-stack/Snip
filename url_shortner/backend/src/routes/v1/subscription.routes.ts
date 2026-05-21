import { Router } from 'express';
import { subscriptionController } from '../../controllers/subscription.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import express from 'express';

export const subscriptionRoutes = Router();

// Stripe requires the raw body for webhook signature verification
subscriptionRoutes.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(subscriptionController.webhook),
);

subscriptionRoutes.post('/checkout', requireAuth, asyncHandler(subscriptionController.createCheckout));
subscriptionRoutes.get('/me', requireAuth, asyncHandler(subscriptionController.getMySubscription));
