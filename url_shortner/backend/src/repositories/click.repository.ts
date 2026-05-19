import { prisma } from '../prisma/client.js';
import type { CreateClickInput } from '../types/click.types.js';

export const clickRepository = {
  /**
   * Persists a click event and atomically increments the denormalized clickCount.
   */
  async recordClick(input: CreateClickInput): Promise<void> {
    await prisma.$transaction([
      prisma.click.create({
        data: {
          urlId: input.urlId,
          ipAddress: input.ipAddress,
          browser: input.browser,
          referrer: input.referrer,
        },
      }),
      prisma.url.update({
        where: { id: input.urlId },
        data: { clickCount: { increment: 1 } },
      }),
    ]);
  },
};
