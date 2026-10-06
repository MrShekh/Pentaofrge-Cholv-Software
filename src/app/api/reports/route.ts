import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const searchParams = req.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'customer-balance';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const customerId = searchParams.get('customerId');
    const karatId = searchParams.get('karatId');

    // 1. Customer Balance Report
    if (reportType === 'customer-balance' || reportType === 'outstanding') {
      const accounts = await prisma.customerKaratAccount.findMany({
        where: {
          customer: {
            isActive: true,
            ...(customerId ? { id: customerId } : {}),
          },
          ...(karatId ? { karatId } : {}),
        },
        include: {
          customer: true,
          karat: true,
        },
        orderBy: [{ customer: { name: 'asc' } }, { karat: { name: 'asc' } }],
      });

      const reportRows = await Promise.all(
        accounts.map(async (acc) => {
          const txns = await prisma.transaction.findMany({
            where: {
              customerId: acc.customerId,
              karatId: acc.karatId,
              status: TransactionStatus.ACTIVE,
            },
            select: { type: true, weight: true },
          });

          let totalIn = new Decimal(0);
          let totalOut = new Decimal(0);
          let totalSettlement = new Decimal(0);

          for (const t of txns) {
            const w = toDecimal(t.weight);
            if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
              totalIn = totalIn.plus(w);
            } else if (t.type === TransactionType.OUT) {
              totalOut = totalOut.plus(w);
            } else if (
              t.type === TransactionType.SETTLEMENT_RETURN ||
              t.type === TransactionType.SETTLEMENT_ADJUSTMENT
            ) {
              totalSettlement = totalSettlement.plus(w);
            }
          }

          const currentBalance = totalIn.minus(totalOut).minus(totalSettlement);

          return {
            customerId: acc.customerId,
            customerName: acc.customer.name,
            shopName: acc.customer.shopName,
            phone: acc.customer.phone,
            karatId: acc.karatId,
            karatName: acc.karat.name,
            totalIn: totalIn.toFixed(3),
            totalOut: totalOut.toFixed(3),
            totalSettlement: totalSettlement.toFixed(3),
            currentBalance: currentBalance.toFixed(3),
          };
        })
      );

      // Filter for outstanding report if requested
      const filteredRows =
        reportType === 'outstanding'
          ? reportRows.filter((r) => parseFloat(r.currentBalance) > 0)
          : reportRows;

      // Calculate totals
      let sumIn = new Decimal(0);
      let sumOut = new Decimal(0);
      let sumSettlement = new Decimal(0);
      let sumBalance = new Decimal(0);

      for (const r of filteredRows) {
        sumIn = sumIn.plus(toDecimal(r.totalIn));
        sumOut = sumOut.plus(toDecimal(r.totalOut));
        sumSettlement = sumSettlement.plus(toDecimal(r.totalSettlement));
        sumBalance = sumBalance.plus(toDecimal(r.currentBalance));
      }

      return NextResponse.json({
        reportType,
        rows: filteredRows,
        totals: {
          totalIn: sumIn.toFixed(3),
          totalOut: sumOut.toFixed(3),
          totalSettlement: sumSettlement.toFixed(3),
          currentBalance: sumBalance.toFixed(3),
          rowCount: filteredRows.length,
        },
      });
    }

    // 2. Daily Transaction Report
    if (reportType === 'daily-transactions') {
      const txns = await prisma.transaction.findMany({
        where: {
          status: TransactionStatus.ACTIVE,
          ...(customerId ? { customerId } : {}),
          ...(karatId ? { karatId } : {}),
          ...(dateFrom || dateTo
            ? {
                transactionDate: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
              }
            : {}),
        },
        orderBy: { transactionDate: 'desc' },
        include: {
          customer: true,
          karat: true,
        },
      });

      let totalIn = new Decimal(0);
      let totalOut = new Decimal(0);
      let totalSettlement = new Decimal(0);

      const rows = txns.map((t) => {
        const w = toDecimal(t.weight);
        let inWeight = '0.000';
        let outWeight = '0.000';
        let settleWeight = '0.000';

        if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
          inWeight = w.toFixed(3);
          totalIn = totalIn.plus(w);
        } else if (t.type === TransactionType.OUT) {
          outWeight = w.toFixed(3);
          totalOut = totalOut.plus(w);
        } else if (
          t.type === TransactionType.SETTLEMENT_RETURN ||
          t.type === TransactionType.SETTLEMENT_ADJUSTMENT
        ) {
          settleWeight = w.toFixed(3);
          totalSettlement = totalSettlement.plus(w);
        }

        return {
          id: t.id,
          date: t.transactionDate,
          customerName: t.customer.name,
          karatName: t.karat.name,
          type: t.type,
          inWeight,
          outWeight,
          settleWeight,
          notes: t.notes,
        };
      });

      return NextResponse.json({
        reportType,
        rows,
        totals: {
          totalIn: totalIn.toFixed(3),
          totalOut: totalOut.toFixed(3),
          totalSettlement: totalSettlement.toFixed(3),
          rowCount: rows.length,
        },
      });
    }

    // 3. Making Charges Report
    if (reportType === 'making-charges') {
      const settlements = await prisma.settlement.findMany({
        where: {
          ...(customerId ? { customerId } : {}),
          ...(karatId ? { karatId } : {}),
          ...(dateFrom || dateTo
            ? {
                settlementDate: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
                },
              }
            : {}),
        },
        orderBy: { settlementDate: 'desc' },
        include: {
          customer: true,
          karat: true,
        },
      });

      let sumChargeableWeight = new Decimal(0);
      let sumMakingAmount = new Decimal(0);
      let sumPaid = new Decimal(0);
      let sumPending = new Decimal(0);

      const rows = settlements.map((s) => {
        const cw = toDecimal(s.chargeableWeight);
        const ma = toDecimal(s.finalMakingAmount);
        const pd = toDecimal(s.paidAmount);
        const pn = toDecimal(s.pendingAmount);

        sumChargeableWeight = sumChargeableWeight.plus(cw);
        sumMakingAmount = sumMakingAmount.plus(ma);
        sumPaid = sumPaid.plus(pd);
        sumPending = sumPending.plus(pn);

        return {
          id: s.id,
          settlementNumber: s.settlementNumber,
          settlementDate: s.settlementDate,
          customerName: s.customer.name,
          karatName: s.karat.name,
          chargeableWeight: cw.toFixed(3),
          rate: toDecimal(s.makingRate).toFixed(2),
          chargeBasis: s.chargeBasis,
          makingAmount: ma.toFixed(2),
          paid: pd.toFixed(2),
          pending: pn.toFixed(2),
          paymentStatus: s.paymentStatus,
        };
      });

      return NextResponse.json({
        reportType,
        rows,
        totals: {
          totalChargeableWeight: sumChargeableWeight.toFixed(3),
          totalMakingAmount: sumMakingAmount.toFixed(2),
          totalPaid: sumPaid.toFixed(2),
          totalPending: sumPending.toFixed(2),
          rowCount: rows.length,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
