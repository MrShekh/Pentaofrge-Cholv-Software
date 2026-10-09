import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; karatId: string }> }
) {
  try {
    await requireUser();
    const { id: customerId, karatId } = await params;

    const [customer, karat] = await Promise.all([
      prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
      prisma.karat.findUniqueOrThrow({ where: { id: karatId } }),
    ]);

    // Fetch all transactions for this account
    const transactions = await prisma.transaction.findMany({
      where: {
        customerId,
        karatId,
      },
      orderBy: { transactionDate: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        voidedBy: { select: { id: true, name: true, username: true } },
        settlement: {
          select: {
            id: true,
            settlementNumber: true,
            settlementDate: true,
            finalMakingAmount: true,
            paymentStatus: true,
          },
        },
      },
    });

    // Fetch past settlements for this customer + karat
    const settlements = await prisma.settlement.findMany({
      where: {
        customerId,
        karatId,
      },
      orderBy: { settlementDate: 'desc' },
      include: {
        transactions: {
          where: { status: 'ACTIVE' },
          select: { id: true, type: true, weight: true, notes: true },
        },
      },
    });

    const formattedSettlements = settlements.map((s) => {
      const dukanLossTxn = s.transactions.find((t) => t.notes?.includes('(Dukan loss)'));
      const dukanLossWeight = dukanLossTxn ? toDecimal(dukanLossTxn.weight).toFixed(3) : '0.000';
      const dollLossTxn = s.transactions.find((t) => t.notes?.includes('(Doll loss)'));
      const dollLossWeight = dollLossTxn ? toDecimal(dollLossTxn.weight).toFixed(3) : '0.000';
      const returnTxn = s.transactions.find((t) => t.type === 'SETTLEMENT_RETURN');
      const returnedGoldWeight = returnTxn ? toDecimal(returnTxn.weight).toFixed(3) : '0.000';
      const makingTxn = s.transactions.find((t) => t.notes?.includes('(Making charge deducted in gold)'));
      const makingGoldWeight = makingTxn ? toDecimal(makingTxn.weight).toFixed(3) : '0.000';

      return {
        id: s.id,
        settlementNumber: s.settlementNumber,
        settlementDate: s.settlementDate,
        totalInWeight: toDecimal(s.totalInWeight).toFixed(3),
        totalOutWeight: toDecimal(s.totalOutWeight).toFixed(3),
        settledWeight: toDecimal(s.settledWeight).toFixed(3),
        returnedGoldWeight,
        makingGoldWeight,
        dukanLossWeight,
        dollLossWeight,
        finalMakingAmount: toDecimal(s.finalMakingAmount).toFixed(2),
        paymentStatus: s.paymentStatus,
      };
    });

    // 1. Separate Active (unsettled) transactions from Settled transactions
    let activeTotalIn = new Decimal(0);
    let activeTotalOut = new Decimal(0);
    let activeTotalAdjusted = new Decimal(0);
    let activeRunningBal = new Decimal(0);

    let lifetimeIn = new Decimal(0);
    let lifetimeOut = new Decimal(0);

    const activeEntries: Array<{
      id: string;
      transactionNumber: string;
      date: Date;
      type: TransactionType;
      status: TransactionStatus;
      weight: string;
      inWeight: string | null;
      outWeight: string | null;
      adjWeight: string | null;
      runningBalance: string | null;
      notes: string | null;
      description: string | null;
      settlementId: string | null;
      overrideAllowed: boolean;
      overrideReason: string | null;
      voidReason: string | null;
      voidedAt: Date | null;
      voidedBy: { id: string; name: string; username: string } | null;
      createdBy: { id: string; name: string; username: string };
      settlement: {
        id: string;
        settlementNumber: string;
        settlementDate: Date;
        finalMakingAmount: Decimal;
        paymentStatus: string;
      } | null;
      isSettled: boolean;
    }> = [];

    const settledEntries: Array<{
      id: string;
      transactionNumber: string;
      date: Date;
      type: TransactionType;
      status: TransactionStatus;
      weight: string;
      inWeight: string | null;
      outWeight: string | null;
      adjWeight: string | null;
      runningBalance: string | null;
      notes: string | null;
      description: string | null;
      settlementId: string | null;
      overrideAllowed: boolean;
      overrideReason: string | null;
      voidReason: string | null;
      voidedAt: Date | null;
      voidedBy: { id: string; name: string; username: string } | null;
      createdBy: { id: string; name: string; username: string };
      settlement: {
        id: string;
        settlementNumber: string;
        settlementDate: Date;
        finalMakingAmount: Decimal;
        paymentStatus: string;
      } | null;
      isSettled: boolean;
    }> = [];

    for (const t of transactions) {
      const w = toDecimal(t.weight);
      const isVoid = t.status === TransactionStatus.VOID;

      let inWeight: string | null = null;
      let outWeight: string | null = null;
      let adjWeight: string | null = null;

      if (!isVoid) {
        if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
          inWeight = w.toFixed(3);
          lifetimeIn = lifetimeIn.plus(w);
          if (!t.settlementId) {
            activeTotalIn = activeTotalIn.plus(w);
            activeRunningBal = activeRunningBal.plus(w);
          }
        } else if (t.type === TransactionType.OUT) {
          outWeight = w.toFixed(3);
          lifetimeOut = lifetimeOut.plus(w);
          if (!t.settlementId) {
            activeTotalOut = activeTotalOut.plus(w);
            activeRunningBal = activeRunningBal.minus(w);
          }
        } else if (
          t.type === TransactionType.SETTLEMENT_RETURN ||
          t.type === TransactionType.SETTLEMENT_ADJUSTMENT
        ) {
          adjWeight = w.toFixed(3);
          if (!t.settlementId) {
            activeTotalAdjusted = activeTotalAdjusted.plus(w);
            activeRunningBal = activeRunningBal.minus(w);
          }
        }
      }

      const formattedEntry = {
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.transactionDate,
        type: t.type,
        status: t.status,
        weight: w.toFixed(3),
        inWeight,
        outWeight,
        adjWeight,
        runningBalance: isVoid
          ? null
          : !t.settlementId
          ? activeRunningBal.toFixed(3)
          : null,
        notes: t.notes,
        description: t.description,
        settlementId: t.settlementId,
        overrideAllowed: t.overrideAllowed,
        overrideReason: t.overrideReason,
        voidReason: t.voidReason,
        voidedAt: t.voidedAt,
        voidedBy: t.voidedBy,
        createdBy: t.createdBy,
        settlement: t.settlement,
        isSettled: !!t.settlementId,
      };

      if (!t.settlementId) {
        activeEntries.push(formattedEntry);
      } else {
        settledEntries.push(formattedEntry);
      }
    }

    const currentBalance = activeTotalIn.minus(activeTotalOut).minus(activeTotalAdjusted);

    // Active latest first
    const activeReversed = [...activeEntries].reverse();
    const settledReversed = [...settledEntries].reverse();
    // Combined list: active on top, then settled history
    const allReversed = [...activeReversed, ...settledReversed];

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        shopName: customer.shopName,
        phone: customer.phone,
        address: customer.address,
      },
      karat: {
        id: karat.id,
        name: karat.name,
        value: karat.value.toString(),
        defaultMakingRate: karat.defaultMakingRate?.toString() || '0.00',
      },
      summary: {
        totalIn: activeTotalIn.toFixed(3),
        totalOut: activeTotalOut.toFixed(3),
        totalAdjusted: activeTotalAdjusted.toFixed(3),
        currentBalance: currentBalance.toFixed(3),
        lifetimeIn: lifetimeIn.toFixed(3),
        lifetimeOut: lifetimeOut.toFixed(3),
        totalTransactions: transactions.length,
        activeCount: activeEntries.length,
        settledCount: settledEntries.length,
      },
      activeLedger: activeReversed,
      settledLedger: settledReversed,
      settlements: formattedSettlements,
      ledger: allReversed,
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch customer karat ledger' }, { status: 500 });
  }
}
