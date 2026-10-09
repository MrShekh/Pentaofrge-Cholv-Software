import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { Decimal, toDecimal } from '@/lib/decimal';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        accounts: {
          include: {
            karat: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Compute exact balances per karat from active transactions
    const karatAccountsData = await Promise.all(
      customer.accounts.map(async (acc) => {
        // Compute current active order metrics from unsettled transactions
        const txns = await prisma.transaction.findMany({
          where: {
            customerId: id,
            karatId: acc.karatId,
            status: TransactionStatus.ACTIVE,
            settlementId: null,
          },
          select: {
            type: true,
            weight: true,
            transactionDate: true,
          },
          orderBy: { transactionDate: 'desc' },
        });

        let totalIn = new Decimal(0);
        let totalOut = new Decimal(0);

        for (const t of txns) {
          const w = toDecimal(t.weight);
          if (t.type === TransactionType.IN || t.type === TransactionType.OPENING_BALANCE) {
            totalIn = totalIn.plus(w);
          } else if (t.type === TransactionType.OUT) {
            totalOut = totalOut.plus(w);
          }
        }

        const balance = totalIn.minus(totalOut);

        return {
          accountId: acc.id,
          karatId: acc.karatId,
          karatName: acc.karat.name,
          karatValue: acc.karat.value.toString(),
          defaultMakingRate: acc.karat.defaultMakingRate?.toString() || '0.00',
          totalIn: totalIn.toFixed(3),
          totalOut: totalOut.toFixed(3),
          totalAdjusted: '0.000',
          balance: balance.toFixed(3),
          lastTransactionDate: txns[0]?.transactionDate || null,
          transactionCount: txns.length,
        };
      })
    );

    // Compute overall customer pending stats
    let overallPendingGold = new Decimal(0);
    for (const ka of karatAccountsData) {
      const b = toDecimal(ka.balance);
      if (b.gt(0)) {
        overallPendingGold = overallPendingGold.plus(b);
      }
    }

    // Settlements
    const settlements = await prisma.settlement.findMany({
      where: {
        customerId: id,
      },
      orderBy: { settlementDate: 'desc' },
      include: {
        karat: { select: { id: true, name: true } },
        transactions: {
          where: { status: 'ACTIVE' },
          select: { id: true, type: true, weight: true, notes: true },
        },
      },
    });

    let overallOutstandingMaking = new Decimal(0);
    const formattedSettlements = settlements.map((s) => {
      overallOutstandingMaking = overallOutstandingMaking.plus(toDecimal(s.pendingAmount));

      const dukanLossTxn = s.transactions.find((t) => t.notes?.includes('(Dukan loss)'));
      const dukanLossWeight = dukanLossTxn ? toDecimal(dukanLossTxn.weight).toFixed(3) : '0.000';
      const dollLossTxn = s.transactions.find((t) => t.notes?.includes('(Doll loss)'));
      const dollLossWeight = dollLossTxn ? toDecimal(dollLossTxn.weight).toFixed(3) : '0.000';
      const returnTxn = s.transactions.find((t) => t.type === 'SETTLEMENT_RETURN');
      const returnedGoldWeight = returnTxn ? toDecimal(returnTxn.weight).toFixed(3) : '0.000';
      const makingTxn = s.transactions.find((t) => t.notes?.includes('(Making charge deducted in gold)'));
      const makingGoldWeight = makingTxn ? toDecimal(makingTxn.weight).toFixed(3) : '0.000';

      return {
        id: s.id,
        settlementNumber: s.settlementNumber,
        settlementDate: s.settlementDate,
        karatName: s.karat.name,
        karatId: s.karatId,
        totalInWeight: toDecimal(s.totalInWeight).toFixed(3),
        totalOutWeight: toDecimal(s.totalOutWeight).toFixed(3),
        settledWeight: toDecimal(s.settledWeight).toFixed(3),
        returnedGoldWeight,
        makingGoldWeight,
        dukanLossWeight,
        dollLossWeight,
        finalMakingAmount: toDecimal(s.finalMakingAmount).toFixed(2),
        paidAmount: toDecimal(s.paidAmount).toFixed(2),
        pendingAmount: toDecimal(s.pendingAmount).toFixed(2),
        paymentStatus: s.paymentStatus,
      };
    });

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        shopName: customer.shopName,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        address: customer.address,
        gstNumber: customer.gstNumber,
        notes: customer.notes,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      karatAccounts: karatAccountsData,
      settlements: formattedSettlements,
      summary: {
        totalActiveKaratAccounts: karatAccountsData.length,
        totalPendingGold: overallPendingGold.toFixed(3),
        totalOutstandingMaking: overallOutstandingMaking.toFixed(2),
        settlementCount: settlements.length,
      },
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.customer.findUniqueOrThrow({ where: { id } });

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        shopName: body.shopName !== undefined ? body.shopName?.trim() : existing.shopName,
        phone: body.phone?.trim() || existing.phone,
        whatsapp: body.whatsapp !== undefined ? body.whatsapp?.trim() : existing.whatsapp,
        address: body.address !== undefined ? body.address?.trim() : existing.address,
        gstNumber: body.gstNumber !== undefined ? body.gstNumber?.trim() : existing.gstNumber,
        notes: body.notes !== undefined ? body.notes?.trim() : existing.notes,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    await logAudit({
      userId: user.userId,
      username: user.username,
      action: 'UPDATE',
      entity: 'CUSTOMER',
      entityId: id,
      oldValue: { name: existing.name, phone: existing.phone },
      newValue: { name: updated.name, phone: updated.phone },
      reason: 'Customer profile updated',
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.customer.findUnique({
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

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Perform cascade delete safely in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete payments belonging to settlements of this customer
      await tx.payment.deleteMany({
        where: { settlement: { customerId: id } },
      });
      // 2. Delete transactions of this customer
      await tx.transaction.deleteMany({
        where: { customerId: id },
      });
      // 3. Delete settlements of this customer
      await tx.settlement.deleteMany({
        where: { customerId: id },
      });
      // 4. Delete customer karat accounts
      await tx.customerKaratAccount.deleteMany({
        where: { customerId: id },
      });
      // 5. Delete customer
      await tx.customer.delete({
        where: { id },
      });
    });

    await logAudit({
      userId: user.userId,
      username: user.username,
      action: 'DELETE',
      entity: 'CUSTOMER',
      entityId: id,
      oldValue: { name: existing.name, phone: existing.phone },
      reason: 'Customer profile deleted by user',
    });

    return NextResponse.json({
      success: true,
      message: `Customer "${existing.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
