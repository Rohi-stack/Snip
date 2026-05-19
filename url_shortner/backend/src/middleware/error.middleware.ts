import type { NextFunction, Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { env } from '../config/index.js';
import { AppError } from '../types/app-error.js';
import type { ApiErrorResponse } from '../types/api-response.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      success: false,
      error: { message: err.message, code: err.code },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Intercept Express route parsing URI decoding errors
  if (err instanceof URIError) {
    const body: ApiErrorResponse = {
      success: false,
      error: { message: 'Malformed URI parameter', code: 'BAD_REQUEST' },
    };
    res.status(HTTP.BAD_REQUEST).json(body);
    return;
  }

  console.error(err);

  const body: ApiErrorResponse = {
    success: false,
    error: {
      message: env.isProduction ? 'Internal server error' : String(err),
      code: 'INTERNAL_ERROR',
    },
  };
  res.status(HTTP.INTERNAL).json(body);
}
