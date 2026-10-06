import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();
    if (!identifier) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    const clean = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: 'insensitive' } },
          { username: { equals: clean, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      // Return success anyway to avoid user enumeration
      return NextResponse.json({
        success: true,
        message: 'If the account exists, password reset instructions have been generated.',
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: 'PASSWORD_RESET',
      entity: 'USER',
      entityId: user.id,
      reason: 'Password reset token generated',
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully.',
      // For easy testing / development in local mode:
      devResetLink: `/reset-password?token=${token}`,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
