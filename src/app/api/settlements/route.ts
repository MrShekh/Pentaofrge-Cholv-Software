import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { settleCustomerAccount } from '@/lib/ledger-service';
import { SettlementAction, ChargeBasis, Prisma } from '@prisma/client';
import { toDecimal } from '@/lib/decimal';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const searchParams = req.nextUrl.searchParams;

    const customerId = searchParams.get('customerId');
    const karatId = searchParams.get('karatId');
    const paymentStatus = searchParams.get('paymentStatus');

    const where: Prisma.SettlementWhereInput = {
      ...(customerId ? { customerId } : {}),
      ...(karatId ? { karatId } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as Prisma.EnumPaymentStatusFilter['equals'] } : {}),
    };

    const settlements = await prisma.settlement.findMany({
      where,
      orderBy: { settlementDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, shopName: true, phone: true } },
        karat: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, username: true } },
        payments: true,
        transactions: {
          where: { status: 'ACTIVE' },
          select: { id: true, type: true, weight: true, notes: true },
        },
      },
    });

    return NextResponse.json({
      settlements: settlements.map((s) => {
        const dukanLossTxn = s.transactions.find((t) => t.notes?.includes('(Dukan loss)'));
        const dukanLossWeight = dukanLossTxn ? toDecimal(dukanLossTxn.weight).toFixed(3) : '0.000';
        const returnTxn = s.transactions.find((t) => t.type === 'SETTLEMENT_RETURN');
        const returnedGoldWeight = returnTxn
          ? toDecimal(returnTxn.weight).toFixed(3)
          : Math.max(
              0,
              toDecimal(s.settledWeight)
                .minus(toDecimal(s.chargeableWeight))
                .minus(toDecimal(dukanLossWeight))
                .toNumber()
            ).toFixed(3);

        return {
          id: s.id,
          settlementNumber: s.settlementNumber,
          customerId: s.customerId,
          customerName: s.customer.name,
          shopName: s.customer.shopName,
          karatId: s.karatId,
          karatName: s.karat.name,
          fromDate: s.fromDate,
          toDate: s.toDate,
          settlementDate: s.settlementDate,
          totalInWeight: toDecimal(s.totalInWeight).toFixed(3),
          totalOutWeight: toDecimal(s.totalOutWeight).toFixed(3),
          remainingBefore: toDecimal(s.remainingBefore).toFixed(3),
          settlementAction: s.settlementAction,
          settledWeight: toDecimal(s.settledWeight).toFixed(3),
          returnedGoldWeight,
          dukanLossWeight,
          carryForwardWeight: toDecimal(s.carryForwardWeight).toFixed(3),
          makingRate: toDecimal(s.makingRate).toFixed(2),
          chargeBasis: s.chargeBasis,
          chargeableWeight: toDecimal(s.chargeableWeight).toFixed(3),
          calculatedMakingAmount: toDecimal(s.calculatedMakingAmount).toFixed(2),
          discount: toDecimal(s.discount).toFixed(2),
          extraCharge: toDecimal(s.extraCharge).toFixed(2),
          finalMakingAmount: toDecimal(s.finalMakingAmount).toFixed(2),
          paymentStatus: s.paymentStatus,
          paidAmount: toDecimal(s.paidAmount).toFixed(2),
          pendingAmount: toDecimal(s.pendingAmount).toFixed(2),
          notes: s.notes,
          createdBy: s.createdBy,
          paymentCount: s.payments.length,
        };
      }),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching settlements:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      customerId,
      karatId,
      settleMode,
      makingGoldWeight,
      returnGoldWeight,
      dukanLossWeight,
      makingAmountMoney,
      paymentReceived,
      paymentMode,
      paymentReference,
      fromDate,
      toDate,
      settlementAction,
      settledWeight,
      makingRate,
      chargeBasis,
      manualWeight,
      discount,
      extraCharge,
      notes,
    } = body;

    if (!customerId || !karatId) {
      return NextResponse.json(
        { error: 'Customer and Karat are required' },
        { status: 400 }
      );
    }

    const result = await settleCustomerAccount({
      customerId,
      karatId,
      settleMode: (settleMode as 'GOLD' | 'MONEY') || 'GOLD',
      makingGoldWeight: makingGoldWeight !== undefined ? parseFloat(makingGoldWeight || '0') : undefined,
      returnGoldWeight: returnGoldWeight !== undefined ? parseFloat(returnGoldWeight || '0') : undefined,
      dukanLossWeight: dukanLossWeight !== undefined ? parseFloat(dukanLossWeight || '0') : 0,
      makingAmountMoney: makingAmountMoney !== undefined ? parseFloat(makingAmountMoney || '0') : undefined,
      paymentReceived: paymentReceived !== undefined ? parseFloat(paymentReceived || '0') : undefined,
      paymentMode: paymentMode || 'CASH',
      paymentReference: paymentReference?.trim() || null,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      settlementAction: settlementAction as SettlementAction,
      settledWeight: settledWeight !== undefined ? parseFloat(settledWeight || '0') : undefined,
      makingRate: makingRate !== undefined ? parseFloat(makingRate || '0') : undefined,
      chargeBasis: chargeBasis as ChargeBasis,
      manualWeight: manualWeight ? parseFloat(manualWeight) : undefined,
      discount: discount ? parseFloat(discount) : 0,
      extraCharge: extraCharge ? parseFloat(extraCharge) : 0,
      notes: notes?.trim() || null,
      createdById: user.userId,
    });

    return NextResponse.json({
      success: true,
      settlement: {
        id: result.settlement.id,
        settlementNumber: result.settlement.settlementNumber,
      },
      remainingBalance: result.remainingBalance.toFixed(3),
      message: `Settlement ${result.settlement.settlementNumber} completed successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to execute settlement';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
