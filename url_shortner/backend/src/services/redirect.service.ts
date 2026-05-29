import { UrlStatus } from '@prisma/client';
import { HTTP } from '../constants/http.js';
import { urlRepository } from '../repositories/url.repository.js';
import { clickRepository } from '../repositories/click.repository.js';
import { aliasRepository } from '../repositories/alias.repository.js';
import { parseUserAgent } from '../utils/user-agent.js';
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

    let url = await urlRepository.findByShortCode(shortCode);

    if (!url) {
      const alias = await aliasRepository.findAlias(shortCode);
      if (alias && alias.status === 'ACTIVE' && alias.currentUrlId) {
        url = await urlRepository.findById(alias.currentUrlId);
      }
    }

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

    // Parse User Agent to extract browser, OS, and device class
    const parsedUa = parseUserAgent(input.userAgent);

    // Save enriched click details synchronously
    await clickRepository.recordClick({
      urlId: url.id,
      ipAddress: input.ip,
      browser: parsedUa.browser,
      os: parsedUa.os,
      deviceType: parsedUa.deviceType,
      userAgent: input.userAgent,
      referrer: input.referrer,
    });

    return url.originalUrl;
  },
};
