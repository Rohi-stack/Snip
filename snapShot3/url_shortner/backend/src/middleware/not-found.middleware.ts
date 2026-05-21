import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import type { ApiErrorResponse } from '../types/api-response.js';

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiErrorResponse = {
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  };
  res.status(HTTP.NOT_FOUND).json(body);
}
