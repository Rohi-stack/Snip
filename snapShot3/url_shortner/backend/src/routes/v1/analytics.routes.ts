import { Router } from 'express';
import { analyticsController } from '../../controllers/analytics.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const analyticsRoutes = Router();

analyticsRoutes.get('/overview', requireAuth, asyncHandler(analyticsController.getOverview));
