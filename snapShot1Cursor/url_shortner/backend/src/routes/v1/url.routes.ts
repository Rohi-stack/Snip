import { Router } from 'express';
import { urlController } from '../../controllers/url.controller.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const urlRoutes = Router();

urlRoutes.post('/', asyncHandler(urlController.createUrl));
