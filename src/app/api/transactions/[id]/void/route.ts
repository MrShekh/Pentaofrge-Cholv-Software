import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { voidLedgerTransaction } from '@/lib/ledger-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { reason } = await req.json();

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'A reason is required to void a transaction' },
        { status: 400 }
      );
    }

    const result = await voidLedgerTransaction({
      transactionId: id,
      userId: user.userId,
      reason: reason.trim(),
      userRole: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction voided successfully',
      newBalance: result.newBalance.toFixed(3),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to void transaction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
