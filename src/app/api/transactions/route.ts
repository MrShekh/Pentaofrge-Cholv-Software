import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { createLedgerTransaction, getAccountLedgerSummary } from '@/lib/ledger-service';
import { TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { toDecimal } from '@/lib/decimal';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const searchParams = req.nextUrl.searchParams;

    const customerId = searchParams.get('customerId');
    const karatId = searchParams.get('karatId');
    const type = searchParams.get('type') as TransactionType | null;
    const status = searchParams.get('status') as TransactionStatus | null;
    const search = searchParams.get('search')?.trim();
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const where: Prisma.TransactionWhereInput = {
      ...(customerId ? { customerId } : {}),
      ...(karatId ? { karatId } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { customer: { shopName: { contains: search, mode: 'insensitive' } } },
              { transactionNumber: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            transactionDate: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          customer: { select: { id: true, name: true, shopName: true, phone: true } },
          karat: { select: { id: true, name: true, value: true } },
          createdBy: { select: { id: true, name: true, username: true } },
          voidedBy: { select: { id: true, name: true, username: true } },
          settlement: { select: { id: true, settlementNumber: true } },
        },
      }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        customerId: t.customerId,
        customerName: t.customer.name,
        shopName: t.customer.shopName,
        karatId: t.karatId,
        karatName: t.karat.name,
        type: t.type,
        weight: toDecimal(t.weight).toFixed(3),
        transactionDate: t.transactionDate,
        notes: t.notes,
        status: t.status,
        overrideAllowed: t.overrideAllowed,
        overrideReason: t.overrideReason,
        voidReason: t.voidReason,
        voidedAt: t.voidedAt,
        voidedBy: t.voidedBy,
        createdBy: t.createdBy,
        settlement: t.settlement,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      customerId,
      karatId,
      type,
      weight,
      transactionDate,
      notes,
      description,
      allowOverride,
      overrideReason,
    } = body;

    if (!customerId || !karatId || !type || weight === undefined) {
      return NextResponse.json(
        { error: 'Customer, Karat, Type, and Weight are required' },
        { status: 400 }
      );
    }

    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight <= 0) {
      return NextResponse.json(
        { error: 'Weight must be a positive number greater than 0' },
        { status: 400 }
      );
    }

    const result = await createLedgerTransaction({
      customerId,
      karatId,
      type: type as TransactionType,
      weight: numWeight,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      notes: notes?.trim() || null,
      description: description?.trim() || null,
      createdById: user.userId,
      allowOverride: Boolean(allowOverride),
      overrideReason: overrideReason?.trim() || null,
      userRole: user.role,
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        transactionNumber: result.transaction.transactionNumber,
        type: result.transaction.type,
        weight: toDecimal(result.transaction.weight).toFixed(3),
        customerName: result.transaction.customer.name,
        karatName: result.transaction.karat.name,
        date: result.transaction.transactionDate,
      },
      previousBalance: result.previousBalance.toFixed(3),
      newBalance: result.newBalance.toFixed(3),
      message: `${toDecimal(result.transaction.weight).toFixed(3)}g ${result.transaction.type} recorded for ${
        result.transaction.customer.name
      } — ${result.transaction.karat.name}.`,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Failed to record transaction';
    const isBalanceWarning = message.startsWith('INSUFFICIENT_BALANCE');

    return NextResponse.json(
      {
        error: message,
        isBalanceWarning,
      },
      { status: isBalanceWarning ? 409 : 400 }
    );
  }
}
