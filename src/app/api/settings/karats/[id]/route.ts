import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.karat.findUniqueOrThrow({ where: { id } });

    const updated = await prisma.karat.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        value:
          body.value !== undefined
            ? new Prisma.Decimal(parseFloat(body.value).toFixed(2))
            : existing.value,
        purityDescription:
          body.purityDescription !== undefined
            ? body.purityDescription?.trim()
            : existing.purityDescription,
        defaultMakingRate:
          body.defaultMakingRate !== undefined
            ? new Prisma.Decimal(parseFloat(body.defaultMakingRate).toFixed(2))
            : existing.defaultMakingRate,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    await logAudit({
      userId: user.userId,
      username: user.username,
      action: 'UPDATE',
      entity: 'KARAT',
      entityId: id,
      oldValue: { name: existing.name, rate: existing.defaultMakingRate?.toString() },
      newValue: { name: updated.name, rate: updated.defaultMakingRate?.toString() },
      reason: 'Karat grade settings updated',
    });

    return NextResponse.json({ karat: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update karat';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.karat.findUniqueOrThrow({
      where: { id },
      include: {
        _count: {
          select: {
            transactions: true,
            settlements: true,
          },
        },
      },
    });

    if (existing._count.transactions > 0 || existing._count.settlements > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete ${existing.name} because it has ${existing._count.transactions} transactions and ${existing._count.settlements} settlements associated with it. You can mark it inactive instead.`,
        },
        { status: 400 }
      );
    }

    // Delete customer karat accounts associated with this karat
    await prisma.customerKaratAccount.deleteMany({
      where: { karatId: id },
    });

    await prisma.karat.delete({
      where: { id },
    });

    await logAudit({
      userId: user.userId,
      username: user.username,
      action: 'DELETE',
      entity: 'KARAT',
      entityId: id,
      oldValue: { name: existing.name, value: existing.value.toString() },
      reason: 'Karat grade deleted by admin',
    });

    return NextResponse.json({
      success: true,
      message: `Karat grade ${existing.name} deleted successfully.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete karat';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
