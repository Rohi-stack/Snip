/**
 * Test Data Seeder
 * Run from the `backend/` directory: npm run db:seed
 *
 * This file is intentionally kept self-contained; it creates its own
 * PrismaClient so it can resolve @prisma/client from backend/node_modules.
 *
 * Test accounts created:
 *   free@snip.test      – Free tier, 1 link, 15 clicks
 *   starter@snip.test   – ₹2 tier (ACTIVE sub), 1 link
 *   premium@snip.test   – ₹5 tier (ACTIVE sub), 3 links, 1 alias, 120 clicks
 *
 * All passwords: Password123!
 */

// ─── imports resolved relative to backend/node_modules ───────────────────────
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck  (standalone script — no strict tsconfig required)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();
const PASSWORD = 'Password123!';

const AuthProvider = { LOCAL: 'LOCAL' };
const SubscriptionStatus = { ACTIVE: 'ACTIVE' };
const UrlStatus = { ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED' };

async function clearTestUsers() {
  await prisma.user.deleteMany({
    where: { email: { in: ['free@snip.test', 'starter@snip.test', 'premium@snip.test'] } }
  });
  console.log('  ✓ Cleared existing test users');
}

async function main() {
  console.log('\n🌱 Seeding test database...\n');
  await clearTestUsers();

  const hash = await bcrypt.hash(PASSWORD, 10);

  // 1. FREE USER ────────────────────────────────────────────────────────────
  const freeUser = await prisma.user.create({
    data: { email: 'free@snip.test', name: 'Free Tester', authProvider: 'LOCAL', passwordHash: hash },
  });

  const freeUrl = await prisma.url.create({
    data: {
      userId: freeUser.id,
      originalUrl: 'https://producthunt.com/posts/snip-saas-url-shortener',
      shortCode: 'free001',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      creatorIp: '127.0.0.1',
      clickCount: 15,
    },
  });

  await prisma.click.createMany({
    data: Array.from({ length: 15 }, (_, i) => ({
      urlId: freeUrl.id,
      ipAddress: '203.0.113.1',
      country: 'IN',
      city: 'Mumbai',
      deviceType: i % 3 === 0 ? 'mobile' : 'desktop',
      browser: ['chrome', 'safari', 'firefox'][i % 3],
      referrer: i % 2 === 0 ? 'https://google.com' : null,
      clickedAt: new Date(Date.now() - i * 3_600_000),
    })),
  });
  console.log('  ✓ free@snip.test');

  // 2. STARTER USER ─────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'starter@snip.test',
      name: 'Starter Tester',
      authProvider: 'LOCAL',
      passwordHash: hash,
      subscriptions: {
        create: {
          stripeSessionId: `cs_test_${crypto.randomBytes(8).toString('hex')}`,
          amount: 200,
          currency: 'INR',
          status: 'ACTIVE',
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      urls: {
        create: {
          originalUrl: 'https://github.com/Rohi-stack',
          shortCode: 'qr-demo',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          creatorIp: '127.0.0.1',
          clickCount: 42,
        },
      },
    },
  });
  console.log('  ✓ starter@snip.test');

  // 3. PREMIUM USER ─────────────────────────────────────────────────────────
  const premiumUser = await prisma.user.create({
    data: {
      email: 'premium@snip.test',
      name: 'Premium Tester',
      authProvider: 'LOCAL',
      passwordHash: hash,
      subscriptions: {
        create: {
          stripeSessionId: `cs_test_${crypto.randomBytes(8).toString('hex')}`,
          amount: 500,
          currency: 'INR',
          status: 'ACTIVE',
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const premUrls = await Promise.all([
    prisma.url.create({
      data: {
        userId: premiumUser.id,
        originalUrl: 'https://medium.com/engineering/scaling-microservices',
        shortCode: 'prem001',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        creatorIp: '127.0.0.1',
        clickCount: 320,
      },
    }),
    prisma.url.create({
      data: {
        userId: premiumUser.id,
        originalUrl: 'https://vercel.com/blog/behind-the-scenes',
        shortCode: 'prem002',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        creatorIp: '127.0.0.1',
        clickCount: 185,
      },
    }),
    prisma.url.create({
      data: {
        userId: premiumUser.id,
        originalUrl: 'https://docs.snip.ly/api',
        shortCode: 'prem003',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'EXPIRED',
        creatorIp: '127.0.0.1',
        clickCount: 76,
      },
    }),
  ]);

  await prisma.alias.create({
    data: {
      alias: 'engineering-blog',
      currentUrlId: premUrls[0].id,
      createdByUserId: premiumUser.id,
      firstUsedAt: new Date(),
      lastUsedAt: new Date(),
    },
  });

  const referrers = ['https://google.com', 'https://twitter.com', 'https://linkedin.com', null];
  const countries = ['IN', 'US', 'GB', 'DE', 'AU'];
  const cities = ['Mumbai', 'New York', 'London', 'Berlin', 'Sydney'];
  const devices = ['mobile', 'desktop', 'tablet'];
  const browsers = ['chrome', 'safari', 'firefox', 'edge'];

  await prisma.click.createMany({
    data: Array.from({ length: 120 }, (_, i) => ({
      urlId: premUrls[i % 3].id,
      ipAddress: `10.0.${Math.floor(i / 256)}.${i % 256}`,
      country: countries[i % countries.length],
      city: cities[i % cities.length],
      deviceType: devices[i % devices.length],
      browser: browsers[i % browsers.length],
      referrer: referrers[i % referrers.length],
      clickedAt: new Date(Date.now() - i * 6_000_000),
    })),
  });
  console.log('  ✓ premium@snip.test');

  console.log(`
✅ Seeding complete!
   Password for all accounts: ${PASSWORD}
`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
