import { UrlStatus } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { HTTP } from '../constants/http.js';
import { AppError } from '../types/app-error.js';
import type {
  CreateUrlRecordInput,
  PersistedUrl,
} from '../types/url.types.js';

function toPersistedUrl(row: {
  id: string;
  userId: string | null;
  originalUrl: string;
  shortCode: string;
  expiresAt: Date;
  status: UrlStatus;
  clickCount: number;
  creatorIp: string;
  creatorUserAgent: string | null;
  createdAt: Date;
}): PersistedUrl {
  return {
    id: row.id,
    userId: row.userId,
    originalUrl: row.originalUrl,
    shortCode: row.shortCode,
    expiresAt: row.expiresAt,
    status: row.status,
    clickCount: row.clickCount,
    creatorIp: row.creatorIp,
    creatorUserAgent: row.creatorUserAgent,
    createdAt: row.createdAt,
  };
}

/**
 * URL persistence — Prisma lives here only.
 * No validation, expiry math, or short-code generation.
 */
export const urlRepository = {
  async create(input: CreateUrlRecordInput): Promise<PersistedUrl> {
    const row = await prisma.url.create({
      data: {
        userId: input.userId ?? null,
        originalUrl: input.originalUrl,
        shortCode: input.shortCode,
        expiresAt: input.expiresAt,
        status: input.status,
        creatorIp: input.creatorIp,
        creatorUserAgent: input.creatorUserAgent ?? null,
        clickCount: 0,
      },
    });

    return toPersistedUrl(row);
  },
};

/** Map unexpected Prisma failures to AppError (service may also handle P2002). */
export function mapPrismaErrorToAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(
    HTTP.INTERNAL,
    'Failed to persist URL',
    'URL_PERSISTENCE_FAILED',
  );
}
