import { AuditRepository } from './audit.repository.js';
import { AuditAction, AuditLogDTO } from '../../types/index.js';
import mongoose from 'mongoose';

export class AuditService {
  constructor(private auditRepo: AuditRepository = new AuditRepository()) {}

  async log(data: {
    organizationId: string | mongoose.Types.ObjectId;
    actorUserId?: string | mongoose.Types.ObjectId;
    actorUserName?: string;
    action: AuditAction;
    entityType: 'CUSTOMER' | 'TEST_REQUEST' | 'NOTIFICATION' | 'USER' | 'ORGANIZATION';
    entityId: string | mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.auditRepo.createLog(data);
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  async getRecentLogs(organizationId: string, limit: number = 50): Promise<AuditLogDTO[]> {
    const logs = await this.auditRepo.findByOrganization(organizationId, limit);
    return logs.map((l) => ({
      id: String(l._id),
      organizationId: String(l.organizationId),
      actorUserId: l.actorUserId ? String(l.actorUserId) : '',
      actorUserName: l.actorUserName,
      action: l.action,
      entityType: l.entityType,
      entityId: String(l.entityId),
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
