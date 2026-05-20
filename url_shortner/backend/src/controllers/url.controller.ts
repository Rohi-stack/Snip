import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { urlService } from '../services/url.service.js';
import { AppError } from '../types/app-error.js';
import type { ApiSuccessResponse } from '../types/api-response.js';
import type { CreateUrlRequestBody, CreateUrlResult } from '../types/url.types.js';
import { resolveClientIp } from '../utils/resolve-ip.js';

export const urlController = {
  async createUrl(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateUrlRequestBody;

    const data: CreateUrlResult = await urlService.createUrl({
      originalUrl: body.originalUrl,
      userId: req.user?.id,
      creatorIp: resolveClientIp(req),
      creatorUserAgent: req.get('user-agent') ?? null,
    });

    const response: ApiSuccessResponse<CreateUrlResult> = {
      success: true,
      data,
    };

    res.status(HTTP.CREATED).json(response);
  },

  async listUserUrls(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'Not authenticated', 'UNAUTHORIZED');

    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query['pageSize'] ?? '20'), 10)));

    const result = await urlService.listUserUrls(req.user.id, page, pageSize);
    res.status(HTTP.OK).json({ success: true, data: result });
  },

  async deleteUrl(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'Not authenticated', 'UNAUTHORIZED');

    const { id } = req.params as { id: string };
    await urlService.deleteUrl(req.user.id, id);

    res.status(HTTP.OK).json({ success: true, message: 'URL deleted' });
  },
};
