import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { redirectService } from '../services/redirect.service.js';
import { AppError } from '../types/app-error.js';
import { resolveClientIp } from '../utils/resolve-ip.js';

export const redirectController = {
  async handleRedirect(req: Request, res: Response): Promise<void> {
    const shortCode = req.params.shortCode as string;

    if (!shortCode || shortCode.trim() === '') {
      throw new AppError(HTTP.BAD_REQUEST, 'shortCode is required', 'MISSING_SHORT_CODE');
    }

    const ip = resolveClientIp(req);
    const userAgent = req.get('user-agent') ?? null;
    const referrer = req.get('referer') ?? req.get('referrer') ?? null;

    const originalUrl = await redirectService.processRedirect({
      shortCode,
      ip,
      userAgent,
      referrer,
    });

    res.redirect(HTTP.FOUND, originalUrl);
  },
};
