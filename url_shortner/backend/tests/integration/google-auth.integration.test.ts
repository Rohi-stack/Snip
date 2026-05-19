import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

// Mock the google-auth-library to avoid hitting real Google servers during tests
vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: class {
      verifyIdToken = vi.fn().mockImplementation(async ({ idToken }) => {
        if (idToken === 'valid-new-user-token') {
          return {
            getPayload: () => ({
              email: 'new@google.com',
              name: 'New Google User',
              sub: 'google-id-123',
              picture: 'http://picture.url',
            })
          };
        }
        if (idToken === 'valid-existing-user-token') {
          return {
            getPayload: () => ({
              email: 'existing@example.com',
              name: 'Existing User',
              sub: 'google-id-456',
            })
          };
        }
        throw new Error('Invalid token');
      });
    }
  };
});

describe('Google OAuth Integration', () => {
  it('should create a new user from Google payload', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/google')
      .send({ idToken: 'valid-new-user-token' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('new@google.com');
    expect(res.body.data.tokens.accessToken).toBeDefined();

    const dbUser = await prisma.user.findUnique({ where: { email: 'new@google.com' } });
    expect(dbUser?.googleId).toBe('google-id-123');
    expect(dbUser?.authProvider).toBe('GOOGLE');
    expect(dbUser?.profilePicture).toBe('http://picture.url');
  });

  it('should link a Google login to an existing email/password account', async () => {
    // 1. Create a local account first
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'existing@example.com', password: 'password123', name: 'Original Name' })
      .expect(201);

    // 2. Login with Google using the same email
    const res = await request(testApp)
      .post('/api/v1/auth/google')
      .send({ idToken: 'valid-existing-user-token' })
      .expect(200);

    expect(res.body.success).toBe(true);

    // 3. Verify they were linked without duplicates
    const usersCount = await prisma.user.count({ where: { email: 'existing@example.com' } });
    expect(usersCount).toBe(1);

    const dbUser = await prisma.user.findUnique({ where: { email: 'existing@example.com' } });
    expect(dbUser?.googleId).toBe('google-id-456');
    expect(dbUser?.authProvider).toBe('LOCAL'); // The original provider is retained
  });

  it('should reject invalid Google tokens', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/google')
      .send({ idToken: 'invalid-token-123' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('should reject requests with missing idToken', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/google')
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe('MISSING_ID_TOKEN');
  });
});
