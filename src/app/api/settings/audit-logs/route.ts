import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true, role: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
