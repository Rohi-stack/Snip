import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { urlService } from '../services/url.service.js';
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
};
