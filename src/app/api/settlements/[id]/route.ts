import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { toDecimal } from '@/lib/decimal';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const [settlement, business] = await Promise.all([
      prisma.settlement.findUniqueOrThrow({
        where: { id },
        include: {
          customer: true,
          karat: true,
          createdBy: { select: { id: true, name: true, username: true } },
          payments: {
            orderBy: { paymentDate: 'asc' },
            include: { createdBy: { select: { id: true, name: true } } },
          },
          transactions: {
            where: { status: 'ACTIVE' },
            select: { id: true, type: true, weight: true, notes: true },
          },
        },
      }),
      prisma.business.findFirst(),
    ]);

    const dukanLossTxn = settlement.transactions.find((t) => t.notes?.includes('(Dukan loss)'));
    const dukanLossWeight = dukanLossTxn ? toDecimal(dukanLossTxn.weight).toFixed(3) : '0.000';
    const returnTxn = settlement.transactions.find((t) => t.type === 'SETTLEMENT_RETURN');
    const returnedGoldWeight = returnTxn
      ? toDecimal(returnTxn.weight).toFixed(3)
      : Math.max(
          0,
          toDecimal(settlement.settledWeight)
            .minus(toDecimal(settlement.chargeableWeight))
            .minus(toDecimal(dukanLossWeight))
            .toNumber()
        ).toFixed(3);

    return NextResponse.json({
      settlement: {
        id: settlement.id,
        settlementNumber: settlement.settlementNumber,
        customerId: settlement.customerId,
        customer: settlement.customer,
        karatId: settlement.karatId,
        karat: settlement.karat,
        fromDate: settlement.fromDate,
        toDate: settlement.toDate,
        settlementDate: settlement.settlementDate,
        totalInWeight: toDecimal(settlement.totalInWeight).toFixed(3),
        totalOutWeight: toDecimal(settlement.totalOutWeight).toFixed(3),
        remainingBefore: toDecimal(settlement.remainingBefore).toFixed(3),
        settlementAction: settlement.settlementAction,
        settledWeight: toDecimal(settlement.settledWeight).toFixed(3),
        returnedGoldWeight,
        dukanLossWeight,
        carryForwardWeight: toDecimal(settlement.carryForwardWeight).toFixed(3),
        finalRemainingBalance: toDecimal(settlement.finalRemainingBalance).toFixed(3),
        makingRate: toDecimal(settlement.makingRate).toFixed(2),
        chargeBasis: settlement.chargeBasis,
        chargeableWeight: toDecimal(settlement.chargeableWeight).toFixed(3),
        calculatedMakingAmount: toDecimal(settlement.calculatedMakingAmount).toFixed(2),
        discount: toDecimal(settlement.discount).toFixed(2),
        extraCharge: toDecimal(settlement.extraCharge).toFixed(2),
        finalMakingAmount: toDecimal(settlement.finalMakingAmount).toFixed(2),
        paymentStatus: settlement.paymentStatus,
        paidAmount: toDecimal(settlement.paidAmount).toFixed(2),
        pendingAmount: toDecimal(settlement.pendingAmount).toFixed(2),
        notes: settlement.notes,
        createdBy: settlement.createdBy,
        payments: settlement.payments.map((p) => ({
          id: p.id,
          amount: toDecimal(p.amount).toFixed(2),
          paymentDate: p.paymentDate,
          paymentMode: p.paymentMode,
          referenceNo: p.referenceNo,
          notes: p.notes,
          createdBy: p.createdBy,
        })),
      },
      business: business || {
        name: 'Penta Chool Works',
        ownerName: 'Kishorebhai Soni',
        phone: '+91 98765 43210',
        whatsapp: '+91 98765 43210',
        address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot, Gujarat',
        gstNumber: '24AAAAA0000A1Z5',
      },
    });
  } catch (error) {
    console.error('Error fetching settlement details:', error);
    return NextResponse.json({ error: 'Failed to fetch settlement receipt' }, { status: 500 });
  }
}
