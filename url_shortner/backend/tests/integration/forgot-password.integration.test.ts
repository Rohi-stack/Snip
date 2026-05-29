import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Forgot / Reset Password Integration', () => {
  const testEmail = 'resetuser@example.com';
  const rawPassword = 'oldpassword123';
  let userId: string;

  beforeEach(async () => {
    // Clear tokens and test user
    await prisma.passwordResetToken.deleteMany({});
    await prisma.authSession.deleteMany({});
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Create a fresh test user
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        authProvider: 'LOCAL',
        emailVerified: true,
        verifiedAt: new Date(),
      },
    });
    userId = user.id;
  });

  it('should prevent email enumeration on forgot password request', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('If an account exists, a reset link has been sent.');
    
    // Assure no token is generated in DB
    const tokens = await prisma.passwordResetToken.findMany({});
    expect(tokens.length).toBe(0);
  });

  it('should successfully create and store password reset token for valid email', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify token stored in DB
    const dbToken = await prisma.passwordResetToken.findFirst({
      where: { userId },
    });
    expect(dbToken).not.toBeNull();
    expect(dbToken?.tokenHash).toBeDefined();
    expect(dbToken?.usedAt).toBeNull();
    
    // Check 15-minute expiry spacing
    const expiryDiff = dbToken!.expiresAt.getTime() - Date.now();
    expect(expiryDiff).toBeGreaterThan(14 * 60 * 1000);
    expect(expiryDiff).toBeLessThan(16 * 60 * 1000);
  });

  it('should reject password reset with invalid token', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid_token_here', password: 'newpassword123' })
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('should reject password reset with expired token', async () => {
    const rawToken = 'expired_raw_token_xyz';
    const tokenHash = hashToken(rawToken);
    
    // Create an already expired token in DB
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() - 5 * 1000), // expired 5s ago
      },
    });

    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' })
      .expect(400);

    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('should successfully reset password, invalidate token, and revoke sessions', async () => {
    // 1. Send forgot password request to populate DB
    await request(testApp)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail });

    const dbToken = await prisma.passwordResetToken.findFirst({
      where: { userId },
    });
    expect(dbToken).not.toBeNull();

    // In a real flow, the raw token is in the email link, but since we hash it,
    // we'll mock reset using a known raw token.
    const rawToken = 'known_raw_token_value_abc';
    const tokenHash = hashToken(rawToken);

    await prisma.passwordResetToken.update({
      where: { id: dbToken!.id },
      data: { tokenHash },
    });

    // Create a mock active login session for this user to test revocation
    const session = await prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash: 'somesessionhash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // 2. Perform password reset
    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Password reset successfully.');

    // 3. Assertions:
    // A. Token is marked as used
    const updatedToken = await prisma.passwordResetToken.findUnique({
      where: { id: dbToken!.id },
    });
    expect(updatedToken?.usedAt).not.toBeNull();

    // B. Old session is revoked
    const dbSession = await prisma.authSession.findUnique({
      where: { id: session.id },
    });
    expect(dbSession).toBeNull();

    // C. User password updated successfully and can login with new credentials
    const loginRes = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'newpassword123' })
      .expect(200);

    expect(loginRes.body.data.tokens.accessToken).toBeDefined();

    // D. Old password no longer works
    await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: rawPassword })
      .expect(401);
  });

  it('should reject password reset reuse', async () => {
    const rawToken = 'reuse_raw_token';
    const tokenHash = hashToken(rawToken);

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: new Date(), // Already marked used
      },
    });

    const res = await request(testApp)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' })
      .expect(400);

    expect(res.body.error.code).toBe('TOKEN_ALREADY_USED');
  });
});
