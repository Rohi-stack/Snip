import { Router } from 'express';
import { qrController } from '../../controllers/qr.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const qrRoutes = Router();

qrRoutes.use(requireAuth);
qrRoutes.get('/:shortCode', asyncHandler(qrController.getQrCode));
