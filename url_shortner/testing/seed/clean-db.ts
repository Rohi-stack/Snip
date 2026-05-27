/**
 * Database Clean-up Script
 * Run from the `backend/` directory: npm run db:seed
 * 
 * Safely deletes all rows from the database.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🧹 Safely cleaning all database rows...\n');
  
  try {
    await prisma.subscription.deleteMany({});
    console.log('  ✓ Subscriptions deleted');
    
    await prisma.alias.deleteMany({});
    console.log('  ✓ Aliases deleted');
    
    await prisma.click.deleteMany({});
    console.log('  ✓ Clicks deleted');
    
    await prisma.url.deleteMany({});
    console.log('  ✓ URLs deleted');
    
    await prisma.authSession.deleteMany({});
    console.log('  ✓ Auth sessions deleted');
    
    await prisma.dailyUrlUsage.deleteMany({});
    console.log('  ✓ Daily URL usage deleted');
    
    await prisma.user.deleteMany({});
    console.log('  ✓ Users deleted');
    
    console.log('\n✅ Database reset successfully to a clean slate!\n');
  } catch (error) {
    console.error('❌ Failed to clean database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
