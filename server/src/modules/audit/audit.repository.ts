import { AuditLogModel, IAuditLogDocument } from './audit.model.js';
import mongoose from 'mongoose';
import { AuditAction } from '../../types/index.js';

export class AuditRepository {
  async createLog(data: {
    organizationId: string | mongoose.Types.ObjectId;
    actorUserId?: string | mongoose.Types.ObjectId;
    actorUserName?: string;
    action: AuditAction;
    entityType: 'CUSTOMER' | 'TEST_REQUEST' | 'NOTIFICATION' | 'USER' | 'ORGANIZATION';
    entityId: string | mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
  }): Promise<IAuditLogDocument> {
    const validActorId = data.actorUserId && mongoose.isValidObjectId(String(data.actorUserId))
      ? new mongoose.Types.ObjectId(String(data.actorUserId))
      : undefined;

    const validEntityId = data.entityId && mongoose.isValidObjectId(String(data.entityId))
      ? new mongoose.Types.ObjectId(String(data.entityId))
      : new mongoose.Types.ObjectId();

    return AuditLogModel.create({
      organizationId: new mongoose.Types.ObjectId(String(data.organizationId)),
      actorUserId: validActorId,
      actorUserName: data.actorUserName,
      action: data.action,
      entityType: data.entityType,
      entityId: validEntityId,
      metadata: data.metadata || {},
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findByOrganization(organizationId: string, limit: number = 50, skip: number = 0): Promise<any[]> {
    return AuditLogModel.find({ organizationId: new mongoose.Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findByEntity(organizationId: string, entityId: string): Promise<any[]> {
    return AuditLogModel.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      entityId: new mongoose.Types.ObjectId(entityId),
    })
      .sort({ createdAt: -1 })
      .lean();
  }
}
