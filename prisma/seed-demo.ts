import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up Fresh Demo Database...');

  // 1. Clean any existing records
  await prisma.karigarCash.deleteMany().catch(() => {});
  await prisma.karigarSettlement.deleteMany().catch(() => {});
  await prisma.karigar.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.transaction.deleteMany().catch(() => {});
  await prisma.settlement.deleteMany().catch(() => {});
  await prisma.customerKaratAccount.deleteMany().catch(() => {});
  await prisma.customer.deleteMany().catch(() => {});
  await prisma.karat.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.passwordResetToken.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.business.deleteMany().catch(() => {});
  await prisma.appSetting.deleteMany().catch(() => {});

  // 2. Create Business Settings
  const business = await prisma.business.create({
    data: {
      name: 'Penta Jewellery Works (Demo)',
      ownerName: 'Demo Admin',
      phone: '+91 98765 00000',
      whatsapp: '+91 98765 00000',
      email: 'demo@pentachool.com',
      address: 'Gold Market, Soni Bazaar, Rajkot, Gujarat',
      defaultCurrency: '₹',
      defaultWeightUnit: 'g',
      decimalPrecision: 3,
    },
  });
  console.log(`✓ Business created: ${business.name}`);

  // 3. Create Demo Users
  const demoPasswordHash = await bcrypt.hash('demo123', 10);

  const demoUser = await prisma.user.create({
    data: {
      username: 'demo',
      email: 'demo@pentachool.com',
      name: 'Demo Admin',
      passwordHash: demoPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Demo user created: email: ${demoUser.email} / pass: demo123`);

  // 4. Create Standard Karat Grades
  const karats = [
    { name: '22K (916 Hallmarked)', value: 91.60, purityDescription: 'Standard 916 jewellery gold' },
    { name: '18K (750)', value: 75.00, purityDescription: '18 Karat casted jewellery' },
    { name: '24K Fine Gold', value: 99.90, purityDescription: 'Pure bullion/bar' },
  ];

  for (const k of karats) {
    await prisma.karat.create({ data: k });
  }
  console.log('✓ Standard Karats created');

  console.log('\n=======================================');
  console.log('🎉 DEMO DATABASE READY!');
  console.log('Login Email:    demo@pentachool.com');
  console.log('Password:       demo123');
  console.log('=======================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding demo db:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
