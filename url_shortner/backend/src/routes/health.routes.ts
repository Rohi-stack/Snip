import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const healthRoutes = Router();

healthRoutes.get('/', asyncHandler(healthController.getHealth));
