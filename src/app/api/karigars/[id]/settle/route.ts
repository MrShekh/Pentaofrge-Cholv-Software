import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { KarigarCashCategory, KarigarCashStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();

    const {
      fromDate,
      toDate,
      months,
      monthlySalary,
      totalSalary,
      totalAdvanceGiven,
      difference,
      action = 'CLEAR_ZERO',
      notes,
    } = body;

    const karigar = await prisma.karigar.findUnique({
      where: { id },
    });

    if (!karigar) {
      return NextResponse.json({ error: 'Karigar not found' }, { status: 404 });
    }

    const parsedFromDate = fromDate ? new Date(fromDate) : karigar.joiningDate || karigar.createdAt;
    const parsedToDate = toDate ? new Date(toDate) : new Date();
    const numMonths = parseFloat(months) || 1;
    const numMonthlySalary = parseFloat(monthlySalary) || 0;
    const numTotalSalary = parseFloat(totalSalary) || numMonths * numMonthlySalary;
    const numTotalAdvance = parseFloat(totalAdvanceGiven) || 0;
    const numDifference = parseFloat(difference) || (numTotalAdvance - numTotalSalary);

    // Generate unique settlement sequence
    const lastSettlement = await prisma.karigarSettlement.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { settlementNumber: true },
    });

    let nextSeq = 1001;
    if (lastSettlement?.settlementNumber) {
      const match = lastSettlement.settlementNumber.match(/\d+/);
      if (match) {
        nextSeq = Math.max(nextSeq, parseInt(match[0], 10) + 1);
      }
    }
    const settlementNumber = `KSET-${nextSeq}`;

    // Execute atomic settlement in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create settlement record
      const settlement = await tx.karigarSettlement.create({
        data: {
          settlementNumber,
          karigarId: id,
          fromDate: parsedFromDate,
          toDate: parsedToDate,
          months: numMonths,
          monthlySalary: numMonthlySalary,
          totalSalary: numTotalSalary,
          totalAdvanceGiven: numTotalAdvance,
          difference: numDifference,
          settledAmount: numTotalSalary,
          carriedForward: action === 'CARRY_FORWARD' && numDifference > 0 ? numDifference : 0,
          action,
          notes: notes ? notes.trim() : null,
          settledAt: new Date(),
        },
      });

      // 2. Mark unsettled advances for this karigar up to toDate as settled
      await tx.karigarCash.updateMany({
        where: {
          karigarId: id,
          category: KarigarCashCategory.ADVANCE,
          status: KarigarCashStatus.GIVEN,
          date: { lte: parsedToDate },
        },
        data: {
          status: KarigarCashStatus.RECEIVED,
          settledAt: new Date(),
          karigarSettlementId: settlement.id,
        },
      });

      // 3. If action is CARRY_FORWARD and there's extra advance (difference > 0), create new advance entry
      let carryForwardEntry = null;
      if (action === 'CARRY_FORWARD' && numDifference > 0) {
        const lastEntry = await tx.karigarCash.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { entryNumber: true },
        });

        let nextEntrySeq = 1001;
        if (lastEntry?.entryNumber) {
          const match = lastEntry.entryNumber.match(/\d+/);
          if (match) {
            nextEntrySeq = Math.max(nextEntrySeq, parseInt(match[0], 10) + 1);
          }
        }
        const entryNumber = `KCR-${nextEntrySeq}`;

        carryForwardEntry = await tx.karigarCash.create({
          data: {
            entryNumber,
            karigarId: id,
            karigarName: karigar.name,
            phone: karigar.phone,
            category: KarigarCashCategory.ADVANCE,
            amount: numDifference,
            date: parsedToDate,
            status: KarigarCashStatus.GIVEN,
            notes: `Carried forward extra advance from settlement ${settlementNumber}`,
          },
        });
      }

      return { settlement, carryForwardEntry };
    });

    return NextResponse.json({
      success: true,
      settlement: result.settlement,
      carryForwardEntry: result.carryForwardEntry,
      message: `Settlement ${settlementNumber} completed successfully`,
    });
  } catch (error: unknown) {
    console.error('Error settling karigar account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to settle karigar account' },
      { status: 500 }
    );
  }
}
