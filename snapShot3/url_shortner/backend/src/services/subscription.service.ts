import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { razorpay, verifyWebhookSignature } from '../utils/razorpay.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';
import { SubscriptionStatus } from '@prisma/client';
import type { CreateOrderResponse, WebhookPayload } from '../types/subscription.types.js';

const PREMIUM_PRICE_INR = 50000; // ₹500 in paise
const SUBSCRIPTION_DAYS = 30;

/** Derive a human-readable tier label from subscription amount (in paise). */
function resolveTierLabel(amountPaise: number): string {
  const rupees = amountPaise / 100;
  if (rupees <= 2) return 'Starter';
  if (rupees <= 5) return 'Premium';
  return 'Premium';
}

export interface SubscriptionDetails {
  isPremium: boolean;
  tier?: string;
  amount?: number;    // paise
  currency?: string;
  startsAt?: string;  // ISO
  expiresAt?: string; // ISO
}

export const subscriptionService = {
  async createOrder(userId: string): Promise<CreateOrderResponse> {
    const existing = await subscriptionRepository.findActiveSubscriptionByUserId(userId);
    if (existing) {
      throw new AppError(HTTP.CONFLICT, 'User already has an active subscription', 'ALREADY_PREMIUM');
    }

    try {
      const order = await razorpay.orders.create({
        amount: PREMIUM_PRICE_INR,
        currency: 'INR',
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: { userId },
      });

      // We do NOT persist to DB yet. We wait for webhook verification!
      
      return {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
      };
    } catch (error) {
      throw new AppError(HTTP.INTERNAL, 'Failed to create payment order', 'ORDER_CREATION_FAILED');
    }
  },

  async handleWebhook(body: string, signature: string): Promise<void> {
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      throw new AppError(HTTP.UNAUTHORIZED, 'Invalid webhook signature', 'INVALID_SIGNATURE');
    }

    const payload: WebhookPayload = JSON.parse(body);

    if (payload.event === 'order.paid') {
      const paymentEntity = payload.payload.payment?.entity;
      const orderEntity = payload.payload.order?.entity;
      
      const paymentId = paymentEntity?.id || `mock_payment_${Date.now()}`;
      const amount = paymentEntity?.amount ?? PREMIUM_PRICE_INR;
      const currency = paymentEntity?.currency ?? 'INR';
      
      const userId = orderEntity?.notes?.userId || paymentEntity?.notes?.userId;
      if (!userId) return;

      const existingSub = await subscriptionRepository.findSubscriptionByPaymentId(paymentId);
      if (existingSub) return;

      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DAYS);

      await subscriptionRepository.createSubscription({
        userId,
        razorpayPaymentId: paymentId,
        amount,
        currency,
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

