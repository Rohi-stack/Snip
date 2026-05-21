import { prisma } from '../prisma/client.js';

export const healthRepository = {
  async pingDatabase(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
