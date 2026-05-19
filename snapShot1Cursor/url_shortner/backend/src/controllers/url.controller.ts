import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { urlService } from '../services/url.service.js';
import type { ApiSuccessResponse } from '../types/api-response.js';
import type { CreateUrlRequestBody, CreateUrlResult } from '../types/url.types.js';

function resolveClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket.remoteAddress ?? '127.0.0.1';
}

export const urlController = {
  async createUrl(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateUrlRequestBody;

    const data: CreateUrlResult = await urlService.createUrl({
      originalUrl: body.originalUrl,
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
