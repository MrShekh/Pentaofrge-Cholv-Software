import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus, Prisma, MachineType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireUser();

    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get('range') || 'all_time';
    const fromDateParam = searchParams.get('fromDate');
    const toDateParam = searchParams.get('toDate');
    const monthParam = searchParams.get('month');
    // Hand machine and Big (Boro) machine are fully separate sections
    const machine: MachineType = searchParams.get('machine') === 'BIG' ? MachineType.BIG : MachineType.HAND;

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let periodLabel = 'All Time';

    const now = new Date();

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      periodLabel = 'Today';
    } else if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else if (range === 'monthly' && monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      periodLabel = startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else if (range === 'custom' || fromDateParam || toDateParam) {
      if (fromDateParam) {
        startDate = new Date(`${fromDateParam}T00:00:00`);
      }
      if (toDateParam) {
        endDate = new Date(`${toDateParam}T23:59:59.999`);
      }
      periodLabel = `${fromDateParam || 'Start'} to ${toDateParam || 'Now'}`;
    } else {
      // all_time (default)
      startDate = null;
      endDate = null;
      periodLabel = 'All Time';
    }

    // 1. Transactions in the selected period
    const txWhere: Prisma.TransactionWhereInput = {
      status: TransactionStatus.ACTIVE,
      machineType: machine,
      ...(startDate || endDate
        ? {
            transactionDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const periodTxns = await prisma.transaction.findMany({
      where: txWhere,
      select: {
        type: true,
        weight: true,
        notes: true,
      },
    });

    let periodIn = new Decimal(0);
    let periodOut = new Decimal(0);
    let periodDukanLoss = new Decimal(0);
    let periodDollLoss = new Decimal(0);

    for (const t of periodTxns) {
      const w = toDecimal(t.weight);
      if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
        periodIn = periodIn.plus(w);
      } else if (t.type === TransactionType.OUT || t.type === TransactionType.SETTLEMENT_RETURN) {
        periodOut = periodOut.plus(w);
      } else if (t.type === TransactionType.SETTLEMENT_ADJUSTMENT && t.notes?.includes('(Dukan loss)')) {
        periodDukanLoss = periodDukanLoss.plus(w);
      } else if (t.type === TransactionType.SETTLEMENT_ADJUSTMENT && t.notes?.includes('(Doll loss)')) {
        periodDollLoss = periodDollLoss.plus(w);
      }
    }

    // All-time Dukan loss
    const totalDukanLossAgg = await prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.ACTIVE,
        machineType: machine,
        type: TransactionType.SETTLEMENT_ADJUSTMENT,
        notes: { contains: '(Dukan loss)' },
      },
      _sum: {
        weight: true,
      },
    });
    const totalDukanLoss = toDecimal(totalDukanLossAgg._sum.weight || 0);

    // All-time Doll loss
    const totalDollLossAgg = await prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.ACTIVE,
        machineType: machine,
        type: TransactionType.SETTLEMENT_ADJUSTMENT,
        notes: { contains: '(Doll loss)' },
      },
      _sum: {
        weight: true,
      },
    });
    const totalDollLoss = toDecimal(totalDollLossAgg._sum.weight || 0);

    // All-time Galai Loss
    const totalGalaiLossAgg = await prisma.settlement.aggregate({
      where: { machineType: machine },
      _sum: {
        galaiLoss: true,
      },
    });
    const totalGalaiLoss = toDecimal(totalGalaiLossAgg._sum.galaiLoss || 0);

    // 2. Total pending work across all customer karat accounts
    // Pending stock for this machine only (open, unsettled entries)
    const openTxns = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.ACTIVE,
        settlementId: null,
        machineType: machine,
        customer: { isActive: true },
      },
      select: {
        customerId: true,
        karatId: true,
        type: true,
        weight: true,
        customer: { select: { name: true, shopName: true } },
        karat: { select: { name: true } },
      },
    });

    const balanceMap = new Map<
      string,
      { customerId: string; customerName: string; shopName: string | null; karatId: string; karatName: string; bal: Decimal }
    >();
    for (const t of openTxns) {
      const key = `${t.customerId}|${t.karatId}`;
      const w = toDecimal(t.weight);
      const entry = balanceMap.get(key) || {
        customerId: t.customerId,
        customerName: t.customer.name,
        shopName: t.customer.shopName,
        karatId: t.karatId,
        karatName: t.karat.name,
        bal: new Decimal(0),
      };
      entry.bal =
        t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE
          ? entry.bal.plus(w)
          : entry.bal.minus(w);
      balanceMap.set(key, entry);
    }

    let totalPendingWork = new Decimal(0);
    const pendingBalancesList: Array<{
      customerId: string;
      customerName: string;
      shopName: string | null;
      karatId: string;
      karatName: string;
      balance: string;
    }> = [];

    for (const e of balanceMap.values()) {
      if (e.bal.gt(0)) {
        totalPendingWork = totalPendingWork.plus(e.bal);
        pendingBalancesList.push({
          customerId: e.customerId,
          customerName: e.customerName,
          shopName: e.shopName,
          karatId: e.karatId,
          karatName: e.karatName,
          balance: e.bal.toFixed(3),
        });
      }
    }

    // Sort pending balances descending
    pendingBalancesList.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));

    // 3. Making amount collected or billed in selected period (Cash & Gold)
    const settlementWhere: Prisma.SettlementWhereInput = {
      machineType: machine,
      ...(startDate || endDate
        ? {
            settlementDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const periodSettlements = await prisma.settlement.findMany({
      where: settlementWhere,
      select: {
        finalMakingAmount: true,
        chargeableWeight: true,
        galaiLoss: true,
      },
    });

    let periodMakingGold = new Decimal(0);
    let periodSettlementMoney = new Decimal(0);
    let periodGalaiLoss = new Decimal(0);
    for (const s of periodSettlements) {
      periodGalaiLoss = periodGalaiLoss.plus(toDecimal(s.galaiLoss || 0));
      if (toDecimal(s.finalMakingAmount).isZero() && toDecimal(s.chargeableWeight).gt(0)) {
        periodMakingGold = periodMakingGold.plus(toDecimal(s.chargeableWeight));
      } else {
        periodSettlementMoney = periodSettlementMoney.plus(toDecimal(s.finalMakingAmount));
      }
    }

    const paymentWhere: Prisma.PaymentWhereInput = {
      settlement: { machineType: machine },
      ...(startDate || endDate
        ? {
            paymentDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const periodPayments = await prisma.payment.findMany({
      where: paymentWhere,
      select: { amount: true },
    });

    let periodMakingAmount = new Decimal(0);
    for (const p of periodPayments) {
      periodMakingAmount = periodMakingAmount.plus(toDecimal(p.amount));
    }

    if (periodMakingAmount.isZero() && periodSettlementMoney.gt(0)) {
      periodMakingAmount = periodSettlementMoney;
    }

    // 4. Recent transactions (latest 10)
    const recentTxns = await prisma.transaction.findMany({
      where: { machineType: machine },
      take: 10,
      orderBy: { transactionDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        karat: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      period: {
        range,
        label: periodLabel,
        fromDate: fromDateParam || (startDate ? startDate.toISOString().split('T')[0] : null),
        toDate: toDateParam || (endDate ? endDate.toISOString().split('T')[0] : null),
      },
      metrics: {
        periodIn: periodIn.toFixed(3),
        periodOut: periodOut.toFixed(3),
        periodDukanLoss: periodDukanLoss.toFixed(3),
        periodDollLoss: periodDollLoss.toFixed(3),
        periodMakingGold: periodMakingGold.toFixed(3),
        periodMakingAmount: periodMakingAmount.toFixed(2),
        periodGalaiLoss: periodGalaiLoss.toFixed(3),

        // Backward compatibility properties for existing UI consumers
        todayIn: periodIn.toFixed(3),
        todayOut: periodOut.toFixed(3),
        todayDukanLoss: periodDukanLoss.toFixed(3),
        todayDollLoss: periodDollLoss.toFixed(3),
        todayMakingGold: periodMakingGold.toFixed(3),
        todayMakingAmount: periodMakingAmount.toFixed(2),

        currentPendingWork: totalPendingWork.toFixed(3),
        totalDukanLoss: totalDukanLoss.toFixed(3),
        totalDollLoss: totalDollLoss.toFixed(3),
        totalGalaiLoss: totalGalaiLoss.toFixed(3),
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
