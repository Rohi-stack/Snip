import { Router } from 'express';
import { redirectController } from '../controllers/redirect.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const redirectRouter = Router();

// Matches e.g. GET /abc123XYZ
redirectRouter.get(
  '/:shortCode',
  asyncHandler(redirectController.handleRedirect)
);
