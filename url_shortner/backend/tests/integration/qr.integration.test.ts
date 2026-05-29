import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

describe.sequential('QR Code Integration', () => {
  let premToken: string;
  let freeToken: string;
  let premUrlShortCode: string;
  let freeUrlShortCode: string;

  beforeEach(async () => {
    const premEmail = `qrp-${Date.now()}@example.com`;
    const freeEmail = `qrf-${Date.now()}@example.com`;

    // Setup Premium User
    await request(testApp).post('/api/v1/auth/register').send({ email: premEmail, password: 'password123', name: 'Premium' });
    const premLogin = await request(testApp).post('/api/v1/auth/login').send({ email: premEmail, password: 'password123' });
    premToken = premLogin.body.data.tokens.accessToken;
    const premId = premLogin.body.data.user.id;

    await prisma.subscription.create({
      data: {
        userId: premId,
        stripeSessionId: `mock_session_${Date.now()}`,
        amount: 50000,
        currency: 'INR',
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000000)
      }
    });

    const pUrlRes = await request(testApp)
      .post('/api/v1/urls')
      .set('Authorization', `Bearer ${premToken}`)
      .send({ originalUrl: 'https://premium.com' });
    premUrlShortCode = pUrlRes.body.data.shortCode;

    // Setup Free User
    await request(testApp).post('/api/v1/auth/register').send({ email: freeEmail, password: 'password123', name: 'Free' });
    const freeLogin = await request(testApp).post('/api/v1/auth/login').send({ email: freeEmail, password: 'password123' });
    freeToken = freeLogin.body.data.tokens.accessToken;
    
    const fUrlRes = await request(testApp)
      .post('/api/v1/urls')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({ originalUrl: 'https://free.com' });
    freeUrlShortCode = fUrlRes.body.data.shortCode;
  });

  it('should generate QR code for premium users', async () => {
    const res = await request(testApp)
      .get(`/api/v1/qr/${premUrlShortCode}`)
      .set('Authorization', `Bearer ${premToken}`)
      .expect(200);
      
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body).toBeInstanceOf(Buffer);
  });

  it('should support alternative formats like SVG', async () => {
    const res = await request(testApp)
      .get(`/api/v1/qr/${premUrlShortCode}?format=svg`)
      .set('Authorization', `Bearer ${premToken}`)
      .expect(200);
      
    expect(res.headers['content-type']).toContain('image/svg+xml');
    expect(res.body.toString()).toContain('<svg');
  });

  it('should reject QR generation for free users', async () => {
    const res = await request(testApp)
      .get(`/api/v1/qr/${freeUrlShortCode}`)
      .set('Authorization', `Bearer ${freeToken}`)
      .expect(403);
      
    expect(res.body.error.code).toBe('PREMIUM_REQUIRED');
  });

  it('should reject unsupported formats', async () => {
    await request(testApp)
      .get(`/api/v1/qr/${premUrlShortCode}?format=gif`)
      .set('Authorization', `Bearer ${premToken}`)
      .expect(400);
  });
});
