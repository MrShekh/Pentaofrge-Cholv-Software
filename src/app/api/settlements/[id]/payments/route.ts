import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { toDecimal } from '@/lib/decimal';
import { PaymentStatus, Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const { amount, paymentDate, paymentMode, referenceNo, notes } = body;
    const paymentAmount = toDecimal(amount);

    if (paymentAmount.lte(0)) {
      return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 });
    }

    const updatedSettlement = await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUniqueOrThrow({
        where: { id },
        include: { customer: true },
      });

      const currentPaid = toDecimal(settlement.paidAmount);
      const finalAmount = toDecimal(settlement.finalMakingAmount);
      const newPaid = currentPaid.plus(paymentAmount);
      const newPending = finalAmount.minus(newPaid);

      let newStatus = settlement.paymentStatus;
      if (newPaid.gte(finalAmount)) {
        newStatus = PaymentStatus.PAID;
      } else if (newPaid.gt(0)) {
        newStatus = PaymentStatus.PARTIAL;
      }

      await tx.payment.create({
        data: {
          settlementId: id,
          amount: new Prisma.Decimal(paymentAmount.toFixed(2)),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMode: paymentMode || 'CASH',
          referenceNo: referenceNo?.trim() || null,
          notes: notes?.trim() || null,
          createdById: user.userId,
        },
      });

      const updated = await tx.settlement.update({
        where: { id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid.toFixed(2)),
          pendingAmount: new Prisma.Decimal((newPending.lt(0) ? 0 : newPending).toFixed(2)),
          paymentStatus: newStatus,
        },
      });

      await logAudit({
        userId: user.userId,
        username: user.username,
        action: 'UPDATE',
        entity: 'PAYMENT',
        entityId: id,
        newValue: {
          settlementNumber: settlement.settlementNumber,
          customer: settlement.customer.name,
          paymentAdded: paymentAmount.toFixed(2),
          totalPaid: newPaid.toFixed(2),
          status: newStatus,
        },
        reason: 'Payment recorded against settlement',
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      settlement: updatedSettlement,
      message: `Payment of ₹${paymentAmount.toFixed(2)} recorded successfully.`,
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
