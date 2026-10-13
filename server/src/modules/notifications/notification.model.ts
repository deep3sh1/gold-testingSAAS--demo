import mongoose, { Schema, Document } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '../../types/index.js';

export interface INotificationDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  testRequestId: mongoose.Types.ObjectId;
  channel: NotificationChannel;
  recipientPhone: string;
  templateName: string;
  messagePayload: Record<string, unknown>;
  status: NotificationStatus;
  providerMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    testRequestId: { type: Schema.Types.ObjectId, ref: 'TestRequest', required: true, index: true },
    channel: { type: String, enum: ['WHATSAPP'], default: 'WHATSAPP', required: true },
    recipientPhone: { type: String, required: true },
    templateName: { type: String, default: 'test_request_update' },
    messagePayload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    providerMessageId: { type: String },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
    sentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ organizationId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotificationDocument>('Notification', notificationSchema);
