import QRCode from 'qrcode';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';

export type QRFormat = 'png' | 'jpeg' | 'svg';

export async function generateQrCode(url: string, format: QRFormat): Promise<Buffer | string> {
  try {
    switch (format) {
      case 'png':
        return await QRCode.toBuffer(url, { type: 'png', margin: 1 });
      case 'jpeg': {
        // qrcode.toBuffer only supports png; toDataURL with jpeg gives a base64 data URL
        const dataUrl = await QRCode.toDataURL(url, { type: 'image/jpeg', margin: 1 });
        // Strip "data:image/jpeg;base64," prefix and convert to Buffer
        const base64 = dataUrl.split(',')[1];
        return Buffer.from(base64, 'base64');
      }
      case 'svg':
        return await QRCode.toString(url, { type: 'svg', margin: 1 });
      default:
        throw new AppError(HTTP.BAD_REQUEST, 'Unsupported QR format', 'INVALID_QR_FORMAT');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(HTTP.INTERNAL, 'Failed to generate QR code', 'QR_GENERATION_FAILED');
  }
}

