import { prisma } from '../prisma/client.js';
import type { Alias, Prisma } from '@prisma/client';

export const aliasRepository = {
  async createAlias(
    data: Prisma.AliasUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Alias> {
    const db = tx || prisma;
    return db.alias.create({ data });
  },

  async findAlias(alias: string, tx?: Prisma.TransactionClient): Promise<Alias | null> {
    const db = tx || prisma;
    return db.alias.findUnique({ where: { alias } });
  },

  async updateAlias(
    alias: string,
    data: Prisma.AliasUncheckedUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Alias> {
    const db = tx || prisma;
    return db.alias.update({
      where: { alias },
      data,
    });
  },

  async findAliasesByUser(userId: string): Promise<Alias[]> {
    return prisma.alias.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
