import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { analyticsService } from '../services/analytics.service.js';
import { AppError } from '../types/app-error.js';

type Period = '7d' | '30d' | 'all';
const VALID_PERIODS: Period[] = ['7d', '30d', 'all'];

export const analyticsController = {
  async getOverview(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'Not authenticated', 'UNAUTHORIZED');

    const rawPeriod = String(req.query['period'] ?? '7d');
    const period: Period = VALID_PERIODS.includes(rawPeriod as Period)
      ? (rawPeriod as Period)
      : '7d';

    const data = await analyticsService.getOverview(req.user.id, period);
    res.status(HTTP.OK).json({ success: true, data });
  },
};
