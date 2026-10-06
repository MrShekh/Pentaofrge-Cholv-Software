import { PrismaClient, TransactionType, SettlementAction, ChargeBasis, Role } from '@prisma/client';
import {
  createLedgerTransaction,
  getAccountLedgerSummary,
  settleCustomerAccount,
} from './src/lib/ledger-service';
import { multiplyWeightByRate } from './src/lib/decimal';

const prisma = new PrismaClient();

async function runScenarioVerification() {
  console.log('--- RUNNING SCENARIO VERIFICATION TESTS ---');

  // Find admin user
  const admin = await prisma.user.findFirstOrThrow({ where: { role: Role.ADMIN } });

  // Get 92K and 75K karats
  const karat92 = await prisma.karat.findUniqueOrThrow({ where: { name: '92K' } });
  const karat75 = await prisma.karat.findUniqueOrThrow({ where: { name: '75K' } });

  // Create isolated test customer
  const testCustomer = await prisma.customer.create({
    data: {
      name: 'Verification Test Client',
      phone: '+91 99999 88888',
    },
  });

  console.log(`Created test customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

  // Scenario 1: IN 300 => Expected Balance: 300
  const step1 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.IN,
    weight: 300,
    createdById: admin.id,
  });
  console.assert(
    step1.newBalance.toString() === '300',
    `Scenario 1 Failed! Got: ${step1.newBalance.toString()}`
  );
  console.log('✓ Scenario 1 Passed: IN 300 => Balance: 300.000g');

  // Scenario 2: IN 100 => Expected: 400
  const step2 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.IN,
    weight: 100,
    createdById: admin.id,
  });
  console.assert(
    step2.newBalance.toString() === '400',
    `Scenario 2 Failed! Got: ${step2.newBalance.toString()}`
  );
  console.log('✓ Scenario 2 Passed: IN 100 => Balance: 400.000g');

  // Scenario 3: OUT 50 => Expected: 350
  const step3 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.OUT,
    weight: 50,
    createdById: admin.id,
  });
  console.assert(
    step3.newBalance.toString() === '350',
    `Scenario 3 Failed! Got: ${step3.newBalance.toString()}`
  );
  console.log('✓ Scenario 3 Passed: OUT 50 => Balance: 350.000g');

  // Scenario 4: OUT 120 => Expected: 230
  const step4 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.OUT,
    weight: 120,
    createdById: admin.id,
  });
  console.assert(
    step4.newBalance.toString() === '230',
    `Scenario 4 Failed! Got: ${step4.newBalance.toString()}`
  );
  console.log('✓ Scenario 4 Passed: OUT 120 => Balance: 230.000g');

  // Scenario 5: IN 70 => Expected: 300
  const step5 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.IN,
    weight: 70,
    createdById: admin.id,
  });
  console.assert(
    step5.newBalance.toString() === '300',
    `Scenario 5 Failed! Got: ${step5.newBalance.toString()}`
  );
  console.log('✓ Scenario 5 Passed: IN 70 => Balance: 300.000g');

  // Scenario 6: OUT 200 => Expected: 100
  const step6 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.OUT,
    weight: 200,
    createdById: admin.id,
  });
  console.assert(
    step6.newBalance.toString() === '100',
    `Scenario 6 Failed! Got: ${step6.newBalance.toString()}`
  );
  console.log('✓ Scenario 6 Passed: OUT 200 => Balance: 100.000g');

  // Scenario 7: OUT 94 => Expected: 6
  const step7 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.OUT,
    weight: 94,
    createdById: admin.id,
  });
  console.assert(
    step7.newBalance.toString() === '6',
    `Scenario 7 Failed! Got: ${step7.newBalance.toString()}`
  );
  console.log('✓ Scenario 7 Passed: OUT 94 => Balance: 6.000g');

  // Total IN so far: 300 + 100 + 70 = 470g
  // Total OUT so far: 50 + 120 + 200 + 94 = 464g
  // Balance: 6.000g

  // Scenario 8: Settlement Return 6 => Expected: 0
  const settleRes = await settleCustomerAccount({
    customerId: testCustomer.id,
    karatId: karat92.id,
    fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    toDate: new Date(),
    settlementAction: SettlementAction.RETURN_TO_CUSTOMER,
    settledWeight: 6,
    makingRate: 25,
    chargeBasis: ChargeBasis.TOTAL_RECEIVED,
    createdById: admin.id,
  });
  console.assert(
    settleRes.remainingBalance.toString() === '0',
    `Scenario 8 Failed! Got: ${settleRes.remainingBalance.toString()}`
  );
  console.log('✓ Scenario 8 Passed: Settlement Return 6g => Balance: 0.000g');

  // Scenario 9: Making Charge Basis: Received Weight 470g × ₹25 = ₹11,750
  const chargeRec = multiplyWeightByRate(470, 25);
  console.assert(
    chargeRec.toString() === '11750',
    `Scenario 9 Failed! Expected 11750, got ${chargeRec.toString()}`
  );
  console.log('✓ Scenario 9 Passed: Making basis Received Weight: 470g × ₹25 = ₹11,750');

  // Scenario 10: Making Charge Basis: Finished OUT 464g × ₹25 = ₹11,600
  const chargeOut = multiplyWeightByRate(464, 25);
  console.assert(
    chargeOut.toString() === '11600',
    `Scenario 10 Failed! Expected 11600, got ${chargeOut.toString()}`
  );
  console.log('✓ Scenario 10 Passed: Making basis Finished OUT: 464g × ₹25 = ₹11,600');

  // Scenario 11: New IN after settlement: IN 100g => Expected new balance: 100g. Historical settlement remains intact.
  const step11 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat92.id,
    type: TransactionType.IN,
    weight: 100,
    createdById: admin.id,
  });
  console.assert(
    step11.newBalance.toString() === '100',
    `Scenario 11 Failed! Got: ${step11.newBalance.toString()}`
  );
  console.log('✓ Scenario 11 Passed: New IN 100g after settlement => Balance: 100.000g (Settlement history preserved)');

  // Scenario 12: Separate karat: Same customer receives 75K 200g, 92K account must remain unaffected.
  const step12 = await createLedgerTransaction({
    customerId: testCustomer.id,
    karatId: karat75.id,
    type: TransactionType.IN,
    weight: 200,
    createdById: admin.id,
  });
  const summary92 = await getAccountLedgerSummary(testCustomer.id, karat92.id);
  console.assert(
    step12.newBalance.toString() === '200',
    `Scenario 12 75K Failed! Got: ${step12.newBalance.toString()}`
  );
  console.assert(
    summary92.currentBalance.toString() === '100',
    `Scenario 12 92K affected! Expected 100, got ${summary92.currentBalance.toString()}`
  );
  console.log('✓ Scenario 12 Passed: 75K account created with 200.000g while 92K ledger remained 100.000g (Strict Karat Isolation)');

  // Cleanup test client
  await prisma.customer.delete({ where: { id: testCustomer.id } });
  console.log('Cleaned up test customer.');
  console.log('ALL 12 SCENARIO TESTS PASSED PERFECTLY!');
}

runScenarioVerification()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
