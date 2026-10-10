import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim();

    const where: Prisma.KarigarWhereInput = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [karigars, business] = await Promise.all([
      prisma.karigar.findMany({
        where,
        include: {
          cashEntries: {
            orderBy: { date: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.business.findFirst(),
    ]);

    let overallPendingAdvance = 0;
    let overallAdvanceReceived = 0;
    let overallSalaryPaid = 0;

    const formattedKarigars = karigars.map((k) => {
      let pendingAdvance = 0;
      let advanceReceived = 0;
      let advanceGiven = 0;
      let salaryPaid = 0;

      k.cashEntries.forEach((entry) => {
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

      overallPendingAdvance += pendingAdvance;
      overallAdvanceReceived += advanceReceived;
      overallSalaryPaid += salaryPaid;

      const lastTx = k.cashEntries[0];

      return {
        id: k.id,
        name: k.name,
        phone: k.phone || '',
        notes: k.notes || '',
        totalPendingAdvance: pendingAdvance.toFixed(2),
        totalAdvanceGiven: advanceGiven.toFixed(2),
        totalAdvanceReceived: advanceReceived.toFixed(2),
        totalSalaryPaid: salaryPaid.toFixed(2),
        entriesCount: k.cashEntries.length,
        lastTransactionDate: lastTx ? lastTx.date.toISOString() : null,
      };
    });

    return NextResponse.json({
      karigars: formattedKarigars,
      summary: {
        totalPendingAdvance: overallPendingAdvance.toFixed(2),
        totalAdvanceReceived: overallAdvanceReceived.toFixed(2),
        totalSalaryPaid: overallSalaryPaid.toFixed(2),
        totalKarigars: karigars.length,
      },
      business: business || {
        name: 'Penta Chool Works',
        ownerName: 'Kishorebhai Soni',
        phone: '+91 98765 43210',
        address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot, Gujarat',
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching karigars:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const { name, phone, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Karigar name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existing = await prisma.karigar.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        // Reactivate
        const reactivated = await prisma.karigar.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            phone: phone ? phone.trim() : existing.phone,
            notes: notes ? notes.trim() : existing.notes,
          },
        });
        return NextResponse.json({
          success: true,
          karigar: reactivated,
          message: 'Karigar account restored',
        });
      }
      return NextResponse.json(
        { error: 'A Karigar with this name already exists' },
        { status: 400 }
      );
    }

    const karigar = await prisma.karigar.create({
      data: {
        name: trimmedName,
        phone: phone ? phone.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      karigar,
      message: 'Karigar added successfully',
    });
  } catch (error: unknown) {
    console.error('Error creating karigar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
