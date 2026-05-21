import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';
import crypto from 'crypto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Auth Integration', () => {
  it('should register a new user successfully', async () => {
    const res = await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.id).toBeDefined();

    // Verify DB
    const dbUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.passwordHash).toBeDefined();
    // Raw password should never be stored
    expect(dbUser?.passwordHash).not.toBe('password123');
  });

  it('should reject duplicate email registration', async () => {
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);

    const res = await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(409);

    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('should login and issue JWT and Refresh tokens', async () => {
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'login@example.com', password: 'password123' });

    const res = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);

    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
    
    const dbSession = await prisma.authSession.findFirst({
      where: { refreshTokenHash: hashToken(res.body.data.tokens.refreshToken) }
    });
    
    expect(dbSession).not.toBeNull();
  });

  it('should reject invalid passwords', async () => {
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'login@example.com', password: 'password123' });

    const res = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should allow access to protected route with valid JWT', async () => {
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'me@example.com', password: 'password123' });

    const loginRes = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: 'me@example.com', password: 'password123' });

    const accessToken = loginRes.body.data.tokens.accessToken;

    const meRes = await request(testApp)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.data.email).toBe('me@example.com');
  });

  it('should reject access without JWT', async () => {
    await request(testApp)
      .get('/api/v1/auth/me')
      .expect(401);
  });

  it('should refresh tokens successfully and revoke old session', async () => {
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'refresh@example.com', password: 'password123' });

    const loginRes = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: 'refresh@example.com', password: 'password123' });

    const oldRefreshToken = loginRes.body.data.tokens.refreshToken;

    const refreshRes = await request(testApp)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);

    const newTokens = refreshRes.body.data;
    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();
    expect(newTokens.refreshToken).not.toBe(oldRefreshToken);

    // Old token should be deleted from DB
    const oldSession = await prisma.authSession.findFirst({
      where: { refreshTokenHash: hashToken(oldRefreshToken) }
    });
    expect(oldSession).toBeNull();
    
    // New token should exist
    const newSession = await prisma.authSession.findFirst({
      where: { refreshTokenHash: hashToken(newTokens.refreshToken) }
    });
    expect(newSession).not.toBeNull();
  });

  it('should completely delete session on logout', async () => {
    await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: 'logout@example.com', password: 'password123' });

    const loginRes = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: 'logout@example.com', password: 'password123' });

    const refreshToken = loginRes.body.data.tokens.refreshToken;

    await request(testApp)
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200);

    const session = await prisma.authSession.findFirst({
      where: { refreshTokenHash: hashToken(refreshToken) }
    });
    expect(session).toBeNull();
  });
});
