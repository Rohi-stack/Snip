import type { UrlStatus } from '@prisma/client';
import type { UserTier } from '../constants/url-tier.js';

/** Request body for POST /api/v1/urls */
export interface CreateUrlRequestBody {
  originalUrl?: unknown;
}

/** Controller → service */
export interface CreateUrlInput {
  originalUrl: unknown;
  tier?: UserTier;
  creatorIp: string;
  creatorUserAgent?: string | null;
  userId?: string | null;
}

/** Service → repository (persistence payload) */
export interface CreateUrlRecordInput {
  userId?: string | null;
  originalUrl: string;
  shortCode: string;
  expiresAt: Date;
  status: UrlStatus;
  creatorIp: string;
  creatorUserAgent?: string | null;
}

/** Persisted row returned from repository (Prisma-shaped, no leak of Prisma types to controller) */
export interface PersistedUrl {
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
}

/** Service → controller API response */
export interface CreateUrlResult {
  id: string;
  originalUrl: string;
  shortCode: string;
  expiresAt: string;
  status: UrlStatus;
  tier: UserTier;
  quotaLimitPerDay: number;
  clickCount: number;
  createdAt: string;
}
