import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

describe('Quota Concurrency Integration', () => {
  it('should perfectly enforce quota under high concurrent load (prevent race conditions)', async () => {
    const ip = '10.0.0.55';
    
    // Fire 10 simultaneous requests
    const promises = Array.from({ length: 10 }).map((_, i) => {
      return request(testApp)
        .post('/api/v1/urls')
        .set('x-forwarded-for', ip)
        .send({ originalUrl: `https://concurrent.com/${i}` });
    });

    const responses = await Promise.all(promises);

    const successCount = responses.filter(r => r.status === 201).length;
    const rateLimitedCount = responses.filter(r => r.status === 429).length;

    // Verify exactly 5 succeeded and 5 were rejected
    expect(successCount).toBe(5);
    expect(rateLimitedCount).toBe(5);

    // Verify DB usage bucket is exactly 5
    const now = new Date();
    const usageDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const bucket = await prisma.dailyUrlUsage.findUnique({
      where: { creatorIp_usageDate: { creatorIp: ip, usageDate } }
    });
    
    expect(bucket?.count).toBe(5);

    // Verify exactly 5 URLs exist for this IP
    const urlCount = await prisma.url.count({
      where: { creatorIp: ip }
    });
    expect(urlCount).toBe(5);
  });
});
