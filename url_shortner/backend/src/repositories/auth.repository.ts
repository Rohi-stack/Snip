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

  async findUserByAppleId(appleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { appleId } });
  },

  async linkAppleAccount(userId: string, appleId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { appleId },
    });
  },

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async updateUserVerificationStatus(userId: string, emailVerified: boolean, verifiedAt: Date | null): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerified, verifiedAt },
    });
  },

  async updateUserOtp(userId: string, otpCode: string | null, otpExpiresAt: Date | null, otpSentAt: Date | null): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { otpCode, otpExpiresAt, otpSentAt },
    });
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

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  },

  async findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  },

  async markPasswordResetTokenUsed(tokenId: string) {
    return prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  },

  async updateUserPasswordAndRevokeSessions(userId: string, passwordHash: string) {
    return prisma.$transaction(async (tx) => {
      // Revoke all sessions for this user
      await tx.authSession.deleteMany({
        where: { userId },
      });
      // Update password
      return tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    });
  },
};
