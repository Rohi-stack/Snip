import { Router } from 'express';
import { healthRoutes } from '../health.routes.js';
import { urlRoutes } from './url.routes.js';
import { authRoutes } from '../auth.routes.js';
import { aliasRoutes } from '../alias.routes.js';
import { subscriptionRoutes } from './subscription.routes.js';
import { qrRoutes } from './qr.routes.js';

export const v1Router = Router();

v1Router.use('/health', healthRoutes);
v1Router.use('/urls', urlRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/aliases', aliasRoutes);
v1Router.use('/subscriptions', subscriptionRoutes);
v1Router.use('/qr', qrRoutes);
