import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanIdentifier, mode: 'insensitive' } },
          { email: { equals: cleanIdentifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'This account has been deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: 'LOGIN',
      entity: 'USER',
      entityId: user.id,
      reason: 'User logged in successfully',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
