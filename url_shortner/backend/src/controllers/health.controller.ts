import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { healthService } from '../services/health.service.js';
import type { ApiSuccessResponse } from '../types/api-response.js';

export const healthController = {
  async getHealth(_req: Request, res: Response): Promise<void> {
    const data = await healthService.getHealth();
    const body: ApiSuccessResponse<typeof data> = { success: true, data };
    res.status(HTTP.OK).json(body);
  },
};
