import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus } from '@prisma/client';

export async function GET() {
  try {
    await requireUser();

    // Today's range (start of day to now in local time)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // 1. Transactions today
    const todayTxns = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.ACTIVE,
        transactionDate: {
          gte: startOfToday,
        },
      },
      select: {
        type: true,
        weight: true,
        notes: true,
      },
    });

    let todayIn = new Decimal(0);
    let todayOut = new Decimal(0);
    let todayDukanLoss = new Decimal(0);

    for (const t of todayTxns) {
      const w = toDecimal(t.weight);
      if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
        todayIn = todayIn.plus(w);
      } else if (t.type === TransactionType.OUT || t.type === TransactionType.SETTLEMENT_RETURN) {
        todayOut = todayOut.plus(w);
      } else if (t.type === TransactionType.SETTLEMENT_ADJUSTMENT && t.notes?.includes('(Dukan loss)')) {
        todayDukanLoss = todayDukanLoss.plus(w);
      }
    }

    // All-time Dukan loss
    const totalDukanLossAgg = await prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.ACTIVE,
        type: TransactionType.SETTLEMENT_ADJUSTMENT,
        notes: { contains: '(Dukan loss)' },
      },
      _sum: {
        weight: true,
      },
    });
    const totalDukanLoss = toDecimal(totalDukanLossAgg._sum.weight || 0);

    // 2. Total pending work across all customer karat accounts
    const allAccounts = await prisma.customerKaratAccount.findMany({
      where: {
        customer: { isActive: true },
      },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        karat: { select: { id: true, name: true } },
      },
    });

    let totalPendingWork = new Decimal(0);
    const pendingBalancesList: Array<{
      customerId: string;
      customerName: string;
      shopName: string | null;
      karatId: string;
      karatName: string;
      balance: string;
    }> = [];

    for (const acc of allAccounts) {
      const bal = toDecimal(acc.cachedBalance);
      if (bal.gt(0)) {
        totalPendingWork = totalPendingWork.plus(bal);
        pendingBalancesList.push({
          customerId: acc.customerId,
          customerName: acc.customer.name,
          shopName: acc.customer.shopName,
          karatId: acc.karatId,
          karatName: acc.karat.name,
          balance: bal.toFixed(3),
        });
      }
    }

    // Sort pending balances descending
    pendingBalancesList.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

    // 3. Today's making amount collected or billed (Cash & Gold)
    const todaySettlements = await prisma.settlement.findMany({
      where: { settlementDate: { gte: startOfToday } },
      select: {
        finalMakingAmount: true,
        chargeableWeight: true,
      },
    });

    let todayMakingGold = new Decimal(0);
    let todaySettlementMoney = new Decimal(0);
    for (const s of todaySettlements) {
      if (toDecimal(s.finalMakingAmount).isZero() && toDecimal(s.chargeableWeight).gt(0)) {
        todayMakingGold = todayMakingGold.plus(toDecimal(s.chargeableWeight));
      } else {
        todaySettlementMoney = todaySettlementMoney.plus(toDecimal(s.finalMakingAmount));
      }
    }

    const todayPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startOfToday },
      },
      select: { amount: true },
    });

    let todayMakingAmount = new Decimal(0);
    for (const p of todayPayments) {
      todayMakingAmount = todayMakingAmount.plus(toDecimal(p.amount));
    }

    // If no explicit payments today, check if any rupee settlements were created today
    if (todayMakingAmount.isZero() && todaySettlementMoney.gt(0)) {
      todayMakingAmount = todaySettlementMoney;
    }

    // 4. Recent transactions (latest 10)
    const recentTxns = await prisma.transaction.findMany({
      take: 10,
      orderBy: { transactionDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        karat: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      metrics: {
        todayIn: todayIn.toFixed(3),
        todayOut: todayOut.toFixed(3),
        currentPendingWork: totalPendingWork.toFixed(3),
        todayMakingAmount: todayMakingAmount.toFixed(2),
        todayMakingGold: todayMakingGold.toFixed(3),
        todayDukanLoss: todayDukanLoss.toFixed(3),
        totalDukanLoss: totalDukanLoss.toFixed(3),
      },
      recentTransactions: recentTxns.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        customerId: t.customerId,
        customerName: t.customer.name,
        karatId: t.karatId,
        karatName: t.karat.name,
        type: t.type,
        weight: toDecimal(t.weight).toFixed(3),
        notes: t.notes,
        date: t.transactionDate,
        status: t.status,
      })),
      pendingBalances: pendingBalancesList,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
