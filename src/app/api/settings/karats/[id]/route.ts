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
