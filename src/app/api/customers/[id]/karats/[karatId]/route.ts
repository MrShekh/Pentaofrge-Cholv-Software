import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus, Prisma } from '@prisma/client';

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

    // Fetch all transactions for this account in chronological order
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

    // Calculate bank-statement running balance
    let runningBalance = new Decimal(0);
    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);
    let totalAdjusted = new Decimal(0);

    const statementEntries = transactions.map((t) => {
      const w = toDecimal(t.weight);
      const isVoid = t.status === TransactionStatus.VOID;

      let inWeight: string | null = null;
      let outWeight: string | null = null;
      let adjWeight: string | null = null;

      if (!isVoid) {
        if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
          inWeight = w.toFixed(3);
          totalIn = totalIn.plus(w);
          runningBalance = runningBalance.plus(w);
        } else if (t.type === TransactionType.OUT) {
          outWeight = w.toFixed(3);
          totalOut = totalOut.plus(w);
          runningBalance = runningBalance.minus(w);
        } else if (
          t.type === TransactionType.SETTLEMENT_RETURN ||
          t.type === TransactionType.SETTLEMENT_ADJUSTMENT
        ) {
          adjWeight = w.toFixed(3);
          totalAdjusted = totalAdjusted.plus(w);
          runningBalance = runningBalance.minus(w);
        }
      }

      return {
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.transactionDate,
        type: t.type,
        status: t.status,
        weight: w.toFixed(3),
        inWeight,
        outWeight,
        adjWeight,
        runningBalance: isVoid ? null : runningBalance.toFixed(3),
        notes: t.notes,
        description: t.description,
        overrideAllowed: t.overrideAllowed,
        overrideReason: t.overrideReason,
        voidReason: t.voidReason,
        voidedAt: t.voidedAt,
        voidedBy: t.voidedBy,
        createdBy: t.createdBy,
        settlement: t.settlement,
      };
    });

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
        totalIn: totalIn.toFixed(3),
        totalOut: totalOut.toFixed(3),
        totalAdjusted: totalAdjusted.toFixed(3),
        currentBalance: runningBalance.toFixed(3),
        totalTransactions: transactions.length,
      },
      ledger: statementEntries.reverse(), // latest on top for UI, but running balances computed chronologically
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch customer karat ledger' }, { status: 500 });
  }
}
