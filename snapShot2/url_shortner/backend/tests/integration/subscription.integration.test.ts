import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';
import crypto from 'crypto';

vi.mock('razorpay', () => {
  return {
    default: class {
      orders = {
        create: vi.fn().mockResolvedValue({
          id: 'order_mock123',
          amount: 50000,
          currency: 'INR',
          status: 'created',
        })
      };
    }
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

  it('should create a Razorpay order', async () => {
    const res = await request(testApp)
      .post('/api/v1/subscriptions/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);
    
    expect(res.body.data.id).toBe('order_mock123');
    // Subscription is NOT created until webhook fires
  });

  it('should verify webhook signature and activate subscription', async () => {
    await request(testApp)
      .post('/api/v1/subscriptions/create-order')
      .set('Authorization', `Bearer ${userToken}`);
      
    const payload = {
      event: 'order.paid',
      payload: {
        payment: {
          entity: {
            id: 'pay_mock123',
            amount: 50000,
            currency: 'INR'
          }
        },
        order: { 
          entity: { 
            id: 'order_mock123',
            notes: { userId }
          } 
        }
      }
    };
    
    const bodyStr = JSON.stringify(payload);
    const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';
    const signature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    await request(testApp)
      .post('/api/v1/subscriptions/webhook')
      .set('x-razorpay-signature', signature)
      .send(payload)
      .expect(200);
      
    const dbSub = await prisma.subscription.findUnique({ where: { razorpayPaymentId: 'pay_mock123' } });
    expect(dbSub?.status).toBe('ACTIVE');
    expect(dbSub?.expiresAt).toBeDefined();
    
    // Entitlement should now be active
    const meRes = await request(testApp)
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
      
    expect(meRes.body.data.isPremium).toBe(true);
  });

  it('should reject invalid webhook signatures', async () => {
    await request(testApp)
      .post('/api/v1/subscriptions/webhook')
      .set('x-razorpay-signature', 'invalid_signature_hash')
      .send({ event: 'order.paid' })
      .expect(401);
  });
});
