import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';
import { UrlStatus } from '@prisma/client';

describe('Redirect Integration', () => {
  it('should redirect to the original URL for a valid short code', async () => {
    const createRes = await request(testApp)
      .post('/api/v1/urls')
      .send({ originalUrl: 'https://example.com' })
      .expect(201);
      
    const shortCode = createRes.body.data.shortCode;

    await request(testApp)
      .get(`/${shortCode}`)
      .expect(302)
      .expect('Location', 'https://example.com');
  });

  it('should reject non-existent short codes with 404', async () => {
    await request(testApp)
      .get('/doesnotexist123')
      .expect(404);
  });

  it('should reject expired URLs with 410 Gone', async () => {
    const createRes = await request(testApp)
      .post('/api/v1/urls')
      .send({ originalUrl: 'https://example.com' })
      .expect(201);
      
    const shortCode = createRes.body.data.shortCode;
    const dbUrl = await prisma.url.findUnique({ where: { shortCode } });
    
    // Manually expire the URL in the DB
    await prisma.url.update({
      where: { id: dbUrl!.id },
      data: { expiresAt: new Date(Date.now() - 100000) }
    });

    await request(testApp)
      .get(`/${shortCode}`)
      .expect(410);
  });

  it('should reject disabled URLs with 410 Gone', async () => {
    const createRes = await request(testApp)
      .post('/api/v1/urls')
      .send({ originalUrl: 'https://example.com' })
      .expect(201);
      
    const shortCode = createRes.body.data.shortCode;
    const dbUrl = await prisma.url.findUnique({ where: { shortCode } });
    
    // Manually disable the URL in the DB
    await prisma.url.update({
      where: { id: dbUrl!.id },
      data: { status: UrlStatus.DISABLED }
    });

    await request(testApp)
      .get(`/${shortCode}`)
      .expect(410);
  });
});
