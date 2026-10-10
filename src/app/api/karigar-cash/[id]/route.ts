import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { KarigarCashStatus } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();

    const { status, notes, amount } = body;

    const dataToUpdate: Record<string, unknown> = {};

    if (status) {
      const existing = await prisma.karigarCash.findUnique({
        where: { id },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      }

      if (existing.category === 'SALARY' && status === KarigarCashStatus.RECEIVED) {
        return NextResponse.json(
          { error: 'Salary is given to karigar and cannot be received. Only advance is receivable.' },
          { status: 400 }
        );
      }

      dataToUpdate.status = status;
      if (status === KarigarCashStatus.RECEIVED) {
        dataToUpdate.settledAt = new Date();
      } else if (status === KarigarCashStatus.GIVEN) {
        dataToUpdate.settledAt = null;
      }
    }

    if (notes !== undefined) {
      dataToUpdate.notes = notes;
    }

    if (amount !== undefined && parseFloat(amount) > 0) {
      dataToUpdate.amount = parseFloat(amount);
    }

    const updated = await prisma.karigarCash.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...updated,
        amount: parseFloat(updated.amount.toString()).toFixed(2),
      },
      message:
        status === 'RECEIVED'
          ? 'Marked as Received / Settled'
          : 'Entry updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating karigar cash entry:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    await prisma.karigarCash.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting karigar cash entry:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete entry' },
      { status: 500 }
    );
  }
}
