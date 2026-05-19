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

export interface ShortenRequest {
  originalUrl: string;
  alias?: string;
  expiresAt?: string;
  generateQr?: boolean;
}

export interface ShortenResult {
  shortUrl: string;
  shortCode: string;
  qrDataUrl?: string;
}

export type ExpiryOption = 'never' | '1d' | '7d' | '30d';
