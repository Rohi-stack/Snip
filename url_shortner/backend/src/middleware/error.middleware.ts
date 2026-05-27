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
  if (err instanceof AppError || (err && typeof err === 'object' && 'statusCode' in err && 'code' in err)) {
    const errorObj = err as any;
    const body: ApiErrorResponse = {
      success: false,
      error: { message: errorObj.message, code: errorObj.code },
    };
    res.status(errorObj.statusCode).json(body);
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
