import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

describe('Analytics Integration', () => {
  it('should insert a click event and increment clickCount transactionally', async () => {
    // 1. Create URL
    const createRes = await request(testApp)
      .post('/api/v1/urls')
      .send({ originalUrl: 'https://example.com' })
      .expect(201);
      
    const shortCode = createRes.body.data.shortCode;

    // 2. Perform Redirect
    await request(testApp)
      .get(`/${shortCode}`)
      .set('User-Agent', 'TestBrowser/1.0')
      .set('Referer', 'https://referring-site.com')
      .expect(302);

    // 3. Verify DB State
    const dbUrl = await prisma.url.findUnique({
      where: { shortCode },
      include: { clicks: true }
    });

    expect(dbUrl).not.toBeNull();
    // Denormalized count should be exactly 1
    expect(dbUrl?.clickCount).toBe(1);
    
    // Immutable event table should have exactly 1 record
    expect(dbUrl?.clicks.length).toBe(1);
    
    const click = dbUrl!.clicks[0];
    expect(click.browser).toBe('TestBrowser/1.0');
    expect(click.referrer).toBe('https://referring-site.com');
  });
});
