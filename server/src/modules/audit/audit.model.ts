import mongoose, { Schema, Document } from 'mongoose';
import { AuditAction } from '../../types/index.js';

export interface IAuditLogDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  actorUserId?: mongoose.Types.ObjectId;
  actorUserName?: string;
  action: AuditAction;
  entityType: 'CUSTOMER' | 'TEST_REQUEST' | 'NOTIFICATION' | 'USER' | 'ORGANIZATION';
  entityId: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    actorUserName: { type: String, required: false },
    action: {
      type: String,
      required: true,
      enum: [
        'CUSTOMER_CREATED',
        'CUSTOMER_UPDATED',
        'TEST_REQUEST_CREATED',
        'TEST_REQUEST_CLAIMED',
        'TEST_REQUEST_VALUE_UPDATED',
        'TEST_REQUEST_SENT',
        'TEST_REQUEST_REPORT_SUBMITTED',
        'WHATSAPP_SENT',
        'WHATSAPP_FAILED',
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ['CUSTOMER', 'TEST_REQUEST', 'NOTIFICATION', 'USER', 'ORGANIZATION'],
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, entityId: 1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
