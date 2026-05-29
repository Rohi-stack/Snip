import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { stripe, STRIPE_WEBHOOK_SECRET, TIER_PRICES, resolveTierLabel } from '../utils/stripe.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';
import { SubscriptionStatus } from '@prisma/client';

const SUBSCRIPTION_DAYS = 30;

export interface SubscriptionDetails {
  isPremium: boolean;
  tier?: string;
  amount?: number;    // paise
  currency?: string;
  startsAt?: string;  // ISO
  expiresAt?: string; // ISO
}

export interface CheckoutSessionResponse {
  url: string;
}

export const subscriptionService = {

  async createCheckoutSession(
    userId: string,
    tier: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSessionResponse> {
    if (!stripe) {
      throw new AppError(HTTP.INTERNAL, 'Stripe is not configured on this server.', 'STRIPE_NOT_CONFIGURED');
    }

    const tierKey = tier.toLowerCase();
    const tierConfig = TIER_PRICES[tierKey];
    if (!tierConfig) {
      throw new AppError(HTTP.BAD_REQUEST, `Unknown tier: ${tier}`, 'INVALID_TIER');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      metadata: { userId, tier: tierKey },
      line_items: [
        {
          price_data: {
            currency: 'inr',
            unit_amount: tierConfig.amount,
            product_data: {
              name: `DashURL ${tierConfig.label} Plan`,
              description: `30-day ${tierConfig.label} subscription`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new AppError(HTTP.INTERNAL, 'Failed to create checkout session URL', 'SESSION_URL_MISSING');
    }

    return { url: session.url };
  },

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!stripe) {
      throw new AppError(HTTP.INTERNAL, 'Stripe is not configured.', 'STRIPE_NOT_CONFIGURED');
    }
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new AppError(HTTP.INTERNAL, 'Stripe webhook secret is not configured.', 'WEBHOOK_SECRET_MISSING');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Invalid Stripe webhook signature', 'INVALID_STRIPE_SIGNATURE');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId) return;

      // Idempotency check
      const existing = await subscriptionRepository.findSubscriptionBySessionId(session.id);
      if (existing) return;

      const tierKey = session.metadata?.tier ?? 'premium';
      const tierConfig = TIER_PRICES[tierKey] ?? TIER_PRICES['premium'];

      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DAYS);

      await subscriptionRepository.createSubscription({
        userId,
        stripeSessionId: session.id,
        amount: tierConfig.amount,
        currency: 'INR',
        status: SubscriptionStatus.ACTIVE,
        startsAt,
        expiresAt,
      });
    }
  },

  /** Returns full subscription details — or `{ isPremium: false }` for free users. */
  async getSubscriptionDetails(userId: string): Promise<SubscriptionDetails> {
    const sub = await subscriptionRepository.findActiveSubscriptionByUserId(userId);
    if (!sub) return { isPremium: false };

    return {
      isPremium: true,
      tier: resolveTierLabel(sub.amount),
      amount: sub.amount,
      currency: sub.currency,
      startsAt: sub.startsAt.toISOString(),
      expiresAt: sub.expiresAt.toISOString(),
    };
  },

  /** Lightweight boolean check used by entitlement guards. */
  async checkEntitlement(userId: string): Promise<boolean> {
    const sub = await subscriptionRepository.findActiveSubscriptionByUserId(userId);
    return !!sub;
  },
};
