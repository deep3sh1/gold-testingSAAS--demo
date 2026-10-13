import { TestRequestRepository } from '../test-requests/test-request.repository.js';
import { TestRequestService } from '../test-requests/test-request.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AuditService } from '../audit/audit.service.js';
import { emitToOrganization } from '../../realtime/socket.js';
import { IngestReadingInput, MachineStationHeartbeatInput, CaptureReportInput } from './machine.types.js';
import { TestRequestDTO } from '../../types/index.js';
import { BadRequestError, NotFoundError } from '../../middleware/error.middleware.js';

export class MachineService {
  constructor(
    private testRequestRepo: TestRequestRepository = new TestRequestRepository(),
    private testRequestService: TestRequestService = new TestRequestService(),
    private notificationService: NotificationService = new NotificationService(),
    private auditService: AuditService = new AuditService()
  ) {}

  async ingestReading(
    organizationId: string,
    input: IngestReadingInput,
    actorUserId?: string
  ): Promise<{
    matched: boolean;
    testRequest?: TestRequestDTO;
    notificationStatus?: string;
    reading: IngestReadingInput;
  }> {
    if (!input.purityPercent || isNaN(input.purityPercent) || input.purityPercent < 0 || input.purityPercent > 100) {
      throw new BadRequestError('Invalid Gold purity percentage. Must be a number between 0 and 100.');
    }

    // Calculate Karat if not provided (e.g. 87.45% -> 20.988 Karat)
    const karat = input.karat !== undefined ? input.karat : Number(((input.purityPercent / 100) * 24).toFixed(2));

    // 1. Locate the target Test Request
    let targetDoc = null;

    if (input.tokenNumber) {
      targetDoc = await this.testRequestRepo.findByIdentifier(organizationId, input.tokenNumber);
    } else if (input.tagId) {
      targetDoc = await this.testRequestRepo.findByIdentifier(organizationId, input.tagId);
    }

    // If no direct token or tag specified, match the currently active claimed/waiting request for this branch
    const machineBranch = (input as any).branch;
    if (!targetDoc) {
      targetDoc = await this.testRequestRepo.findActiveWaitingOrTesting(organizationId, machineBranch);
    }

    const branch = targetDoc?.branch || machineBranch;

    // Emit live raw reading event to Web UI dashboard scoped to branch
    emitToOrganization(
      organizationId,
      'machine:reading-received' as any,
      {
        stationId: input.stationId,
        purityPercent: input.purityPercent,
        karat,
        elements: input.elements,
        tagId: input.tagId,
        tokenNumber: targetDoc?.tokenNumber || input.tokenNumber,
        matched: !!targetDoc,
        measuredAt: input.measuredAt || new Date().toISOString(),
      },
      branch
    );

    if (!targetDoc) {
      return {
        matched: false,
        reading: {
          ...input,
          karat,
        },
      };
    }

    const requestId = String(targetDoc._id);

    // 2. Complete the request automatically if autoComplete !== false
    const shouldAutoComplete = input.autoComplete !== false;

    if (shouldAutoComplete) {
      const completedDoc = await this.testRequestRepo.addReport(
        requestId,
        organizationId,
        {
          reportType: 'MACHINE_XRF',
          testerValue: input.purityPercent,
          testerValueUnit: '%',
          karat,
          elements: input.elements as Record<string, number>,
          readingNumber: input.readingNumber,
          stationId: input.stationId,
          submittedAt: new Date(),
        }
      );

      if (!completedDoc) {
        throw new NotFoundError('Unable to update test request with machine readings.');
      }

      const dto = this.testRequestService.toDTO(completedDoc);
      const isComplete = dto.status === 'SENT';

      // Audit Log
      await this.auditService.log({
        organizationId,
        actorUserId: actorUserId || 'SYSTEM_MACHINE_AGENT',
        actorUserName: `WinFTM (${input.stationId})`,
        action: 'TEST_REQUEST_REPORT_SUBMITTED',
        entityType: 'TEST_REQUEST',
        entityId: requestId,
        metadata: {
          reportType: 'MACHINE_XRF',
          tokenNumber: dto.tokenNumber,
          stationId: input.stationId,
          purityPercent: input.purityPercent,
          karat,
          tagId: input.tagId,
          newStatus: dto.status,
        },
      });

      // 3. Trigger WhatsApp Notification — Machine XRF Report
      const notifResult = await this.notificationService.dispatchTestResultWhatsApp({
        organizationId,
        testRequestId: requestId,
        recipientPhone: dto.phoneSnapshot,
        customerName: dto.customerNameSnapshot,
        tokenNumber: dto.tokenNumber,
        item: dto.item,
        weight: dto.weight,
        weightUnit: dto.weightUnit,
        testerValue: input.purityPercent,
        testerValueUnit: '%',
        karat,
        actorUserId: actorUserId || 'SYSTEM_MACHINE_AGENT',
        branch: dto.branch || 'kalyan',
      });

      // 4. Realtime Socket.IO notification scoped to branch (+ admins)
      emitToOrganization(
        organizationId,
        'test-request:report-submitted' as any,
        {
          requestId,
          reportType: 'MACHINE_XRF',
          testerValue: input.purityPercent,
          karat,
          newStatus: dto.status,
          submittedAt: new Date().toISOString(),
          notificationStatus: notifResult.status,
        },
        dto.branch
      );

      if (isComplete) {
        emitToOrganization(
          organizationId,
          'test-request:completed',
          {
            requestId,
            testerValue: input.purityPercent,
            completedAt: dto.completedAt || new Date().toISOString(),
            notificationStatus: notifResult.status,
          },
          dto.branch
        );
      }

      return {
        matched: true,
        testRequest: dto,
        notificationStatus: notifResult.status,
        reading: {
          ...input,
          karat,
        },
      };
    }

    return {
      matched: true,
      testRequest: this.testRequestService.toDTO(targetDoc),
      reading: {
        ...input,
        karat,
      },
    };
  }

  async recordHeartbeat(organizationId: string, heartbeat: MachineStationHeartbeatInput): Promise<void> {
    emitToOrganization(organizationId, 'machine:status' as any, {
      ...heartbeat,
      receivedAt: new Date().toISOString(),
    });
  }

  async getActiveTokenForBranch(
    organizationId: string,
    branch: string,
    tokenNumber?: string,
    businessDate?: string
  ): Promise<TestRequestDTO | null> {
    if (tokenNumber && tokenNumber.trim()) {
      const doc = await this.testRequestRepo.findByIdentifier(organizationId, tokenNumber.trim());
      if (doc) return this.testRequestService.toDTO(doc);
    }
    const doc = await this.testRequestRepo.findActiveWaitingOrTesting(organizationId, branch, businessDate);
    return doc ? this.testRequestService.toDTO(doc) : null;
  }

  async getTodayTokensForBranch(
    organizationId: string,
    branch: string,
    businessDate?: string
  ): Promise<TestRequestDTO[]> {
    const docs = await this.testRequestRepo.listTodayTokensForBranch(organizationId, branch, businessDate);
    return docs.map((d) => this.testRequestService.toDTO(d));
  }

  async captureReport(
    organizationId: string,
    input: CaptureReportInput,
    actorUserId?: string
  ): Promise<{
    success: boolean;
    testRequest: TestRequestDTO;
    notificationStatus?: string;
    message: string;
  }> {
    if (!input.reportImageBase64) {
      throw new BadRequestError('WinFTM report screenshot data is required.');
    }

    // 1. Locate the target Test Request
    let targetDoc = null;
    const branch = (input.branch || 'kalyan').toLowerCase().trim();

    if (input.testRequestId) {
      targetDoc = await this.testRequestRepo.findById(input.testRequestId, organizationId);
    } else if (input.tokenNumber) {
      targetDoc = await this.testRequestRepo.findByIdentifier(organizationId, input.tokenNumber);
    } else if (input.tagId) {
      targetDoc = await this.testRequestRepo.findByIdentifier(organizationId, input.tagId);
    }

    if (!targetDoc) {
      // Auto-match active claimed/waiting request for this branch
      targetDoc = await this.testRequestRepo.findActiveWaitingOrTesting(organizationId, branch);
    }

    if (!targetDoc) {
      throw new NotFoundError(`No active waiting or testing request found for branch "${branch}". Please verify customer token.`);
    }

    const requestId = String(targetDoc._id);
    const targetBranch = targetDoc.branch || branch;

    // Calculate karat if purityPercent is provided
    let karat = input.karat;
    if (input.purityPercent !== undefined && input.purityPercent !== null && input.purityPercent > 0 && !karat) {
      karat = Number(((input.purityPercent / 100) * 24).toFixed(2));
    }

    // 2. Save capture report and update status
    const updatedDoc = await this.testRequestRepo.saveCaptureReport(requestId, organizationId, {
      reportImageBase64: input.reportImageBase64,
      stationId: input.stationId,
      testerValue: input.purityPercent,
      karat,
      readingNumber: input.readingNumber,
    });

    if (!updatedDoc) {
      throw new NotFoundError('Failed to attach WinFTM screen report to test request.');
    }

    const dto = this.testRequestService.toDTO(updatedDoc);

    // 3. Audit Log
    await this.auditService.log({
      organizationId,
      actorUserId: actorUserId || 'SYSTEM_MACHINE_AGENT',
      actorUserName: `WinFTM Agent (${input.stationId || 'Desktop'})`,
      action: 'TEST_REQUEST_REPORT_SUBMITTED',
      entityType: 'TEST_REQUEST',
      entityId: requestId,
      metadata: {
        reportType: 'MACHINE_XRF_CAPTURE',
        tokenNumber: dto.tokenNumber,
        stationId: input.stationId,
        purityPercent: dto.testerValue,
        karat: dto.karat,
        branch: targetBranch,
      },
    });

    // 4. Trigger WhatsApp Notification with PDF Certificate link
    const notifResult = await this.notificationService.dispatchTestResultWhatsApp({
      organizationId,
      testRequestId: requestId,
      recipientPhone: dto.phoneSnapshot,
      customerName: dto.customerNameSnapshot,
      tokenNumber: dto.tokenNumber,
      item: dto.item,
      weight: dto.weight,
      weightUnit: dto.weightUnit,
      testerValue: dto.testerValue || 0,
      testerValueUnit: '%',
      karat: dto.karat,
      actorUserId: actorUserId || 'SYSTEM_MACHINE_AGENT',
      branch: targetBranch,
    });

    // 5. Emit live Socket.IO events to branch room
    emitToOrganization(
      organizationId,
      'test-request:report-submitted' as any,
      {
        requestId,
        reportType: 'MACHINE_XRF',
        testerValue: dto.testerValue,
        karat: dto.karat,
        newStatus: 'SENT',
        submittedAt: new Date().toISOString(),
        notificationStatus: notifResult.status,
      },
      targetBranch
    );

    emitToOrganization(
      organizationId,
      'test-request:completed' as any,
      {
        requestId,
        testerValue: dto.testerValue,
        completedAt: dto.completedAt || new Date().toISOString(),
        notificationStatus: notifResult.status,
      },
      targetBranch
    );

    return {
      success: true,
      testRequest: dto,
      notificationStatus: notifResult.status,
      message: `WinFTM capture successfully attached to ${dto.tokenNumber} and sent via WhatsApp to ${dto.customerNameSnapshot}`,
    };
  }
}
