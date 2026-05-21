import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { subscriptionService } from '../services/subscription.service.js';
import { AppError } from '../types/app-error.js';

const FRONTEND_URL = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

export const subscriptionController = {
  /** POST /api/v1/subscriptions/checkout — creates Stripe Checkout session */
  async createCheckout(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const { tier } = req.body;
    if (!tier || typeof tier !== 'string') {
      throw new AppError(HTTP.BAD_REQUEST, 'tier is required (starter | premium)', 'MISSING_TIER');
    }

    const successUrl = `${FRONTEND_URL}/dashboard/billing?success=1&tier=${tier}`;
    const cancelUrl  = `${FRONTEND_URL}/pricing?cancelled=1`;

    const { url } = await subscriptionService.createCheckoutSession(
      req.user.id,
      tier,
      successUrl,
      cancelUrl,
    );

    res.status(HTTP.OK).json({ success: true, data: { url } });
  },

  /** POST /api/v1/subscriptions/webhook — Stripe webhook (raw body) */
  async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new AppError(HTTP.UNAUTHORIZED, 'Missing Stripe signature', 'MISSING_SIGNATURE');
    }

    // req.body is a raw Buffer when this route uses express.raw()
    await subscriptionService.handleWebhook(req.body as Buffer, signature);

    res.status(HTTP.OK).json({ received: true });
  },

  /** GET /api/v1/subscriptions/me — current user's subscription details */
  async getMySubscription(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(HTTP.UNAUTHORIZED, 'User not authenticated', 'UNAUTHORIZED');

    const details = await subscriptionService.getSubscriptionDetails(req.user.id);

    res.status(HTTP.OK).json({ success: true, data: details });
  },
};
