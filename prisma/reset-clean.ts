import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanData() {
  console.log('Cleaning all dummy customer transactions, settlements, and customers...');

  // Delete all transactional and customer records
  await prisma.payment.deleteMany();
  console.log('✓ Cleared payments');

  await prisma.transaction.deleteMany();
  console.log('✓ Cleared ledger transactions');

  await prisma.settlement.deleteMany();
  console.log('✓ Cleared settlements');

  await prisma.customerKaratAccount.deleteMany();
  console.log('✓ Cleared customer karat accounts');

  await prisma.customer.deleteMany();
  console.log('✓ Cleared customer profiles');

  await prisma.auditLog.deleteMany();
  console.log('✓ Cleared audit logs');

  console.log('\nAll dummy customer data has been cleared!');
  console.log('Your users, login credentials, business settings, and karat grades are preserved.');
  console.log('You can now add your own real customers and record transactions.');
}

cleanData()
  .catch((e) => {
    console.error('Error clearing data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
