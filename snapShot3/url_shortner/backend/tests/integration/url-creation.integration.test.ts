import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

describe('URL Creation Integration', () => {
  it('should successfully create a URL and persist it to the database', async () => {
    const payload = { originalUrl: 'https://github.com' };

    const res = await request(testApp)
      .post('/api/v1/urls')
      .send(payload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.originalUrl).toBe('https://github.com');
    expect(res.body.data.shortCode).toBeDefined();
    
    // Verify DB persistence
    const dbUrl = await prisma.url.findUnique({
      where: { shortCode: res.body.data.shortCode }
    });
    
    expect(dbUrl).not.toBeNull();
    expect(dbUrl?.originalUrl).toBe('https://github.com');
  });

  it('should return 400 for empty URLs', async () => {
    const res = await request(testApp)
      .post('/api/v1/urls')
      .send({ originalUrl: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMPTY_ORIGINAL_URL');
  });
});
