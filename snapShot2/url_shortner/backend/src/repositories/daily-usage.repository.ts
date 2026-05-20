import type { DailyUrlUsage, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import type { IncrementUsageInput } from '../types/quota.types.js';

export const dailyUsageRepository = {
  /**
   * Upserts the daily usage bucket and atomically increments the count.
   * By using an upsert inside a transaction, we avoid Read-Modify-Write race conditions.
   */
  async upsertUsageAndReturn(
    input: IncrementUsageInput,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<DailyUrlUsage> {
    // To prevent unique constraint collisions (e.g., multiple logged-in users sharing an office IP),
    // we strictly separate anonymous buckets (identified solely by IP) from user buckets (identified solely by userId).
    if (input.userId) {
      return tx.dailyUrlUsage.upsert({
        where: {
          userId_usageDate: {
            userId: input.userId,
            usageDate: input.usageDate,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          userId: input.userId,
          creatorIp: null,
          usageDate: input.usageDate,
          count: 1,
        },
      });
    }

    return tx.dailyUrlUsage.upsert({
      where: {
        creatorIp_usageDate: {
          creatorIp: input.creatorIp,
          usageDate: input.usageDate,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId: null,
        creatorIp: input.creatorIp,
        usageDate: input.usageDate,
        count: 1,
      },
    });
  },
};
