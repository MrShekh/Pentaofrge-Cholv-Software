import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const { username, email, name, password, role } = body;

    if (!username || !email || !name || !password) {
      return NextResponse.json(
        { error: 'Username, Email, Name, and Password are required' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash,
        role: role === 'ADMIN' ? Role.ADMIN : Role.STAFF,
      },
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
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      newValue: { username: newUser.username, role: newUser.role },
      reason: 'New user account created by admin',
    });

    return NextResponse.json({ user: newUser });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
