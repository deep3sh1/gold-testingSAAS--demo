import { NotificationModel, INotificationDocument } from './notification.model.js';
import mongoose from 'mongoose';
import { NotificationStatus } from '../../types/index.js';

export class NotificationRepository {
  async createNotification(data: {
    organizationId: string | mongoose.Types.ObjectId;
    testRequestId: string | mongoose.Types.ObjectId;
    channel?: 'WHATSAPP';
    recipientPhone: string;
    templateName: string;
    messagePayload: Record<string, unknown>;
    status?: NotificationStatus;
  }): Promise<INotificationDocument> {
    return NotificationModel.create({
      ...data,
      organizationId: new mongoose.Types.ObjectId(String(data.organizationId)),
      testRequestId: new mongoose.Types.ObjectId(String(data.testRequestId)),
    });
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    updateData: { providerMessageId?: string; errorMessage?: string; sentAt?: Date }
  ): Promise<INotificationDocument | null> {
    return NotificationModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          ...updateData,
        },
        $inc: { retryCount: status === 'FAILED' ? 1 : 0 },
      },
      { new: true }
    );
  }

  async findByTestRequest(testRequestId: string): Promise<INotificationDocument[]> {
    return NotificationModel.find({ testRequestId: new mongoose.Types.ObjectId(testRequestId) }).sort({
      createdAt: -1,
    });
  }
}
