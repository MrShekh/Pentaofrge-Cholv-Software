import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { KarigarCashCategory, KarigarCashStatus, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const searchParams = req.nextUrl.searchParams;

    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category') as KarigarCashCategory | null;
    const status = searchParams.get('status') as KarigarCashStatus | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Prisma.KarigarCashWhereInput = {
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { karigarName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { entryNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [entries, business] = await Promise.all([
      prisma.karigarCash.findMany({
        where,
        orderBy: { date: 'desc' },
      }),
      prisma.business.findFirst(),
    ]);

    // Calculate summaries: Only ADVANCE is receivable/pending return. SALARY is paid expense.
    let totalPendingAdvance = 0;
    let totalAdvanceReceived = 0;
    let totalSalaryPaid = 0;
    let totalGiven = 0;

    entries.forEach((e) => {
      const amt = parseFloat(e.amount.toString());
      totalGiven += amt;

      if (e.category === 'ADVANCE') {
        if (e.status === 'GIVEN') {
          totalPendingAdvance += amt;
        } else if (e.status === 'RECEIVED') {
          totalAdvanceReceived += amt;
        }
      } else if (e.category === 'SALARY') {
        totalSalaryPaid += amt;
      }
    });

    const formattedEntries = entries.map((e) => ({
      id: e.id,
      entryNumber: e.entryNumber,
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
      entries: formattedEntries,
      business: business || {
        name: 'Penta Chool Works',
        ownerName: 'Kishorebhai Soni',
        phone: '+91 98765 43210',
        address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot, Gujarat',
      },
      summary: {
        totalPendingAdvance: totalPendingAdvance.toFixed(2),
        totalAdvanceReceived: totalAdvanceReceived.toFixed(2),
        totalSalaryPaid: totalSalaryPaid.toFixed(2),
        totalGiven: totalGiven.toFixed(2),
        count: entries.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching karigar cash entries:', error);
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

    const { karigarName, phone, category = 'ADVANCE', amount, date, notes } = body;

    if (!karigarName || typeof karigarName !== 'string' || !karigarName.trim()) {
      return NextResponse.json({ error: 'Karigar name is required' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const entryDate = date ? new Date(date) : new Date();

    // Generate unique entry number safely
    const lastEntry = await prisma.karigarCash.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { entryNumber: true },
    });

    let nextSeq = 1001;
    if (lastEntry?.entryNumber) {
      const match = lastEntry.entryNumber.match(/\d+/);
      if (match) {
        nextSeq = Math.max(nextSeq, parseInt(match[0], 10) + 1);
      }
    }

    const entryNumber = `KCR-${nextSeq}`;

    const newEntry = await prisma.karigarCash.create({
      data: {
        entryNumber,
        karigarName: karigarName.trim(),
        phone: phone ? phone.trim() : null,
        category: (category as KarigarCashCategory) || KarigarCashCategory.ADVANCE,
        amount: numAmount,
        date: entryDate,
        status: KarigarCashStatus.GIVEN,
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...newEntry,
        amount: parseFloat(newEntry.amount.toString()).toFixed(2),
      },
      message: `Cash entry ${entryNumber} recorded successfully`,
    });
  } catch (error: unknown) {
    console.error('Error creating karigar cash entry:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record entry' },
      { status: 500 }
    );
  }
}
