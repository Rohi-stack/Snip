import { Router } from 'express';
import { urlController } from '../../controllers/url.controller.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateUrlInput, requestSanitizer } from '../../validators/input.validator.js';

export const urlRoutes = Router();

urlRoutes.post('/', optionalAuth, requestSanitizer, validateUrlInput, asyncHandler(urlController.createUrl));
urlRoutes.get('/', requireAuth, asyncHandler(urlController.listUserUrls));
urlRoutes.delete('/:id', requireAuth, asyncHandler(urlController.deleteUrl));
