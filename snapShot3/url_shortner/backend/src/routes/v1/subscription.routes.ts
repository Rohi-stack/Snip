import { Router } from 'express';
import { subscriptionController } from '../../controllers/subscription.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const subscriptionRoutes = Router();

subscriptionRoutes.post('/webhook', asyncHandler(subscriptionController.webhook));
subscriptionRoutes.post('/create-order', requireAuth, asyncHandler(subscriptionController.createOrder));
subscriptionRoutes.get('/me', requireAuth, asyncHandler(subscriptionController.getMySubscription));
