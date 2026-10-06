import { prisma } from './prisma';

export interface AuditLogParams {
  userId?: string;
  username?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'SETTLE' | 'LOGIN' | 'SETTINGS_UPDATE' | 'PASSWORD_RESET';
  entity: 'CUSTOMER' | 'TRANSACTION' | 'SETTLEMENT' | 'KARAT' | 'SETTINGS' | 'USER' | 'PAYMENT' | 'BUSINESS';
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        username: params.username,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        reason: params.reason,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
