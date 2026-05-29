import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧹 Safely cleaning all database rows...');

  // 1. Strict Production Safety Guard
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Refusing to clean database in production environment!');
    throw new Error('Refusing to clean production database');
  }

  try {
    // 2. High-speed TRUNCATE with RESTART IDENTITY CASCADE
    // This resets auto-incrementing clicks count to 1 and completely empties all tables transactionally.
    console.log('  -> Attempting transaction-based table truncation and sequence reset...');
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "clicks", 
        "aliases", 
        "subscriptions", 
        "auth_sessions", 
        "password_reset_tokens", 
        "daily_url_usage", 
        "urls", 
        "users" 
      RESTART IDENTITY CASCADE;
    `);
    console.log('  ✓ Success: All tables truncated, and auto-increment identity counters reset successfully!');
  } catch (error) {
    console.warn('  ⚠️  Warning: Direct raw TRUNCATE failed. Falling back to sequential model deletions...');
    
    // 3. Fallback sequential transaction to safely delete all model rows matching foreign keys
    await prisma.$transaction(async (tx) => {
      const clickCount = await tx.click.deleteMany({});
      console.log(`  ✓ clicks deleted: ${clickCount.count}`);
      
      const aliasCount = await tx.alias.deleteMany({});
      console.log(`  ✓ aliases deleted: ${aliasCount.count}`);
      
      const subCount = await tx.subscription.deleteMany({});
      console.log(`  ✓ subscriptions deleted: ${subCount.count}`);
      
      const sessionCount = await tx.authSession.deleteMany({});
      console.log(`  ✓ auth_sessions deleted: ${sessionCount.count}`);
      
      const tokenCount = await tx.passwordResetToken.deleteMany({});
      console.log(`  ✓ password_reset_tokens deleted: ${tokenCount.count}`);
      
      const usageCount = await tx.dailyUrlUsage.deleteMany({});
      console.log(`  ✓ daily_url_usage deleted: ${usageCount.count}`);
      
      const urlCount = await tx.url.deleteMany({});
      console.log(`  ✓ urls deleted: ${urlCount.count}`);
      
      const userCount = await tx.user.deleteMany({});
      console.log(`  ✓ users deleted: ${userCount.count}`);
    });
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database reset completed! Ready for fresh registrations and production-like testing.\n');
  }
}

main().catch((err) => {
  console.error('❌ Failed to reset database:', err);
  process.exit(1);
});
