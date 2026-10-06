import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { toDecimal } from '@/lib/decimal';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    await requireUser();
    const karats = await prisma.karat.findMany({
      orderBy: [{ displayOrder: 'asc' }, { value: 'desc' }],
    });

    return NextResponse.json({
      karats: karats.map((k) => ({
        id: k.id,
        name: k.name,
        value: toDecimal(k.value).toFixed(2),
        purityDescription: k.purityDescription,
        defaultMakingRate: toDecimal(k.defaultMakingRate).toFixed(2),
        isPredefined: k.isPredefined,
        isActive: k.isActive,
        displayOrder: k.displayOrder,
      })),
    });
  } catch (error) {
    console.error('Error fetching karats:', error);
    return NextResponse.json({ error: 'Failed to fetch karats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();

    const { name, value, purityDescription, defaultMakingRate, isActive } = body;

    if (!name || value === undefined) {
      return NextResponse.json({ error: 'Name and Karat value are required' }, { status: 400 });
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json({ error: 'Valid positive karat value required' }, { status: 400 });
    }

    const count = await prisma.karat.count();

    const karat = await prisma.karat.create({
      data: {
        name: name.trim(),
        value: new Prisma.Decimal(numValue.toFixed(2)),
        purityDescription: purityDescription?.trim() || null,
        defaultMakingRate: defaultMakingRate
          ? new Prisma.Decimal(parseFloat(defaultMakingRate).toFixed(2))
          : new Prisma.Decimal(0),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        displayOrder: count + 1,
      },
    });

    await logAudit({
      userId: user.userId,
      username: user.username,
      action: 'CREATE',
      entity: 'KARAT',
      entityId: karat.id,
      newValue: { name: karat.name, value: karat.value.toString() },
      reason: 'New Karat grade added',
    });

    return NextResponse.json({ karat });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create karat';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
