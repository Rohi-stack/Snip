import { prisma } from '../../src/prisma/client.js';

export async function resetDb() {
  const tableNames = [
    'users',
    'urls',
    'aliases',
    'clicks',
    'subscriptions',
    'auth_sessions',
    'daily_url_usage'
  ];

  try {
    for (const tableName of tableNames) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    }
  } catch (error) {
    console.error('Failed to reset DB:', error);
  }
}
