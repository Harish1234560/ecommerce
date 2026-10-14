import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';

// Records an important admin action. Never throws — auditing must not break the action itself.
export async function audit(adminId: string, action: string, entity: string, entityId?: string | null, meta?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({ data: { adminId, action, entity, entityId: entityId ?? null, meta: meta ? (meta as object) : undefined } });
  } catch (err) {
    logger.error('Could not write audit log entry', err);
  }
}
