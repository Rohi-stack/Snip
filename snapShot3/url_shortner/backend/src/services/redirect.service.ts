import { UrlStatus } from '@prisma/client';
import { HTTP } from '../constants/http.js';
import { urlRepository } from '../repositories/url.repository.js';
import { clickRepository } from '../repositories/click.repository.js';
import { AppError } from '../types/app-error.js';

interface ProcessRedirectInput {
  shortCode: string;
  ip: string;
  userAgent: string | null;
  referrer: string | null;
}

export const redirectService = {
  async processRedirect(input: ProcessRedirectInput): Promise<string> {
    const { shortCode } = input;

    const url = await urlRepository.findByShortCode(shortCode);

    if (!url) {
      throw new AppError(HTTP.NOT_FOUND, 'URL not found', 'URL_NOT_FOUND');
    }

    if (url.status !== UrlStatus.ACTIVE) {
      throw new AppError(
        HTTP.GONE,
        'This URL is no longer active',
        'URL_NOT_ACTIVE',
      );
    }

    if (new Date() > url.expiresAt) {
      throw new AppError(
        HTTP.GONE,
        'This URL has expired',
        'URL_EXPIRED',
      );
    }

    // Phase 2: Synchronous Analytics Persistence
    // We intentionally await this to ensure strong transactional consistency.
    await clickRepository.recordClick({
      urlId: url.id,
      ipAddress: input.ip,
      browser: input.userAgent,
      referrer: input.referrer,
    });

    return url.originalUrl;
  },
};
