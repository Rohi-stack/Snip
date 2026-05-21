import { prisma } from '../prisma/client.js';
import type { Subscription, Prisma } from '@prisma/client';
import { SubscriptionStatus } from '@prisma/client';

export const subscriptionRepository = {
  async createSubscription(data: Prisma.SubscriptionUncheckedCreateInput): Promise<Subscription> {
    return prisma.subscription.create({ data });
  },

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
    expiresAt?: Date
  ): Promise<Subscription> {
    return prisma.subscription.update({
      where: { id },
      data: {
        status,
        ...(expiresAt ? { expiresAt } : {}),
      },
    });
  },

  async findActiveSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findSubscriptionBySessionId(stripeSessionId: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({
      where: { stripeSessionId },
    });
  },

  async findSubscriptionBySubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });
  },

  /** Upsert a stripe customer id against a user */
  async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  },

  async findUserByStripeCustomerId(stripeCustomerId: string) {
    return prisma.user.findUnique({ where: { stripeCustomerId } });
  },
};
