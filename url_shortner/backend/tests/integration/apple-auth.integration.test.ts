import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';
import { AppError } from '../../src/types/app-error.js';
import { HTTP } from '../../src/constants/http.js';

// Mock verifyAppleToken to bypass network queries during integration tests
vi.mock('../../src/utils/apple-oauth.js', () => {
  class LocalAppError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, message: string, code: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  }

  return {
    verifyAppleToken: vi.fn().mockImplementation(async (idToken: string) => {
      if (idToken === 'valid-new-apple-token') {
        return {
          email: 'new@apple.com',
          appleId: 'apple-id-123',
          name: 'New Apple User',
        };
      }
      if (idToken === 'valid-existing-apple-token') {
        return {
          email: 'existing-apple@example.com',
          appleId: 'apple-id-456',
        };
      }
      if (idToken === 'relay-email-apple-token') {
        return {
          email: 'relay@privaterelay.appleid.com',
          appleId: 'apple-id-relay',
        };
      }
      throw new LocalAppError(401, 'Apple Identity Token verification failed.', 'INVALID_APPLE_TOKEN');
    }),
  };
});

describe('Apple OAuth Integration', () => {
  it('should create a new user from Apple identity token', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/apple')
      .send({ idToken: 'valid-new-apple-token' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('new@apple.com');
    expect(res.body.data.tokens.accessToken).toBeDefined();

    const dbUser = await prisma.user.findUnique({ where: { email: 'new@apple.com' } });
    expect(dbUser?.appleId).toBe('apple-id-123');
    expect(dbUser?.authProvider).toBe('APPLE');
    expect(dbUser?.name).toBe('New Apple User');
  });

  it('should link an Apple login to an existing email/password account', async () => {
    // 1. Create a local account first
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'existing-apple@example.com', password: 'password123', name: 'Original Apple User' })
      .expect(201);

    // 2. Mark local account verified so it links (unverified will also link and activate)
    const localUser = await prisma.user.findUnique({ where: { email: 'existing-apple@example.com' } });
    await prisma.user.update({
      where: { id: localUser!.id },
      data: { emailVerified: true },
    });

    // 3. Login with Apple using the same email
    const res = await request(testApp)
      .post('/api/v1/auth/apple')
      .send({ idToken: 'valid-existing-apple-token' })
      .expect(200);

    expect(res.body.success).toBe(true);

    // 4. Verify they were linked without duplicates
    const usersCount = await prisma.user.count({ where: { email: 'existing-apple@example.com' } });
    expect(usersCount).toBe(1);

    const dbUser = await prisma.user.findUnique({ where: { email: 'existing-apple@example.com' } });
    expect(dbUser?.appleId).toBe('apple-id-456');
    expect(dbUser?.authProvider).toBe('LOCAL'); // The original provider is retained
  });

  it('should support private Apple Relay emails seamlessly', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/apple')
      .send({ idToken: 'relay-email-apple-token' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('relay@privaterelay.appleid.com');

    const dbUser = await prisma.user.findUnique({ where: { email: 'relay@privaterelay.appleid.com' } });
    expect(dbUser?.appleId).toBe('apple-id-relay');
    expect(dbUser?.authProvider).toBe('APPLE');
  });

  it('should reject invalid Apple tokens with 401 status', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/apple')
      .send({ idToken: 'invalid-token' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_APPLE_TOKEN');
  });

  it('should reject requests with missing idToken with 400 status', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/apple')
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe('MISSING_APPLE_TOKEN');
  });
});
