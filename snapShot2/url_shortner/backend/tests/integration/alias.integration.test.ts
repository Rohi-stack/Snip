import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { testApp } from '../helpers/test-app.js';
import { prisma } from '../../src/prisma/client.js';

describe.sequential('Alias Integration', () => {
  let premiumToken: string;
  let freeToken: string;
  let premiumUrlId: string;
  let freeUrlId: string;

  beforeEach(async () => {
    const premEmail = `premium-${Date.now()}-${Math.random()}@example.com`;
    const freeEmail = `free-${Date.now()}-${Math.random()}@example.com`;

    // Register premium user
    const premRegRes = await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: premEmail, password: 'password123', name: 'Premium' });
    
    if (premRegRes.status !== 201) throw new Error('Prem Register failed: ' + JSON.stringify(premRegRes.body));
    
    const premiumLogin = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: premEmail, password: 'password123' });
      
    if (premiumLogin.status !== 200) throw new Error('Prem Login failed: ' + JSON.stringify(premiumLogin.body));
    premiumToken = premiumLogin.body.data.tokens.accessToken;
    const premiumUserId = premiumLogin.body.data.user.id;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.subscription.create({
      data: {
        userId: premiumUserId,
        razorpayPaymentId: `mock_pay_${Date.now()}`,
        amount: 50000,
        currency: 'INR',
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt,
      }
    });

    // Register free user
    const freeRegRes = await request(testApp)
      .post('/api/v1/auth/register')
      .send({ email: freeEmail, password: 'password123', name: 'Free' });

    if (freeRegRes.status !== 201) throw new Error('Free Register failed: ' + JSON.stringify(freeRegRes.body));

    const freeLogin = await request(testApp)
      .post('/api/v1/auth/login')
      .send({ email: freeEmail, password: 'password123' });
      
    if (freeLogin.status !== 200) throw new Error('Free Login failed: ' + JSON.stringify(freeLogin.body));
    freeToken = freeLogin.body.data.tokens.accessToken;

    // Create a URL for Premium user
    const pUrlRes = await request(testApp)
      .post('/api/v1/urls')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ originalUrl: 'https://premium.com' });
    premiumUrlId = pUrlRes.body.data.id;

    // Create a URL for Free user
    const fUrlRes = await request(testApp)
      .post('/api/v1/urls')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({ originalUrl: 'https://free.com' });
    freeUrlId = fUrlRes.body.data.id;
  });

  it('should reject alias creation for free users', async () => {
    const res = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${freeToken}`)
      .send({ alias: 'my-free-alias', urlId: freeUrlId })
      .expect(403);
    
    expect(res.body.error.code).toBe('PREMIUM_REQUIRED');
  });

  it('should allow alias creation for premium users', async () => {
    const res = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'my-premium-alias', urlId: premiumUrlId })
      .expect(201);
    
    expect(res.body.data.alias).toBe('my-premium-alias');
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should reject reserved aliases', async () => {
    const res = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'admin', urlId: premiumUrlId })
      .expect(403);
    
    expect(res.body.error.code).toBe('RESERVED_ALIAS');
  });

  it('should reject duplicate aliases', async () => {
    await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'duplicate-alias', urlId: premiumUrlId })
      .expect(201);

    const res = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'duplicate-alias', urlId: premiumUrlId })
      .expect(409);
    
    expect(res.body.error.code).toBe('ALIAS_TAKEN');
  });

  it('should reject invalid alias formats', async () => {
    const res1 = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'a', urlId: premiumUrlId })
      .expect(400); // Too short
    expect(res1.body.error.code).toBe('INVALID_ALIAS_LENGTH');

    const res2 = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'invalid_alias!', urlId: premiumUrlId })
      .expect(400); // Invalid characters
    expect(res2.body.error.code).toBe('INVALID_ALIAS_FORMAT');
  });

  it('should safely prevent concurrent reservation races', async () => {
    // Simulate 10 simultaneous requests
    const requests = Array(10).fill(0).map(() => 
      request(testApp)
        .post('/api/v1/aliases')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({ alias: 'race-condition-alias', urlId: premiumUrlId })
    );

    const responses = await Promise.all(requests);
    
    const successes = responses.filter(r => r.status === 201);
    const conflicts = responses.filter(r => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(9);

    const count = await prisma.alias.count({ where: { alias: 'race-condition-alias' } });
    expect(count).toBe(1);
  });

  it('should transition alias to RELEASED and enforce cooldown upon deletion', async () => {
    await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'release-me', urlId: premiumUrlId })
      .expect(201);

    const delRes = await request(testApp)
      .delete('/api/v1/aliases/release-me')
      .set('Authorization', `Bearer ${premiumToken}`)
      .expect(200);

    expect(delRes.body.data.status).toBe('RELEASED');
    expect(delRes.body.data.reuseAllowed).toBe(true);
    expect(delRes.body.data.reuseAfter).toBeDefined();
    expect(delRes.body.data.currentUrlId).toBeNull();

    // Verify it cannot be reused yet by another premium user
    const reuseRes = await request(testApp)
      .post('/api/v1/aliases')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ alias: 'release-me', urlId: premiumUrlId })
      .expect(409);
    
    expect(reuseRes.body.error.code).toBe('ALIAS_TAKEN');
  });
});
