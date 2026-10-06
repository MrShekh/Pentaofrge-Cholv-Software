import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    await requireUser();
    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'Penta Chool Works',
          ownerName: 'Kishorebhai Soni',
          phone: '+91 98765 43210',
          whatsapp: '+91 98765 43210',
          email: 'info@pentachool.com',
          address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot, Gujarat',
          gstNumber: '24AAAAA0000A1Z5',
        },
      });
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Error fetching business settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();

    let business = await prisma.business.findFirst();
    if (!business) {
      business = await prisma.business.create({ data: {} });
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: body.name?.trim() || business.name,
        ownerName: body.ownerName?.trim() || business.ownerName,
        phone: body.phone?.trim() || business.phone,
        whatsapp: body.whatsapp?.trim() || business.whatsapp,
        email: body.email !== undefined ? body.email?.trim() : business.email,
        address: body.address?.trim() || business.address,
        gstNumber: body.gstNumber !== undefined ? body.gstNumber?.trim() : business.gstNumber,
        defaultCurrency: body.defaultCurrency || business.defaultCurrency,
        defaultWeightUnit: body.defaultWeightUnit || business.defaultWeightUnit,
      },
    });

    // Also update the current admin's user display name if ownerName was updated
    if (body.ownerName?.trim()) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { name: `${body.ownerName.trim()} (Admin)` },
      });
    }

    await logAudit({
      userId: user.userId,
      username: user.username,
      action: 'SETTINGS_UPDATE',
      entity: 'BUSINESS',
      entityId: updated.id,
      newValue: updated,
      reason: 'Business profile updated by admin',
    });

    return NextResponse.json({ success: true, business: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
