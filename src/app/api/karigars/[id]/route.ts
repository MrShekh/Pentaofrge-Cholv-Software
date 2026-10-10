import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const [karigar, business] = await Promise.all([
      prisma.karigar.findUnique({
        where: { id },
        include: {
          cashEntries: {
            orderBy: { date: 'desc' },
          },
        },
      }),
      prisma.business.findFirst(),
    ]);

    if (!karigar) {
      return NextResponse.json({ error: 'Karigar not found' }, { status: 404 });
    }

    let pendingAdvance = 0;
    let advanceReceived = 0;
    let advanceGiven = 0;
    let salaryPaid = 0;

    karigar.cashEntries.forEach((entry) => {
      const amt = parseFloat(entry.amount.toString());
      if (entry.category === 'ADVANCE') {
        advanceGiven += amt;
        if (entry.status === 'GIVEN') {
          pendingAdvance += amt;
        } else if (entry.status === 'RECEIVED') {
          advanceReceived += amt;
        }
      } else if (entry.category === 'SALARY') {
        salaryPaid += amt;
      }
    });

    const formattedEntries = karigar.cashEntries.map((e) => ({
      id: e.id,
      entryNumber: e.entryNumber,
      karigarId: e.karigarId,
      karigarName: e.karigarName,
      phone: e.phone || '',
      category: e.category,
      amount: parseFloat(e.amount.toString()).toFixed(2),
      date: e.date.toISOString(),
      status: e.status,
      settledAt: e.settledAt ? e.settledAt.toISOString() : null,
      notes: e.notes || '',
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({
      karigar: {
        id: karigar.id,
        name: karigar.name,
        phone: karigar.phone || '',
        notes: karigar.notes || '',
        createdAt: karigar.createdAt.toISOString(),
      },
      cashEntries: formattedEntries,
      summary: {
        totalPendingAdvance: pendingAdvance.toFixed(2),
        totalAdvanceGiven: advanceGiven.toFixed(2),
        totalAdvanceReceived: advanceReceived.toFixed(2),
        totalSalaryPaid: salaryPaid.toFixed(2),
        entriesCount: formattedEntries.length,
      },
      business: business || {
        name: 'Penta Chool Works',
        ownerName: 'Kishorebhai Soni',
        phone: '+91 98765 43210',
        address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot, Gujarat',
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching karigar file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { name, phone, notes } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;
    if (notes !== undefined) dataToUpdate.notes = notes ? notes.trim() : null;

    const updated = await prisma.karigar.update({
      where: { id },
      data: dataToUpdate,
    });

    // Also update karigarName/phone in linked cashEntries if name/phone changed
    if (dataToUpdate.name || dataToUpdate.phone !== undefined) {
      await prisma.karigarCash.updateMany({
        where: { karigarId: id },
        data: {
          ...(dataToUpdate.name ? { karigarName: updated.name } : {}),
          ...(dataToUpdate.phone !== undefined ? { phone: updated.phone } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      karigar: updated,
      message: 'Karigar details updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating karigar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update karigar' },
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

    // Delete karigar and all their cashEntries
    await prisma.$transaction([
      prisma.karigarCash.deleteMany({
        where: { karigarId: id },
      }),
      prisma.karigar.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Karigar and all associated cash records deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting karigar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete karigar' },
      { status: 500 }
    );
  }
}
