import { NotificationRepository } from './notification.repository.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationDTO, NotificationStatus } from '../../types/index.js';
import { config } from '../../config/index.js';
import mongoose from 'mongoose';

export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository = new NotificationRepository(),
    private whatsAppService: WhatsAppService = new WhatsAppService(),
    private auditService: AuditService = new AuditService()
  ) {}

  setWhatsAppService(service: WhatsAppService): void {
    this.whatsAppService = service;
  }

  async dispatchTestResultWhatsApp(params: {
    organizationId: string;
    testRequestId: string;
    recipientPhone: string;
    customerName: string;
    tokenNumber: string;
    item: string;
    weight: number;
    weightUnit: string;
    testerValue: number;
    testerValueUnit?: string;
    karat?: number;
    actorUserId?: string;
    branch?: string;
  }): Promise<{ status: NotificationStatus; notificationId: string; errorMessage?: string }> {
    // 1. Create PENDING notification record in DB
    const notificationDoc = await this.notificationRepo.createNotification({
      organizationId: params.organizationId,
      testRequestId: params.testRequestId,
      channel: 'WHATSAPP',
      recipientPhone: params.recipientPhone,
      templateName: 'test_request_update',
      messagePayload: {
        customerName: params.customerName,
        tokenNumber: params.tokenNumber,
        item: params.item,
        weight: params.weight,
        testerValue: params.testerValue,
        karat: params.karat,
      },
      status: 'PENDING',
    });

    const notifId = String(notificationDoc._id);

    try {
      // 2. Attempt WhatsApp delivery via abstracted provider (with PDF Certificate link)
      let baseUrl = process.env.PUBLIC_REPORT_URL || config.apiBaseUrl || 'https://lab-saas-server.vercel.app';
      if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('lab-saas-client')) {
        baseUrl = 'https://lab-saas-server.vercel.app';
      }
      const branchParam = params.branch ? `?branch=${encodeURIComponent(params.branch)}` : '';
      const documentUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/public/certificates/${params.testRequestId}.pdf${branchParam}`;
      const documentFilename = `Assay_Certificate_${params.tokenNumber}.pdf`;

      const sendResult = await this.whatsAppService.sendTestResultNotification({
        to: params.recipientPhone,
        tokenNumber: params.tokenNumber,
        customerName: params.customerName,
        item: params.item,
        weight: params.weight,
        weightUnit: params.weightUnit,
        testerValue: params.testerValue,
        testerValueUnit: params.testerValueUnit,
        karat: params.karat,
        documentUrl,
        documentFilename,
        branch: params.branch,
      });

      if (sendResult.success) {
        // 3. Mark SENT
        await this.notificationRepo.updateStatus(notifId, 'SENT', {
          providerMessageId: sendResult.providerMessageId,
          sentAt: new Date(),
        });

        await this.auditService.log({
          organizationId: params.organizationId,
          actorUserId: params.actorUserId,
          action: 'WHATSAPP_SENT',
          entityType: 'NOTIFICATION',
          entityId: notifId,
          metadata: {
            testRequestId: params.testRequestId,
            providerMessageId: sendResult.providerMessageId,
            to: params.recipientPhone,
          },
        });

        return { status: 'SENT', notificationId: notifId };
      } else {
        // 4. Provider reported failure -> Mark FAILED without throwing (keeps request intact)
        await this.notificationRepo.updateStatus(notifId, 'FAILED', {
          errorMessage: sendResult.error,
        });

        await this.auditService.log({
          organizationId: params.organizationId,
          actorUserId: params.actorUserId,
          action: 'WHATSAPP_FAILED',
          entityType: 'NOTIFICATION',
          entityId: notifId,
          metadata: {
            testRequestId: params.testRequestId,
            error: sendResult.error,
            to: params.recipientPhone,
          },
        });

        return { status: 'FAILED', notificationId: notifId, errorMessage: sendResult.error };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown notification error';
      await this.notificationRepo.updateStatus(notifId, 'FAILED', {
        errorMessage: errMsg,
      });

      await this.auditService.log({
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: 'WHATSAPP_FAILED',
        entityType: 'NOTIFICATION',
        entityId: notifId,
        metadata: {
          testRequestId: params.testRequestId,
          error: errMsg,
          to: params.recipientPhone,
        },
      });

      return { status: 'FAILED', notificationId: notifId, errorMessage: errMsg };
    }
  }

  async getNotificationsForRequest(testRequestId: string): Promise<NotificationDTO[]> {
    const list = await this.notificationRepo.findByTestRequest(testRequestId);
    return list.map((n) => ({
      id: String(n._id),
      organizationId: String(n.organizationId),
      testRequestId: String(n.testRequestId),
      channel: n.channel,
      recipientPhone: n.recipientPhone,
      templateName: n.templateName,
      messagePayload: n.messagePayload,
      status: n.status,
      providerMessageId: n.providerMessageId,
      errorMessage: n.errorMessage,
      retryCount: n.retryCount,
      sentAt: n.sentAt?.toISOString(),
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }
}
