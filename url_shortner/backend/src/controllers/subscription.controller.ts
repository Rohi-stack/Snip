import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { subscriptionService } from '../services/subscription.service.js';
import { AppError } from '../types/app-error.js';

export const subscriptionController = {
  async createOrder(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const order = await subscriptionService.createOrder(req.user.id);

    res.status(HTTP.CREATED).json({
      success: true,
      data: order,
    });
  },

  async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature || typeof signature !== 'string') {
      throw new AppError(HTTP.UNAUTHORIZED, 'Missing signature', 'MISSING_SIGNATURE');
    }

    const bodyStr = JSON.stringify(req.body);
    await subscriptionService.handleWebhook(bodyStr, signature);

    res.status(HTTP.OK).send({ status: 'ok' });
  },

  async getMySubscription(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const details = await subscriptionService.getSubscriptionDetails(req.user.id);

    res.status(HTTP.OK).json({
      success: true,
      data: details,
    });
  },
};

