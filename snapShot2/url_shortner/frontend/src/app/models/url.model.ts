export interface ShortUrl {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  alias?: string;
  clicks: number;
  createdAt: string;
  expiresAt?: string;
  hasQr: boolean;
}

/** POST /api/v1/urls request body */
export interface ShortenRequest {
  originalUrl: string;
  alias?: string;
}

/**
 * POST /api/v1/urls success response shape.
 * Mirrors CreateUrlResult from backend — tier is 'anonymous' | 'registered' | 'premium'.
 */
export interface ShortenApiResponse {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string;
  status: string;
  tier: 'anonymous' | 'registered' | 'premium';
  quotaLimitPerDay: number;
  clickCount: number;
  createdAt: string;
}

/** Backend wraps data in { success: true, data: ... } */
export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export type ExpiryOption = 'never' | '1d' | '7d' | '30d';
