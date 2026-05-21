import { prisma } from '../prisma/client.js';
import type { User, AuthSession, Prisma } from '@prisma/client';

export const authRepository = {
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  },

  async linkGoogleAccount(userId: string, googleId: string, profilePicture?: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        profilePicture,
      },
    });
  },

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async createSession(userId: string, refreshTokenHash: string, expiresAt: Date): Promise<AuthSession> {
    return prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });
  },

  async findSession(refreshTokenHash: string): Promise<(AuthSession & { user: User }) | null> {
    return prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });
  },

  async deleteSession(refreshTokenHash: string): Promise<void> {
    await prisma.authSession.deleteMany({
      where: { refreshTokenHash },
    });
  },
};
