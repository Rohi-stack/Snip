import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { aliasService } from '../services/alias.service.js';
import { AppError } from '../types/app-error.js';

export const aliasController = {
  async createAlias(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const { alias, urlId } = req.body;

    if (!alias || !urlId) {
      throw new AppError(HTTP.BAD_REQUEST, 'alias and urlId are required', 'MISSING_FIELDS');
    }

    const createdAlias = await aliasService.createAlias(req.user.id, { alias, urlId });

    res.status(HTTP.CREATED).json({
      success: true,
      data: createdAlias,
    });
  },

  async deleteAlias(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const { alias } = req.params;

    if (!alias) {
      throw new AppError(HTTP.BAD_REQUEST, 'alias parameter is required', 'MISSING_ALIAS');
    }

    const releasedAlias = await aliasService.deleteAlias(req.user.id, String(alias));

    res.status(HTTP.OK).json({
      success: true,
      data: releasedAlias,
    });
  },

  async getMyAliases(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const aliases = await aliasService.getMyAliases(req.user.id);

    res.status(HTTP.OK).json({
      success: true,
      data: aliases,
    });
  }
};
