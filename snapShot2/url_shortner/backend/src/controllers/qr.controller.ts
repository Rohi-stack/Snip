import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { qrService } from '../services/qr.service.js';
import { AppError } from '../types/app-error.js';
import type { QRFormat } from '../utils/generate-qr.js';

export const qrController = {
  async getQrCode(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const { shortCode } = req.params;
    const format = (String(req.query.format ?? 'png')).toLowerCase();

    if (!['png', 'jpeg', 'svg'].includes(format)) {
      throw new AppError(HTTP.BAD_REQUEST, 'Invalid format. Must be png, jpeg, or svg', 'INVALID_FORMAT');
    }

    const qrData = await qrService.getQrCode(req.user.id, String(shortCode), format as QRFormat);

    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.status(HTTP.OK).send(qrData);
    } else {
      res.setHeader('Content-Type', `image/${format}`);
      res.status(HTTP.OK).send(qrData);
    }
  }
};
