import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

describe('Quota Integration', () => {
  it('should enforce anonymous quota of 5 URLs per day', async () => {
    const ip = '192.168.1.100';
    
    // Create 5 URLs successfully
    for (let i = 0; i < 5; i++) {
      await request(testApp)
        .post('/api/v1/urls')
        .set('x-forwarded-for', ip)
        .send({ originalUrl: `https://example.com/${i}` })
        .expect(201);
    }

    // 6th URL should fail
    const failRes = await request(testApp)
      .post('/api/v1/urls')
      .set('x-forwarded-for', ip)
      .send({ originalUrl: 'https://example.com/6' })
      .expect(429);

    expect(failRes.body.success).toBe(false);
    expect(failRes.body.error.code).toBe('QUOTA_EXCEEDED');

    // Verify DB usage bucket is exactly 5
    const now = new Date();
    const usageDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const bucket = await prisma.dailyUrlUsage.findUnique({
      where: { creatorIp_usageDate: { creatorIp: ip, usageDate } }
    });
    
    expect(bucket?.count).toBe(5);
  });
});
