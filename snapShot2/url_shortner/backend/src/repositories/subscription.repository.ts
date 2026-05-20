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
          gt: new Date(), // Has not expired
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findSubscriptionByPaymentId(razorpayPaymentId: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({
      where: { razorpayPaymentId },
    });
  }
};
