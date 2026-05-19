import { Router } from 'express';
import { healthRoutes } from '../health.routes.js';
import { urlRoutes } from './url.routes.js';

/**
 * API v1 — mount feature routers here as you build them.
 * Example later: v1Router.use('/auth', authRoutes);
 */
export const v1Router = Router();

v1Router.use('/health', healthRoutes);
v1Router.use('/urls', urlRoutes);
