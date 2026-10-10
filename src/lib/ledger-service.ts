import { prisma } from './prisma';
import {
  TransactionType,
  TransactionStatus,
  SettlementAction,
  ChargeBasis,
  PaymentStatus,
  Role,
  Prisma,
} from '@prisma/client';
import { Decimal, toDecimal, addWeights, subtractWeights, multiplyWeightByRate } from './decimal';
import { logAudit } from './audit';

export interface LedgerSummary {
  customerId: string;
  customerName: string;
  karatId: string;
  karatName: string;
  totalIn: Decimal;
  totalOut: Decimal;
  totalSettlementAdjustments: Decimal;
  currentBalance: Decimal;
  activeTransactionCount: number;
}

/**
 * Generates the next guaranteed-unique transaction number (e.g. TXN-10043)
 */
export async function generateNextTransactionNumber(tx: Prisma.TransactionClient): Promise<string> {
  const txs = await tx.transaction.findMany({
    select: { transactionNumber: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  let maxNum = 10000;
  for (const t of txs) {
    const match = t.transactionNumber?.match(/TXN-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  let candidate = maxNum + 1;
  while (await tx.transaction.findUnique({ where: { transactionNumber: `TXN-${candidate}` } })) {
    candidate++;
  }

  return `TXN-${candidate}`;
}

/**
 * Returns a generator function that produces guaranteed-unique sequential transaction numbers
 */
export async function getNextTransactionSequence(tx: Prisma.TransactionClient): Promise<() => Promise<string>> {
  const txs = await tx.transaction.findMany({
    select: { transactionNumber: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  let maxNum = 10000;
  for (const t of txs) {
    const match = t.transactionNumber?.match(/TXN-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  let current = maxNum;
  return async () => {
    current++;
    while (await tx.transaction.findUnique({ where: { transactionNumber: `TXN-${current}` } })) {
      current++;
    }
    return `TXN-${current}`;
  };
}

/**
 * Generates the next guaranteed-unique settlement number (e.g. SET-2026-0005)
 */
export async function generateNextSettlementNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const settlements = await tx.settlement.findMany({
    where: { settlementNumber: { startsWith: `SET-${year}-` } },
    select: { settlementNumber: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  let maxNum = 0;
  for (const s of settlements) {
    const match = s.settlementNumber?.match(new RegExp(`SET-${year}-(\\d+)`));
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  let candidate = maxNum + 1;
  let formatted = `SET-${year}-${String(candidate).padStart(4, '0')}`;
  while (await tx.settlement.findUnique({ where: { settlementNumber: formatted } })) {
    candidate++;
    formatted = `SET-${year}-${String(candidate).padStart(4, '0')}`;
  }

  return formatted;
}

/**
 * Calculates current running balance for a given Customer + Karat account
 * derived directly from active transactions (the source of truth).
 */
export async function getAccountLedgerSummary(
  customerId: string,
  karatId: string,
  tx?: Prisma.TransactionClient
): Promise<LedgerSummary> {
  const db = tx || prisma;

  const [customer, karat, transactions] = await Promise.all([
    db.customer.findUniqueOrThrow({ where: { id: customerId } }),
    db.karat.findUniqueOrThrow({ where: { id: karatId } }),
    db.transaction.findMany({
      where: {
        customerId,
        karatId,
        status: TransactionStatus.ACTIVE,
        settlementId: null,
      },
      select: {
        type: true,
        weight: true,
      },
    }),
  ]);

  let totalIn = new Decimal(0);
  let totalOut = new Decimal(0);
  let totalSettlementAdjustments = new Decimal(0);

  for (const t of transactions) {
    const w = toDecimal(t.weight);
    if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
      totalIn = totalIn.plus(w);
    } else if (t.type === TransactionType.OUT) {
      totalOut = totalOut.plus(w);
    } else if (
      t.type === TransactionType.SETTLEMENT_RETURN ||
      t.type === TransactionType.SETTLEMENT_ADJUSTMENT
    ) {
      totalSettlementAdjustments = totalSettlementAdjustments.plus(w);
    }
  }

  // Current Balance = Total IN - Total OUT - Total Settlement Adjustments
  const currentBalance = totalIn.minus(totalOut).minus(totalSettlementAdjustments);

  return {
    customerId,
    customerName: customer.name,
    karatId,
    karatName: karat.name,
    totalIn,
    totalOut,
    totalSettlementAdjustments,
    currentBalance,
    activeTransactionCount: transactions.length,
  };
}

/**
 * Get or create the CustomerKaratAccount record
 */
export async function ensureCustomerKaratAccount(
  customerId: string,
  karatId: string,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  let account = await db.customerKaratAccount.findUnique({
    where: {
      customerId_karatId: { customerId, karatId },
    },
  });

  if (!account) {
    account = await db.customerKaratAccount.create({
      data: {
        customerId,
        karatId,
        openingBalance: new Decimal(0),
        cachedBalance: new Decimal(0),
      },
    });
  }

  return account;
}

export interface CreateTransactionInput {
  customerId: string;
  karatId: string;
  type: TransactionType;
  weight: number | string | Decimal;
  transactionDate?: Date;
  notes?: string;
  description?: string;
  createdById: string;
  allowOverride?: boolean;
  overrideReason?: string;
  userRole?: Role;
}

/**
 * Creates a transaction atomically with concurrency safety and balance validation
 */
export async function createLedgerTransaction(input: CreateTransactionInput) {
  const weight = toDecimal(input.weight);
  if (weight.lte(0)) {
    throw new Error('Weight must be greater than 0.000g');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Ensure account exists
    const account = await ensureCustomerKaratAccount(input.customerId, input.karatId, tx);

    // 2. Fetch current balance
    const summary = await getAccountLedgerSummary(input.customerId, input.karatId, tx);

    // 3. Validate OUT or settlement reductions
    const isReduction =
      input.type === TransactionType.OUT ||
      input.type === TransactionType.SETTLEMENT_RETURN ||
      input.type === TransactionType.SETTLEMENT_ADJUSTMENT;

    if (isReduction) {
      if (summary.currentBalance.lt(weight)) {
        if (!input.allowOverride) {
          throw new Error(
            `INSUFFICIENT_BALANCE: Only ${summary.currentBalance.toFixed(
              3
            )}g is currently available in this ${summary.karatName} ledger. Cannot record ${weight.toFixed(
              3
            )}g ${input.type}.`
          );
        }
        if (input.userRole !== Role.ADMIN) {
          throw new Error('Adjustment override requires Administrator privileges.');
        }
        if (!input.overrideReason || input.overrideReason.trim().length === 0) {
          throw new Error('A reason is required when overriding negative balance.');
        }
      }
    }

    // 4. Generate guaranteed-unique transaction number
    const transactionNumber = await generateNextTransactionNumber(tx);

    // 5. Create transaction
    const newTx = await tx.transaction.create({
      data: {
        transactionNumber,
        customerId: input.customerId,
        karatId: input.karatId,
        accountId: account.id,
        type: input.type,
        weight: new Prisma.Decimal(weight.toFixed(3)),
        transactionDate: input.transactionDate || new Date(),
        notes: input.notes,
        description: input.description,
        status: TransactionStatus.ACTIVE,
        overrideAllowed: !!input.allowOverride,
        overrideReason: input.overrideReason,
        createdById: input.createdById,
      },
      include: {
        customer: true,
        karat: true,
        createdBy: { select: { id: true, name: true, username: true } },
      },
    });

    // 6. Update cached balance
    const updatedSummary = await getAccountLedgerSummary(input.customerId, input.karatId, tx);
    await tx.customerKaratAccount.update({
      where: { id: account.id },
      data: {
        cachedBalance: new Prisma.Decimal(updatedSummary.currentBalance.toFixed(3)),
      },
    });

    // 7. Audit log
    await logAudit({
      userId: input.createdById,
      username: newTx.createdBy.username,
      action: 'CREATE',
      entity: 'TRANSACTION',
      entityId: newTx.id,
      newValue: {
        transactionNumber: newTx.transactionNumber,
        customer: newTx.customer.name,
        karat: newTx.karat.name,
        type: newTx.type,
        weight: newTx.weight.toString(),
        newBalance: updatedSummary.currentBalance.toFixed(3),
      },
      reason: input.overrideReason || 'Regular transaction recorded',
    });

    return {
      transaction: newTx,
      previousBalance: summary.currentBalance,
      newBalance: updatedSummary.currentBalance,
    };
  }, { timeout: 25000, maxWait: 15000 });
}

/**
 * Void a transaction safely (immutable audit protection)
 */
export async function voidLedgerTransaction(params: {
  transactionId: string;
  userId: string;
  reason: string;
  userRole: Role;
}) {
  if (params.userRole !== Role.ADMIN) {
    throw new Error('Only an Administrator can void finalized transactions.');
  }

  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error('A reason is required to void a transaction.');
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUniqueOrThrow({
      where: { id: params.transactionId },
      include: { customer: true, karat: true, createdBy: true },
    });

    if (existing.status === TransactionStatus.VOID) {
      throw new Error('This transaction is already voided.');
    }

    const voidedTx = await tx.transaction.update({
      where: { id: params.transactionId },
      data: {
        status: TransactionStatus.VOID,
        voidReason: params.reason,
        voidedAt: new Date(),
        voidedById: params.userId,
      },
    });

    // Recalculate balance
    const summary = await getAccountLedgerSummary(existing.customerId, existing.karatId, tx);
    await tx.customerKaratAccount.update({
      where: { id: existing.accountId },
      data: {
        cachedBalance: new Prisma.Decimal(summary.currentBalance.toFixed(3)),
      },
    });

    // Audit log
    const user = await tx.user.findUnique({ where: { id: params.userId } });
    await logAudit({
      userId: params.userId,
      username: user?.username,
      action: 'VOID',
      entity: 'TRANSACTION',
      entityId: existing.id,
      oldValue: {
        transactionNumber: existing.transactionNumber,
        type: existing.type,
        weight: existing.weight.toString(),
      },
      newValue: { status: 'VOID', voidReason: params.reason },
      reason: params.reason,
    });

    return { voidedTx, newBalance: summary.currentBalance };
  });
}

export interface SettleAccountInput {
  customerId: string;
  karatId: string;
  fromDate?: Date;
  toDate?: Date;
  settleMode?: 'GOLD' | 'MONEY'; // Simplified: 'GOLD' (making deducted from loss) | 'MONEY' (paid in cash/UPI)
  
  // GOLD settlement: Loss = IN - OUT; making deducted from loss; remaining returned to customer
  makingGoldWeight?: number | string | Decimal;
  returnGoldWeight?: number | string | Decimal;
  dukanLossWeight?: number | string | Decimal;
  dollLossWeight?: number | string | Decimal;
  
  // MONEY settlement: gold returned to customer, making paid in ₹
  makingAmountMoney?: number | string | Decimal;
  paymentReceived?: number | string | Decimal;
  paymentMode?: string;
  paymentReference?: string;

  // Legacy / fallback parameters
  settlementAction?: SettlementAction;
  settledWeight?: number | string | Decimal;
  carryForwardWeight?: number | string | Decimal;
  makingRate?: number | string | Decimal;
  chargeBasis?: ChargeBasis;
  manualWeight?: number | string | Decimal;
  discount?: number | string | Decimal;
  extraCharge?: number | string | Decimal;
  notes?: string;
  createdById: string;
}

/**
 * Executes a customer karat account settlement
 * Simplified Chool workshop logic:
 * Total IN, Total OUT => Loss (IN - OUT)
 * 1. GOLD: Making charge is deducted from Loss, remaining gold returned to customer
 * 2. MONEY: Gold returned to customer, making charge paid in ₹
 */
export async function settleCustomerAccount(input: SettleAccountInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch transactions in the period for this customer + karat
    const [customer, karat] = await Promise.all([
      tx.customer.findUniqueOrThrow({ where: { id: input.customerId } }),
      tx.karat.findUniqueOrThrow({ where: { id: input.karatId } }),
    ]);

    const account = await ensureCustomerKaratAccount(input.customerId, input.karatId, tx);

    const toDate = input.toDate || new Date();
    const fromDate = input.fromDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    // Active UNSETTLED transactions up to toDate
    const txns = await tx.transaction.findMany({
      where: {
        customerId: input.customerId,
        karatId: input.karatId,
        status: TransactionStatus.ACTIVE,
        settlementId: null,
        transactionDate: {
          lte: toDate,
        },
      },
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);

    for (const t of txns) {
      const w = toDecimal(t.weight);
      if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
        totalIn = totalIn.plus(w);
      } else if (t.type === TransactionType.OUT) {
        totalOut = totalOut.plus(w);
      }
    }

    // Loss = remaining un-settled gold in workshop for current order cycle
    const loss = Decimal.max(0, totalIn.minus(totalOut));
    const isSimplifiedMode = input.settleMode === 'GOLD' || input.settleMode === 'MONEY' || input.makingGoldWeight !== undefined || input.makingAmountMoney !== undefined;

    let finalAction = input.settlementAction || SettlementAction.RETURN_TO_CUSTOMER;
    let settledGoldToReturn = new Decimal(0);
    let makingGoldDeducted = new Decimal(0);
    let dukanLossWeight = new Decimal(0);
    let dollLossWeight = new Decimal(0);
    let carryForwardWeight = new Decimal(0);
    let finalRemainingBalance = new Decimal(0);

    let finalMakingAmount = new Decimal(0);
    let paidAmount = new Decimal(0);
    let pendingAmount = new Decimal(0);
    let paymentStatus: PaymentStatus = PaymentStatus.PAID;
    let chargeBasis: ChargeBasis = input.chargeBasis || ChargeBasis.TOTAL_RECEIVED;
    let chargeableWeight = new Decimal(0);
    let makingRate = toDecimal(input.makingRate || 0);

    if (isSimplifiedMode) {
      if (input.settleMode === 'MONEY') {
        // Option B: MONEY settlement
        settledGoldToReturn = input.returnGoldWeight !== undefined ? toDecimal(input.returnGoldWeight) : loss;
        carryForwardWeight = toDecimal(input.carryForwardWeight || 0);
        finalRemainingBalance = carryForwardWeight;

        finalMakingAmount = toDecimal(input.makingAmountMoney || 0);
        paidAmount = toDecimal(input.paymentReceived || 0);
        pendingAmount = finalMakingAmount.minus(paidAmount);
        chargeableWeight = totalOut.gt(0) ? totalOut : totalIn;

        if (paidAmount.gte(finalMakingAmount) && finalMakingAmount.gt(0)) {
          paymentStatus = PaymentStatus.PAID;
        } else if (paidAmount.gt(0)) {
          paymentStatus = PaymentStatus.PARTIAL;
        } else if (finalMakingAmount.gt(0)) {
          paymentStatus = PaymentStatus.UNPAID;
        } else {
          paymentStatus = PaymentStatus.PAID;
        }
      } else {
        // Option A: GOLD settlement (Default)
        // Notebook style manual entries: Making charge, Return gold, Dukan loss, and Doll loss are independent
        makingGoldDeducted = toDecimal(input.makingGoldWeight || 0);
        dukanLossWeight = toDecimal(input.dukanLossWeight || 0);
        dollLossWeight = toDecimal(input.dollLossWeight || 0);
        settledGoldToReturn = input.returnGoldWeight !== undefined 
          ? toDecimal(input.returnGoldWeight) 
          : Decimal.max(0, loss.minus(makingGoldDeducted).minus(dukanLossWeight).minus(dollLossWeight));

        if (settledGoldToReturn.lt(0)) {
          settledGoldToReturn = new Decimal(0);
        }

        carryForwardWeight = toDecimal(input.carryForwardWeight || 0);
        finalRemainingBalance = carryForwardWeight;
        chargeableWeight = makingGoldDeducted;
        finalMakingAmount = new Decimal(0);
        paidAmount = new Decimal(0);
        pendingAmount = new Decimal(0);
        paymentStatus = PaymentStatus.PAID; // Settled in gold
      }
    } else {
      // Legacy / programmatic fallback
      const settledWeight = toDecimal(input.settledWeight || 0);
      if (input.settlementAction === SettlementAction.CARRY_FORWARD) {
        carryForwardWeight = loss;
        finalRemainingBalance = loss;
      } else {
        settledGoldToReturn = settledWeight;
        carryForwardWeight = toDecimal(input.carryForwardWeight || 0);
        finalRemainingBalance = carryForwardWeight;
      }

      if (input.chargeBasis === ChargeBasis.TOTAL_RECEIVED) {
        chargeableWeight = totalIn;
      } else if (input.chargeBasis === ChargeBasis.FINISHED_OUT) {
        chargeableWeight = totalOut;
      } else {
        chargeableWeight = toDecimal(input.manualWeight || 0);
      }

      const calculatedMaking = multiplyWeightByRate(chargeableWeight, makingRate);
      const discount = toDecimal(input.discount || 0);
      const extraCharge = toDecimal(input.extraCharge || 0);
      finalMakingAmount = calculatedMaking.minus(discount).plus(extraCharge);

      paidAmount = toDecimal(input.paymentReceived || 0);
      pendingAmount = finalMakingAmount.minus(paidAmount);

      if (paidAmount.gte(finalMakingAmount) && finalMakingAmount.gt(0)) {
        paymentStatus = PaymentStatus.PAID;
      } else if (paidAmount.gt(0)) {
        paymentStatus = PaymentStatus.PARTIAL;
      } else if (finalMakingAmount.gt(0)) {
        paymentStatus = PaymentStatus.UNPAID;
      } else {
        paymentStatus = PaymentStatus.PAID;
      }
    }

    // Generate guaranteed-unique settlement number
    const settlementNumber = await generateNextSettlementNumber(tx);

    const totalSettledGold = settledGoldToReturn.plus(makingGoldDeducted).plus(dukanLossWeight).plus(dollLossWeight);

    // Create Settlement Record
    const settlement = await tx.settlement.create({
      data: {
        settlementNumber,
        customerId: input.customerId,
        karatId: input.karatId,
        fromDate,
        toDate,
        settlementDate: new Date(),
        totalInWeight: new Prisma.Decimal(totalIn.toFixed(3)),
        totalOutWeight: new Prisma.Decimal(totalOut.toFixed(3)),
        remainingBefore: new Prisma.Decimal(loss.toFixed(3)),
        settlementAction: finalAction,
        settledWeight: new Prisma.Decimal(totalSettledGold.toFixed(3)),
        carryForwardWeight: new Prisma.Decimal(carryForwardWeight.toFixed(3)),
        finalRemainingBalance: new Prisma.Decimal(finalRemainingBalance.toFixed(3)),
        makingRate: new Prisma.Decimal(makingRate.toFixed(2)),
        chargeBasis,
        chargeableWeight: new Prisma.Decimal(chargeableWeight.toFixed(3)),
        calculatedMakingAmount: new Prisma.Decimal(finalMakingAmount.toFixed(2)),
        discount: new Prisma.Decimal(toDecimal(input.discount || 0).toFixed(2)),
        extraCharge: new Prisma.Decimal(toDecimal(input.extraCharge || 0).toFixed(2)),
        finalMakingAmount: new Prisma.Decimal(finalMakingAmount.toFixed(2)),
        paymentStatus,
        paidAmount: new Prisma.Decimal(paidAmount.toFixed(2)),
        pendingAmount: new Prisma.Decimal(pendingAmount.toFixed(2)),
        notes: input.notes,
        createdById: input.createdById,
      },
    });

    // Link previous active unsettled transactions in this cycle to this settlement
    await tx.transaction.updateMany({
      where: {
        customerId: input.customerId,
        karatId: input.karatId,
        status: TransactionStatus.ACTIVE,
        settlementId: null,
        transactionDate: {
          lte: toDate,
        },
      },
      data: {
        settlementId: settlement.id,
      },
    });

    // Create ledger transactions with collision-free sequence:
    const getNextTxnNumber = await getNextTransactionSequence(tx);

    // 1. Gold returned to customer
    if (settledGoldToReturn.gt(0)) {
      await tx.transaction.create({
        data: {
          transactionNumber: await getNextTxnNumber(),
          customerId: input.customerId,
          karatId: input.karatId,
          accountId: account.id,
          type: TransactionType.SETTLEMENT_RETURN,
          weight: new Prisma.Decimal(settledGoldToReturn.toFixed(3)),
          transactionDate: new Date(),
          notes: `Settlement: ${settlementNumber} (Gold returned to customer)`,
          settlementId: settlement.id,
          status: TransactionStatus.ACTIVE,
          createdById: input.createdById,
        },
      });
    }

    // 2. Making charge deducted in gold (if applicable)
    if (makingGoldDeducted.gt(0)) {
      await tx.transaction.create({
        data: {
          transactionNumber: await getNextTxnNumber(),
          customerId: input.customerId,
          karatId: input.karatId,
          accountId: account.id,
          type: TransactionType.SETTLEMENT_ADJUSTMENT,
          weight: new Prisma.Decimal(makingGoldDeducted.toFixed(3)),
          transactionDate: new Date(),
          notes: `Settlement: ${settlementNumber} (Making charge deducted in gold)`,
          settlementId: settlement.id,
          status: TransactionStatus.ACTIVE,
          createdById: input.createdById,
        },
      });
    }

    // 3. Dukan loss in gold (if applicable)
    if (dukanLossWeight.gt(0)) {
      await tx.transaction.create({
        data: {
          transactionNumber: await getNextTxnNumber(),
          customerId: input.customerId,
          karatId: input.karatId,
          accountId: account.id,
          type: TransactionType.SETTLEMENT_ADJUSTMENT,
          weight: new Prisma.Decimal(dukanLossWeight.toFixed(3)),
          transactionDate: new Date(),
          notes: `Settlement: ${settlementNumber} (Dukan loss)`,
          settlementId: settlement.id,
          status: TransactionStatus.ACTIVE,
          createdById: input.createdById,
        },
      });
    }

    // 4. Doll loss in gold (if applicable)
    if (dollLossWeight.gt(0)) {
      await tx.transaction.create({
        data: {
          transactionNumber: await getNextTxnNumber(),
          customerId: input.customerId,
          karatId: input.karatId,
          accountId: account.id,
          type: TransactionType.SETTLEMENT_ADJUSTMENT,
          weight: new Prisma.Decimal(dollLossWeight.toFixed(3)),
          transactionDate: new Date(),
          notes: `Settlement: ${settlementNumber} (Doll loss)`,
          settlementId: settlement.id,
          status: TransactionStatus.ACTIVE,
          createdById: input.createdById,
        },
      });
    }

    // 5. Carry forward balance opening for next cycle (if applicable)
    if (carryForwardWeight.gt(0)) {
      await tx.transaction.create({
        data: {
          transactionNumber: await getNextTxnNumber(),
          customerId: input.customerId,
          karatId: input.karatId,
          accountId: account.id,
          type: TransactionType.OPENING_BALANCE,
          weight: new Prisma.Decimal(carryForwardWeight.toFixed(3)),
          transactionDate: new Date(),
          notes: `Opening balance carried forward from ${settlementNumber}`,
          settlementId: null,
          status: TransactionStatus.ACTIVE,
          createdById: input.createdById,
        },
      });
    }

    // Record Payment if paidAmount > 0 (for MONEY settlements)
    if (paidAmount.gt(0)) {
      await tx.payment.create({
        data: {
          settlementId: settlement.id,
          amount: new Prisma.Decimal(paidAmount.toFixed(2)),
          paymentDate: new Date(),
          paymentMode: input.paymentMode || 'CASH',
          referenceNo: input.paymentReference,
          notes: 'Settlement making payment',
          createdById: input.createdById,
        },
      });
    }

    // Update cached account balance
    const updatedSummary = await getAccountLedgerSummary(input.customerId, input.karatId, tx);
    await tx.customerKaratAccount.update({
      where: { id: account.id },
      data: {
        cachedBalance: new Prisma.Decimal(updatedSummary.currentBalance.toFixed(3)),
      },
    });

    // Audit log
    const user = await tx.user.findUnique({ where: { id: input.createdById } });
    await logAudit({
      userId: input.createdById,
      username: user?.username,
      action: 'SETTLE',
      entity: 'SETTLEMENT',
      entityId: settlement.id,
      newValue: {
        settlementNumber,
        customer: customer.name,
        karat: karat.name,
        settledWeight: totalSettledGold.toFixed(3),
        finalMakingAmount: finalMakingAmount.toFixed(2),
        paymentStatus,
      },
      reason: input.notes || 'Account settlement recorded',
    });

    return {
      settlement,
      remainingBalance: updatedSummary.currentBalance,
    };
  }, { timeout: 35000, maxWait: 15000 });
}

export interface UpdateSettlementInput {
  settlementId: string;
  dukanLossWeight?: number | string | Decimal;
  dollLossWeight?: number | string | Decimal;
  returnGoldWeight?: number | string | Decimal;
  makingGoldWeight?: number | string | Decimal;
  carryForwardWeight?: number | string | Decimal;
  notes?: string;
  reason?: string;
  userId: string;
}

/**
 * Updates an existing settlement's weight adjustments (e.g. correcting Dukan loss, Doll loss, Return gold)
 * and safely recalculates the customer's cached account balance.
 */
export async function updateSettlement(input: UpdateSettlementInput) {
  return await prisma.$transaction(async (tx) => {
    const settlement = await tx.settlement.findUniqueOrThrow({
      where: { id: input.settlementId },
      include: {
        customer: true,
        karat: true,
        transactions: {
          where: { status: TransactionStatus.ACTIVE },
        },
      },
    });

    const account = await ensureCustomerKaratAccount(settlement.customerId, settlement.karatId, tx);
    const getNextTxnNumber = await getNextTransactionSequence(tx);

    // Locate existing settlement adjustment / return transactions
    const dukanTxn = settlement.transactions.find((t) => t.notes?.includes('(Dukan loss)'));
    const dollTxn = settlement.transactions.find((t) => t.notes?.includes('(Doll loss)'));
    const returnTxn = settlement.transactions.find((t) => t.type === TransactionType.SETTLEMENT_RETURN);
    const makingTxn = settlement.transactions.find((t) => t.notes?.includes('(Making charge deducted in gold)'));

    // Check for carry forward opening balance transaction
    const carryForwardTxn = await tx.transaction.findFirst({
      where: {
        notes: { contains: settlement.settlementNumber },
        type: TransactionType.OPENING_BALANCE,
        status: TransactionStatus.ACTIVE,
      },
    });

    // 1. Dukan Loss update
    let finalDukanLoss = dukanTxn ? toDecimal(dukanTxn.weight) : new Decimal(0);
    if (input.dukanLossWeight !== undefined) {
      finalDukanLoss = Decimal.max(0, toDecimal(input.dukanLossWeight));
      if (dukanTxn) {
        if (finalDukanLoss.gt(0)) {
          await tx.transaction.update({
            where: { id: dukanTxn.id },
            data: { weight: new Prisma.Decimal(finalDukanLoss.toFixed(3)) },
          });
        } else {
          await tx.transaction.delete({ where: { id: dukanTxn.id } });
        }
      } else if (finalDukanLoss.gt(0)) {
        await tx.transaction.create({
          data: {
            transactionNumber: await getNextTxnNumber(),
            customerId: settlement.customerId,
            karatId: settlement.karatId,
            accountId: account.id,
            type: TransactionType.SETTLEMENT_ADJUSTMENT,
            weight: new Prisma.Decimal(finalDukanLoss.toFixed(3)),
            transactionDate: settlement.settlementDate,
            notes: `Settlement: ${settlement.settlementNumber} (Dukan loss)`,
            settlementId: settlement.id,
            status: TransactionStatus.ACTIVE,
            createdById: input.userId,
          },
        });
      }
    }

    // 2. Doll Loss update
    let finalDollLoss = dollTxn ? toDecimal(dollTxn.weight) : new Decimal(0);
    if (input.dollLossWeight !== undefined) {
      finalDollLoss = Decimal.max(0, toDecimal(input.dollLossWeight));
      if (dollTxn) {
        if (finalDollLoss.gt(0)) {
          await tx.transaction.update({
            where: { id: dollTxn.id },
            data: { weight: new Prisma.Decimal(finalDollLoss.toFixed(3)) },
          });
        } else {
          await tx.transaction.delete({ where: { id: dollTxn.id } });
        }
      } else if (finalDollLoss.gt(0)) {
        await tx.transaction.create({
          data: {
            transactionNumber: await getNextTxnNumber(),
            customerId: settlement.customerId,
            karatId: settlement.karatId,
            accountId: account.id,
            type: TransactionType.SETTLEMENT_ADJUSTMENT,
            weight: new Prisma.Decimal(finalDollLoss.toFixed(3)),
            transactionDate: settlement.settlementDate,
            notes: `Settlement: ${settlement.settlementNumber} (Doll loss)`,
            settlementId: settlement.id,
            status: TransactionStatus.ACTIVE,
            createdById: input.userId,
          },
        });
      }
    }

    // 3. Return Gold update
    let finalReturnGold = returnTxn ? toDecimal(returnTxn.weight) : new Decimal(0);
    if (input.returnGoldWeight !== undefined) {
      finalReturnGold = Decimal.max(0, toDecimal(input.returnGoldWeight));
      if (returnTxn) {
        if (finalReturnGold.gt(0)) {
          await tx.transaction.update({
            where: { id: returnTxn.id },
            data: { weight: new Prisma.Decimal(finalReturnGold.toFixed(3)) },
          });
        } else {
          await tx.transaction.delete({ where: { id: returnTxn.id } });
        }
      } else if (finalReturnGold.gt(0)) {
        await tx.transaction.create({
          data: {
            transactionNumber: await getNextTxnNumber(),
            customerId: settlement.customerId,
            karatId: settlement.karatId,
            accountId: account.id,
            type: TransactionType.SETTLEMENT_RETURN,
            weight: new Prisma.Decimal(finalReturnGold.toFixed(3)),
            transactionDate: settlement.settlementDate,
            notes: `Settlement: ${settlement.settlementNumber} (Gold returned to customer)`,
            settlementId: settlement.id,
            status: TransactionStatus.ACTIVE,
            createdById: input.userId,
          },
        });
      }
    }

    // 4. Making Gold update
    let finalMakingGold = makingTxn ? toDecimal(makingTxn.weight) : toDecimal(settlement.chargeableWeight || 0);
    if (input.makingGoldWeight !== undefined) {
      finalMakingGold = Decimal.max(0, toDecimal(input.makingGoldWeight));
      if (makingTxn) {
        if (finalMakingGold.gt(0)) {
          await tx.transaction.update({
            where: { id: makingTxn.id },
            data: { weight: new Prisma.Decimal(finalMakingGold.toFixed(3)) },
          });
        } else {
          await tx.transaction.delete({ where: { id: makingTxn.id } });
        }
      } else if (finalMakingGold.gt(0)) {
        await tx.transaction.create({
          data: {
            transactionNumber: await getNextTxnNumber(),
            customerId: settlement.customerId,
            karatId: settlement.karatId,
            accountId: account.id,
            type: TransactionType.SETTLEMENT_ADJUSTMENT,
            weight: new Prisma.Decimal(finalMakingGold.toFixed(3)),
            transactionDate: settlement.settlementDate,
            notes: `Settlement: ${settlement.settlementNumber} (Making charge deducted in gold)`,
            settlementId: settlement.id,
            status: TransactionStatus.ACTIVE,
            createdById: input.userId,
          },
        });
      }
    }

    // 5. Carry forward balance (if applicable)
    let finalCarryForward = carryForwardTxn ? toDecimal(carryForwardTxn.weight) : toDecimal(settlement.carryForwardWeight || 0);
    if (input.carryForwardWeight !== undefined) {
      finalCarryForward = Decimal.max(0, toDecimal(input.carryForwardWeight));
      if (carryForwardTxn) {
        if (finalCarryForward.gt(0)) {
          await tx.transaction.update({
            where: { id: carryForwardTxn.id },
            data: { weight: new Prisma.Decimal(finalCarryForward.toFixed(3)) },
          });
        } else {
          await tx.transaction.delete({ where: { id: carryForwardTxn.id } });
        }
      } else if (finalCarryForward.gt(0)) {
        await tx.transaction.create({
          data: {
            transactionNumber: await getNextTxnNumber(),
            customerId: settlement.customerId,
            karatId: settlement.karatId,
            accountId: account.id,
            type: TransactionType.OPENING_BALANCE,
            weight: new Prisma.Decimal(finalCarryForward.toFixed(3)),
            transactionDate: settlement.settlementDate,
            notes: `Opening balance carried forward from ${settlement.settlementNumber}`,
            settlementId: null,
            status: TransactionStatus.ACTIVE,
            createdById: input.userId,
          },
        });
      }
    }

    // Recompute total settled gold
    const totalSettledGold = finalReturnGold.plus(finalMakingGold).plus(finalDukanLoss).plus(finalDollLoss);

    // Update settlement notes if provided
    let updatedNotes = settlement.notes;
    if (input.notes !== undefined) {
      updatedNotes = input.notes;
    }

    // Update Settlement entity
    const updatedSettlement = await tx.settlement.update({
      where: { id: settlement.id },
      data: {
        settledWeight: new Prisma.Decimal(totalSettledGold.toFixed(3)),
        chargeableWeight: new Prisma.Decimal(finalMakingGold.toFixed(3)),
        carryForwardWeight: new Prisma.Decimal(finalCarryForward.toFixed(3)),
        notes: updatedNotes,
      },
      include: {
        customer: true,
        karat: true,
      },
    });

    // Update cached account balance
    const updatedSummary = await getAccountLedgerSummary(settlement.customerId, settlement.karatId, tx);
    await tx.customerKaratAccount.update({
      where: { id: account.id },
      data: {
        cachedBalance: new Prisma.Decimal(updatedSummary.currentBalance.toFixed(3)),
      },
    });

    // Audit log
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    await logAudit({
      userId: input.userId,
      username: user?.username,
      action: 'UPDATE',
      entity: 'SETTLEMENT',
      entityId: settlement.id,
      newValue: {
        settlementNumber: settlement.settlementNumber,
        customer: settlement.customer.name,
        karat: settlement.karat.name,
        dukanLossWeight: finalDukanLoss.toFixed(3),
        dollLossWeight: finalDollLoss.toFixed(3),
        returnGoldWeight: finalReturnGold.toFixed(3),
        makingGoldWeight: finalMakingGold.toFixed(3),
        settledWeight: totalSettledGold.toFixed(3),
        newAccountBalance: updatedSummary.currentBalance.toFixed(3),
      },
      reason: input.reason || 'Settlement weights edited and updated',
    });

    return {
      settlement: updatedSettlement,
      dukanLossWeight: finalDukanLoss.toFixed(3),
      dollLossWeight: finalDollLoss.toFixed(3),
      returnGoldWeight: finalReturnGold.toFixed(3),
      makingGoldWeight: finalMakingGold.toFixed(3),
      remainingBalance: updatedSummary.currentBalance.toFixed(3),
    };
  }, { timeout: 35000, maxWait: 15000 });
}
