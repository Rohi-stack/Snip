import { Router } from 'express';
import { aliasController } from '../controllers/alias.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

export const aliasRoutes = Router();

// All alias operations require an authenticated identity
aliasRoutes.use(requireAuth);

aliasRoutes.post('/', asyncHandler(aliasController.createAlias));
aliasRoutes.get('/me', asyncHandler(aliasController.getMyAliases));
aliasRoutes.delete('/:alias', asyncHandler(aliasController.deleteAlias));
