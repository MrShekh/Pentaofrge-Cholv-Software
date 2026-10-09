import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';
import { generateNextTransactionNumber } from '@/lib/ledger-service';

export async function GET(req: NextRequest) {
  try {
    await requireUser();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() || '';
    const activeOnly = searchParams.get('active') !== 'false';

    const where: Prisma.CustomerWhereInput = {
      ...(activeOnly ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { shopName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        accounts: {
          include: {
            karat: true,
          },
        },
        transactions: {
          where: { status: TransactionStatus.ACTIVE },
          orderBy: { transactionDate: 'desc' },
          take: 1,
          select: { transactionDate: true },
        },
        settlements: {
          where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
          select: { pendingAmount: true },
        },
      },
    });

    // Format customer summaries
    const data = customers.map((c) => {
      let totalPendingGold = new Decimal(0);
      let activeAccountsCount = 0;

      for (const acc of c.accounts) {
        const bal = toDecimal(acc.cachedBalance);
        if (bal.gt(0)) {
          totalPendingGold = totalPendingGold.plus(bal);
        }
        activeAccountsCount++;
      }

      let totalOutstandingMaking = new Decimal(0);
      for (const s of c.settlements) {
        totalOutstandingMaking = totalOutstandingMaking.plus(toDecimal(s.pendingAmount));
      }

      const lastTxDate = c.transactions[0]?.transactionDate || null;

      return {
        id: c.id,
        name: c.name,
        shopName: c.shopName,
        phone: c.phone,
        whatsapp: c.whatsapp,
        address: c.address,
        gstNumber: c.gstNumber,
        notes: c.notes,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        accounts: c.accounts.map((a) => ({
          id: a.id,
          karatId: a.karatId,
          karatName: a.karat.name,
          balance: toDecimal(a.cachedBalance).toFixed(3),
        })),
        totalPendingGold: totalPendingGold.toFixed(3),
        activeAccountsCount,
        totalOutstandingMaking: totalOutstandingMaking.toFixed(2),
        lastTransactionDate: lastTxDate,
      };
    });

    return NextResponse.json({ customers: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      name,
      shopName,
      phone,
      whatsapp,
      address,
      gstNumber,
      notes,
      openingBalances, // Array of { karatId: string, weight: number }
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Customer Name and Phone number are required' },
        { status: 400 }
      );
    }

    let customer;

    // Fast path: if no opening balances, create customer directly without interactive transaction
    if (!Array.isArray(openingBalances) || openingBalances.length === 0) {
      customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          shopName: shopName?.trim() || null,
          whatsapp: whatsapp?.trim() || phone.trim(),
          address: address?.trim() || null,
          gstNumber: gstNumber?.trim() || null,
          notes: notes?.trim() || null,
        },
      });
    } else {
      customer = await prisma.$transaction(
        async (tx) => {
          const newCustomer = await tx.customer.create({
            data: {
              name: name.trim(),
              phone: phone.trim(),
              shopName: shopName?.trim() || null,
              whatsapp: whatsapp?.trim() || phone.trim(),
              address: address?.trim() || null,
              gstNumber: gstNumber?.trim() || null,
              notes: notes?.trim() || null,
            },
          });

          for (const ob of openingBalances) {
            const w = toDecimal(ob.weight);
            if (w.gt(0)) {
              const karat = await tx.karat.findUnique({ where: { id: ob.karatId } });
              if (karat) {
                const account = await tx.customerKaratAccount.create({
                  data: {
                    customerId: newCustomer.id,
                    karatId: karat.id,
                    openingBalance: new Prisma.Decimal(w.toFixed(3)),
                    cachedBalance: new Prisma.Decimal(w.toFixed(3)),
                  },
                });

                const transactionNumber = await generateNextTransactionNumber(tx);
                await tx.transaction.create({
                  data: {
                    transactionNumber,
                    customerId: newCustomer.id,
                    karatId: karat.id,
                    accountId: account.id,
                    type: TransactionType.OPENING_BALANCE,
                    weight: new Prisma.Decimal(w.toFixed(3)),
                    transactionDate: new Date(),
                    notes: 'Opening balance recorded at customer registration',
                    status: TransactionStatus.ACTIVE,
                    createdById: user.userId,
                  },
                });
              }
            }
          }

          return newCustomer;
        },
        { timeout: 20000, maxWait: 10000 }
      );
    }

    // Log audit outside the transaction
    logAudit({
      userId: user.userId,
      username: user.username,
      action: 'CREATE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      newValue: { name: customer.name, phone: customer.phone },
      reason: 'Customer onboarded',
    }).catch((err) => console.error('Customer audit log failed:', err));

    return NextResponse.json({ customer });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
