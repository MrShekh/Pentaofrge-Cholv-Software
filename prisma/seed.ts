import { PrismaClient, TransactionType, TransactionStatus, SettlementAction, ChargeBasis, PaymentStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records for clean idempotent runs
  await prisma.payment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.customerKaratAccount.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.karat.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  await prisma.appSetting.deleteMany();

  // 2. Business profile
  const business = await prisma.business.create({
    data: {
      name: 'Penta Chool Works',
      ownerName: 'Kishorebhai Soni',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      email: 'info@pentachool.com',
      address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot - 360001, Gujarat',
      gstNumber: '24AAAAA0000A1Z5',
      defaultCurrency: '₹',
      defaultWeightUnit: 'g',
      decimalPrecision: 3,
    },
  });

  // 3. Users (Admin and Staff)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@pentachool.com',
      name: 'Kishorebhai (Admin)',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      username: 'staff',
      email: 'staff@pentachool.com',
      name: 'Mahesh (Staff Operator)',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
    },
  });

  // 4. Karats
  const karat92 = await prisma.karat.create({
    data: {
      name: '92K',
      value: new Decimal(92.00),
      purityDescription: '92% Gold (Chool / Cutting grade)',
      defaultMakingRate: new Decimal(25.00),
      isPredefined: true,
      displayOrder: 1,
    },
  });

  const karat75 = await prisma.karat.create({
    data: {
      name: '75K',
      value: new Decimal(75.00),
      purityDescription: '75% Gold (18 Karat)',
      defaultMakingRate: new Decimal(30.00),
      isPredefined: true,
      displayOrder: 2,
    },
  });

  const karat24 = await prisma.karat.create({
    data: {
      name: '24K',
      value: new Decimal(99.90),
      purityDescription: '99.9% Pure Gold',
      defaultMakingRate: new Decimal(20.00),
      isPredefined: true,
      displayOrder: 3,
    },
  });

  const karat22 = await prisma.karat.create({
    data: {
      name: '22K',
      value: new Decimal(91.60),
      purityDescription: '91.6% BIS Hallmark Gold',
      defaultMakingRate: new Decimal(25.00),
      isPredefined: true,
      displayOrder: 4,
    },
  });

  const karat58 = await prisma.karat.create({
    data: {
      name: '58.5K',
      value: new Decimal(58.50),
      purityDescription: '14 Karat Gold',
      defaultMakingRate: new Decimal(35.00),
      isPredefined: true,
      displayOrder: 5,
    },
  });

  // 5. Customer 1: Rahul Jewellers
  const rahul = await prisma.customer.create({
    data: {
      name: 'Rahul Jewellers',
      shopName: 'Rahul Jewellers Pvt Ltd',
      phone: '+91 98250 11223',
      whatsapp: '+91 98250 11223',
      address: 'Main Bazaar, Palace Road, Rajkot',
      gstNumber: '24AABCR1234F1Z8',
      notes: 'Premium regular client for bangle and ring chool cutting',
    },
  });

  // Karat accounts for Rahul Jewellers
  const rahulAccount92 = await prisma.customerKaratAccount.create({
    data: {
      customerId: rahul.id,
      karatId: karat92.id,
      openingBalance: new Decimal(0),
      cachedBalance: new Decimal(100.000), // After settlement (0g) + new IN (100g) = 100g
    },
  });

  const rahulAccount75 = await prisma.customerKaratAccount.create({
    data: {
      customerId: rahul.id,
      karatId: karat75.id,
      openingBalance: new Decimal(0),
      cachedBalance: new Decimal(120.000), // 200 IN - 80 OUT = 120g
    },
  });

  // Rahul 92K historical transactions (Pre-settlement period)
  // Date sequence matching prompt:
  // 05 Oct 09:30 IN 300g
  // 05 Oct 14:20 IN 100g
  // 05 Oct 17:40 OUT 50g
  // 06 Oct 11:00 OUT 120g
  // 06 Oct 16:00 IN 70g
  // 07 Oct 12:30 OUT 200g
  // 08 Oct 14:00 OUT 94g
  // Settlement 6g returned -> 0g balance!
  const rahulTxns = [
    {
      num: 'TXN-10001',
      type: TransactionType.IN,
      weight: new Decimal(300.000),
      date: new Date('2026-10-05T09:30:00Z'),
      notes: 'Received plain bangles for star chool cut',
    },
    {
      num: 'TXN-10002',
      type: TransactionType.IN,
      weight: new Decimal(100.000),
      date: new Date('2026-10-05T14:20:00Z'),
      notes: 'Received additional casting rings for facet cutting',
    },
    {
      num: 'TXN-10003',
      type: TransactionType.OUT,
      weight: new Decimal(50.000),
      date: new Date('2026-10-05T17:40:00Z'),
      notes: 'Returned 5 finished bangle pieces',
    },
    {
      num: 'TXN-10004',
      type: TransactionType.OUT,
      weight: new Decimal(120.000),
      date: new Date('2026-10-06T11:00:00Z'),
      notes: 'Returned 12 finished rings',
    },
    {
      num: 'TXN-10005',
      type: TransactionType.IN,
      weight: new Decimal(70.000),
      date: new Date('2026-10-06T16:00:00Z'),
      notes: 'Received additional kadas for rope engraving',
    },
    {
      num: 'TXN-10006',
      type: TransactionType.OUT,
      weight: new Decimal(200.000),
      date: new Date('2026-10-07T12:30:00Z'),
      notes: 'Returned finished heavy kadas batch 1',
    },
    {
      num: 'TXN-10007',
      type: TransactionType.OUT,
      weight: new Decimal(94.000),
      date: new Date('2026-10-08T14:00:00Z'),
      notes: 'Returned finished bangles batch 2',
    },
  ];

  for (const t of rahulTxns) {
    await prisma.transaction.create({
      data: {
        transactionNumber: t.num,
        customerId: rahul.id,
        karatId: karat92.id,
        accountId: rahulAccount92.id,
        type: t.type,
        weight: t.weight,
        transactionDate: t.date,
        notes: t.notes,
        status: TransactionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    });
  }

  // Settlement for Rahul 92K
  // Total IN: 470g, Total OUT: 464g, Remaining: 6g. Return to customer: 6g.
  // Making Rate: ₹25/g on Total Received (470g * 25 = ₹11,750), Paid: ₹11,750
  const settlement1 = await prisma.settlement.create({
    data: {
      settlementNumber: 'SET-2026-0001',
      customerId: rahul.id,
      karatId: karat92.id,
      fromDate: new Date('2026-10-01T00:00:00Z'),
      toDate: new Date('2026-10-08T18:00:00Z'),
      settlementDate: new Date('2026-10-08T17:00:00Z'),
      totalInWeight: new Decimal(470.000),
      totalOutWeight: new Decimal(464.000),
      remainingBefore: new Decimal(6.000),
      settlementAction: SettlementAction.RETURN_TO_CUSTOMER,
      settledWeight: new Decimal(6.000),
      carryForwardWeight: new Decimal(0.000),
      finalRemainingBalance: new Decimal(0.000),
      makingRate: new Decimal(25.00),
      chargeBasis: ChargeBasis.TOTAL_RECEIVED,
      chargeableWeight: new Decimal(470.000),
      calculatedMakingAmount: new Decimal(11750.00),
      discount: new Decimal(0.00),
      extraCharge: new Decimal(0.00),
      finalMakingAmount: new Decimal(11750.00),
      paymentStatus: PaymentStatus.PAID,
      paidAmount: new Decimal(11750.00),
      pendingAmount: new Decimal(0.00),
      notes: 'Full settlement of Batch 1. Remaining 6.000g gold dust/balance returned to Rahul Jewellers.',
      createdById: adminUser.id,
    },
  });

  // Settlement return transaction
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-10008',
      customerId: rahul.id,
      karatId: karat92.id,
      accountId: rahulAccount92.id,
      type: TransactionType.SETTLEMENT_RETURN,
      weight: new Decimal(6.000),
      transactionDate: new Date('2026-10-08T17:00:00Z'),
      notes: 'Settlement Return - 6.000g settled back to customer (SET-2026-0001)',
      settlementId: settlement1.id,
      status: TransactionStatus.ACTIVE,
      createdById: adminUser.id,
    },
  });

  // Payment record for settlement
  await prisma.payment.create({
    data: {
      settlementId: settlement1.id,
      amount: new Decimal(11750.00),
      paymentDate: new Date('2026-10-08T17:15:00Z'),
      paymentMode: 'UPI',
      referenceNo: 'UPI/20261008/998124',
      notes: 'Received full making charges payment via Google Pay',
      createdById: adminUser.id,
    },
  });

  // Scenario 11: New IN after settlement
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-10009',
      customerId: rahul.id,
      karatId: karat92.id,
      accountId: rahulAccount92.id,
      type: TransactionType.IN,
      weight: new Decimal(100.000),
      transactionDate: new Date('2026-10-09T10:00:00Z'),
      notes: 'New batch received: 100g 92K fresh bangle lot after settlement',
      status: TransactionStatus.ACTIVE,
      createdById: staffUser.id,
    },
  });

  // Scenario 12: Rahul 75K separate ledger
  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-10010',
      customerId: rahul.id,
      karatId: karat75.id,
      accountId: rahulAccount75.id,
      type: TransactionType.IN,
      weight: new Decimal(200.000),
      transactionDate: new Date('2026-10-06T10:00:00Z'),
      notes: '75K bracelets received for diamond-cut engraving',
      status: TransactionStatus.ACTIVE,
      createdById: staffUser.id,
    },
  });

  await prisma.transaction.create({
    data: {
      transactionNumber: 'TXN-10011',
      customerId: rahul.id,
      karatId: karat75.id,
      accountId: rahulAccount75.id,
      type: TransactionType.OUT,
      weight: new Decimal(80.000),
      transactionDate: new Date('2026-10-07T16:00:00Z'),
      notes: '75K finished bracelets returned',
      status: TransactionStatus.ACTIVE,
      createdById: staffUser.id,
    },
  });

  // 6. Customer 2: Shree Gold (Section 36)
  // Customer: Shree Gold
  // 75K:
  // Opening Balance: 50g
  // IN: 150g
  // OUT: 60g
  // IN: 40g
  // OUT: 50g
  // Current Balance: 130g
  const shree = await prisma.customer.create({
    data: {
      name: 'Shree Gold',
      shopName: 'Shree Gold Art',
      phone: '+91 94280 44556',
      whatsapp: '+91 94280 44556',
      address: 'Manek Chowk, Ahmedabad',
      gstNumber: '24AAECS9876C1Z3',
      notes: 'Specializes in antique and modern chool work',
    },
  });

  const shreeAccount75 = await prisma.customerKaratAccount.create({
    data: {
      customerId: shree.id,
      karatId: karat75.id,
      openingBalance: new Decimal(50.000),
      cachedBalance: new Decimal(130.000),
    },
  });

  const shreeTxns = [
    {
      num: 'TXN-20001',
      type: TransactionType.OPENING_BALANCE,
      weight: new Decimal(50.000),
      date: new Date('2026-10-01T10:00:00Z'),
      notes: 'Opening Balance brought forward from manual register',
    },
    {
      num: 'TXN-20002',
      type: TransactionType.IN,
      weight: new Decimal(150.000),
      date: new Date('2026-10-02T11:30:00Z'),
      notes: 'Received gold chains for machine chool work',
    },
    {
      num: 'TXN-20003',
      type: TransactionType.OUT,
      weight: new Decimal(60.000),
      date: new Date('2026-10-03T15:00:00Z'),
      notes: 'Finished 60g chains delivered',
    },
    {
      num: 'TXN-20004',
      type: TransactionType.IN,
      weight: new Decimal(40.000),
      date: new Date('2026-10-04T12:00:00Z'),
      notes: 'Received pendants for mirror cut',
    },
    {
      num: 'TXN-20005',
      type: TransactionType.OUT,
      weight: new Decimal(50.000),
      date: new Date('2026-10-05T14:30:00Z'),
      notes: 'Finished 50g delivered to representative',
    },
  ];

  for (const t of shreeTxns) {
    await prisma.transaction.create({
      data: {
        transactionNumber: t.num,
        customerId: shree.id,
        karatId: karat75.id,
        accountId: shreeAccount75.id,
        type: t.type,
        weight: t.weight,
        transactionDate: t.date,
        notes: t.notes,
        status: TransactionStatus.ACTIVE,
        createdById: adminUser.id,
      },
    });
  }

  // 7. Audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        username: adminUser.username,
        action: 'CREATE',
        entity: 'BUSINESS',
        entityId: business.id,
        newValue: JSON.stringify({ name: business.name }),
        reason: 'Initial system deployment',
      },
      {
        userId: adminUser.id,
        username: adminUser.username,
        action: 'CREATE',
        entity: 'CUSTOMER',
        entityId: rahul.id,
        newValue: JSON.stringify({ name: rahul.name, phone: rahul.phone }),
        reason: 'Customer onboarded',
      },
      {
        userId: adminUser.id,
        username: adminUser.username,
        action: 'SETTLE',
        entity: 'SETTLEMENT',
        entityId: settlement1.id,
        newValue: JSON.stringify({
          settlementNumber: settlement1.settlementNumber,
          settledWeight: '6.000',
          finalMakingAmount: '11750.00',
        }),
        reason: 'Completed Batch 1 settlement',
      },
    ],
  });

  console.log('Seeding completed successfully!');
  console.log('Admin login: admin / admin123 (or admin@pentachool.com)');
  console.log('Staff login: staff / staff123 (or staff@pentachool.com)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
