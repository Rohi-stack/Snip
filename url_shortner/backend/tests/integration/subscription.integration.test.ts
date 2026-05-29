import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

// Mock stripe
vi.mock('../../src/utils/stripe.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/stripe.js')>();
  return {
    ...actual,
    stripe: {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/cs_test_123',
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn().mockImplementation((rawBody, signature, secret) => {
          if (signature === 'invalid_signature') {
            throw new Error('Invalid signature');
          }
          if (Buffer.isBuffer(rawBody)) {
            return JSON.parse(rawBody.toString());
          }
          if (typeof rawBody === 'string') {
            return JSON.parse(rawBody);
          }
          return rawBody;
        }),
      },
    },
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  };
});

describe.sequential('Subscription Integration', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const email = `subuser-${Date.now()}@example.com`;
    await request(testApp).post('/api/v1/auth/register').send({ email, password: 'password123', name: 'Sub User' });
    const login = await request(testApp).post('/api/v1/auth/login').send({ email, password: 'password123' });
    userToken = login.body.data.tokens.accessToken;
    userId = login.body.data.user.id;
  });

  it('should create a Stripe checkout session', async () => {
    const res = await request(testApp)
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ tier: 'premium' })
      .expect(200);

    expect(res.body.data.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
  });

  it('should verify webhook signature and activate subscription', async () => {
    const payload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: {
            userId,
            tier: 'premium',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);

    await request(testApp)
      .post('/api/v1/subscriptions/webhook')
      .set('stripe-signature', 'valid_signature')
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(200);

    const dbSub = await prisma.subscription.findUnique({
      where: { stripeSessionId: 'cs_test_123' },
    });
    expect(dbSub).not.toBeNull();
    expect(dbSub?.status).toBe('ACTIVE');
    expect(dbSub?.expiresAt).toBeDefined();

    // Entitlement should now be active
    const meRes = await request(testApp)
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(meRes.body.data.isPremium).toBe(true);
    expect(meRes.body.data.tier).toBe('Premium');
  });

  it('should reject invalid webhook signatures', async () => {
    const payload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_invalid',
        },
      },
    };

    const rawBody = JSON.stringify(payload);

    await request(testApp)
      .post('/api/v1/subscriptions/webhook')
      .set('stripe-signature', 'invalid_signature')
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(401);
  });
});
