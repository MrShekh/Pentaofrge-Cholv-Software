import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUniqueOrThrow({ where: { id } });

    // Protect last admin from being deactivated
    if (existing.role === Role.ADMIN && body.isActive === false) {
      const activeAdminCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the only active Administrator' },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: Role;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (body.name) updateData.name = body.name.trim();
    if (body.email) updateData.email = body.email.trim().toLowerCase();
    if (body.role && (body.role === 'ADMIN' || body.role === 'STAFF')) {
      updateData.role = body.role as Role;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: admin.userId,
      username: admin.username,
      action: 'UPDATE',
      entity: 'USER',
      entityId: id,
      newValue: { username: updated.username, role: updated.role, isActive: updated.isActive },
      reason: 'User account updated by admin',
    });

    return NextResponse.json({ user: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
