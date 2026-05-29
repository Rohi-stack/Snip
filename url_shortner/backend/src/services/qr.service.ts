import { urlRepository } from '../repositories/url.repository.js';
import { aliasRepository } from '../repositories/alias.repository.js';
import { subscriptionService } from '../services/subscription.service.js';
import { generateQrCode, type QRFormat } from '../utils/generate-qr.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';
import { UrlStatus } from '@prisma/client';

export const qrService = {
  async getQrCode(userId: string, shortCode: string, format: QRFormat = 'png'): Promise<Buffer | string> {
    let url = await urlRepository.findByShortCode(shortCode);

    if (!url || url.userId !== userId) {
      const alias = await aliasRepository.findAlias(shortCode);
      if (alias && alias.status === 'ACTIVE' && alias.currentUrlId && alias.createdByUserId === userId) {
        url = await urlRepository.findById(alias.currentUrlId);
      }
    }

    if (!url || url.userId !== userId) {
      throw new AppError(HTTP.NOT_FOUND, 'URL not found or unauthorized', 'URL_NOT_FOUND');
    }

    if (url.deletedAt) {
      throw new AppError(HTTP.GONE, 'URL has been deleted', 'URL_DELETED');
    }

    if (url.status === UrlStatus.EXPIRED || (url.expiresAt && new Date() > url.expiresAt)) {
      throw new AppError(HTTP.GONE, 'URL has expired', 'URL_EXPIRED');
    }

    const isPremium = await subscriptionService.checkEntitlement(userId);
    if (!isPremium) {
      throw new AppError(HTTP.FORBIDDEN, 'Premium subscription required for QR generation', 'PREMIUM_REQUIRED');
    }

    const shortUrl = `https://dashurl.in/${shortCode}`;

    return generateQrCode(shortUrl, format);
  }
};
