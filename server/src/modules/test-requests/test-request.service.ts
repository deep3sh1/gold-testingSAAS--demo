import { TestRequestRepository } from './test-request.repository.js';
import { CustomerService } from '../customers/customer.service.js';
import { DailyTokenService } from '../daily-tokens/daily-token.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AuditService } from '../audit/audit.service.js';
import { OrganizationRepository } from '../organizations/organization.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { emitToOrganization } from '../../realtime/socket.js';
import { TestRequestDTO, TestRequestStatus, ReportType, ReportEntry } from '../../types/index.js';
import { parseTesterNumericValue, normalizeBranchKey } from '../../shared/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../middleware/error.middleware.js';

export class TestRequestService {
  constructor(
    private testRequestRepo: TestRequestRepository = new TestRequestRepository(),
    private customerService: CustomerService = new CustomerService(),
    private dailyTokenService: DailyTokenService = new DailyTokenService(),
    private notificationService: NotificationService = new NotificationService(),
    private auditService: AuditService = new AuditService(),
    private orgRepo: OrganizationRepository = new OrganizationRepository(),
    private userRepo: UserRepository = new UserRepository()
  ) {}

  setNotificationService(service: NotificationService): void {
    this.notificationService = service;
  }

  async createTestRequest(
    organizationId: string,
    createdByUserId: string,
    createdByName: string,
    data: {
      customerId?: string;
      customerName: string;
      jewellerName?: string;
      phone: string;
      item: string;
      metalType?: 'GOLD' | 'SILVER';
      weight: number;
      weightUnit?: string;
      branch?: string;
    }
  ): Promise<TestRequestDTO> {
    const creatorUser = await this.userRepo.findById(createdByUserId);
    const rawBranch = (data as any)?.branch || (creatorUser as any)?.branch || 'kalyan';
    const branch = normalizeBranchKey(rawBranch);

    // 1. Ensure Customer entity exists & retrieve canonical snapshot (scoped to branch)
    const customer = await this.customerService.getOrCreateCustomer(
      organizationId,
      {
        name: data.customerName,
        phone: data.phone,
        jewellerName: data.jewellerName,
        branch,
      },
      createdByUserId
    );

    // 2. Atomically generate daily token for this specific branch
    const { tokenNumber, businessDate } = await this.dailyTokenService.generateToken(
      organizationId,
      branch
    );

    // 4. Create Test Request in WAITING status
    const createdDoc = await this.testRequestRepo.create({
      organizationId,
      tokenNumber,
      businessDate,
      customerId: customer.id,
      customerNameSnapshot: customer.name,
      jewellerName: data.jewellerName?.trim() || customer.jewellerName || '',
      phoneSnapshot: customer.phone,
      item: data.item,
      metalType: data.metalType || 'GOLD',
      weight: data.weight,
      weightUnit: data.weightUnit || 'g',
      createdBy: createdByUserId,
      branch,
    });

    const dto = this.toDTO(createdDoc, createdByName);

    // 5. Emit realtime Socket.IO event scoped to this branch (+ tenant admins)
    emitToOrganization(organizationId, 'test-request:created', dto, dto.branch);

    // 6. Audit Log
    await this.auditService.log({
      organizationId,
      actorUserId: createdByUserId,
      actorUserName: createdByName,
      action: 'TEST_REQUEST_CREATED',
      entityType: 'TEST_REQUEST',
      entityId: String(createdDoc._id),
      metadata: {
        tokenNumber,
        customerId: customer.id,
        item: data.item,
        weight: data.weight,
      },
    });

    return dto;
  }

  async claimRequest(
    requestId: string,
    organizationId: string,
    testerUserId: string,
    testerName: string
  ): Promise<TestRequestDTO> {
    // Attempt atomic transition from WAITING -> TESTING
    const claimedDoc = await this.testRequestRepo.atomicClaim(requestId, organizationId, testerUserId);

    if (!claimedDoc) {
      // Check whether request exists at all or was claimed by someone else
      const existing = await this.testRequestRepo.findById(requestId, organizationId);
      if (!existing) {
        throw new NotFoundError('Test request not found');
      }
      throw new ConflictError(
        'Request has already been taken by another tester or is no longer in waiting state.'
      );
    }

    const dto = this.toDTO(claimedDoc);

    // Realtime notification to other testers in this branch to lock / update card
    emitToOrganization(
      organizationId,
      'test-request:claimed',
      {
        requestId,
        testerId: testerUserId,
        testerName,
        claimedAt: dto.claimedAt || new Date().toISOString(),
      },
      dto.branch
    );

    // Audit log
    await this.auditService.log({
      organizationId,
      actorUserId: testerUserId,
      actorUserName: testerName,
      action: 'TEST_REQUEST_CLAIMED',
      entityType: 'TEST_REQUEST',
      entityId: requestId,
      metadata: { tokenNumber: dto.tokenNumber },
    });

    return dto;
  }

  /**
   * Submit a single typed report (MANUAL or MACHINE_XRF) for a request.
   * After first report: status → PARTIAL (request stays open for second report).
   * After second report (both types present): status → SENT, WhatsApp dispatched for both.
   */
  async submitReport(
    requestId: string,
    organizationId: string,
    actorUserId: string,
    actorName: string,
    data: {
      reportType: ReportType;
      testerValue: number;
      testerValueUnit?: string;
      karat?: number;
      elements?: Record<string, number>;
      stationId?: string;
    }
  ): Promise<{ testRequest: TestRequestDTO; isComplete: boolean; notificationStatus?: string }> {
    const parsedValue = parseTesterNumericValue(data.testerValue);
    if (parsedValue === null) {
      throw new BadRequestError('Tester value must be a valid finite number');
    }

    // Compute karat if not provided
    const karat = data.karat !== undefined
      ? data.karat
      : Number(((parsedValue / 100) * 24).toFixed(2));

    const updatedDoc = await this.testRequestRepo.addReport(requestId, organizationId, {
      reportType: data.reportType,
      testerValue: parsedValue,
      testerValueUnit: data.testerValueUnit || '%',
      karat,
      elements: data.elements,
      stationId: data.stationId,
      submittedAt: new Date(),
    });

    if (!updatedDoc) {
      const existing = await this.testRequestRepo.findById(requestId, organizationId);
      if (!existing) throw new NotFoundError('Test request not found');
      throw new ConflictError(`Cannot add report for request with status '${existing.status}'`);
    }

    const dto = this.toDTO(updatedDoc);
    const isComplete = dto.status === 'SENT';

    // Audit log for this report submission
    await this.auditService.log({
      organizationId,
      actorUserId,
      actorUserName: actorName,
      action: 'TEST_REQUEST_REPORT_SUBMITTED',
      entityType: 'TEST_REQUEST',
      entityId: requestId,
      metadata: {
        reportType: data.reportType,
        testerValue: parsedValue,
        karat,
        tokenNumber: dto.tokenNumber,
        newStatus: dto.status,
      },
    });

    // Dispatch WhatsApp — one message per report (so customer gets 2 messages total)
    const notifResult = await this.notificationService.dispatchTestResultWhatsApp({
      organizationId,
      testRequestId: requestId,
      recipientPhone: dto.phoneSnapshot,
      customerName: dto.customerNameSnapshot,
      tokenNumber: dto.tokenNumber,
      item: dto.item,
      weight: dto.weight,
      weightUnit: dto.weightUnit,
      testerValue: parsedValue,
      testerValueUnit: data.testerValueUnit || '%',
      karat,
      actorUserId,
      branch: (dto as any).branch || 'kalyan',
      // Pass report type as metadata so notification template can vary
      ...(data.reportType ? { reportType: data.reportType } : {}),
    });

    // Real-time socket event scoped to branch
    emitToOrganization(
      organizationId,
      'test-request:report-submitted' as any,
      {
        requestId,
        reportType: data.reportType,
        testerValue: parsedValue,
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
          testerValue: parsedValue,
          completedAt: dto.completedAt || new Date().toISOString(),
          notificationStatus: notifResult.status,
        },
        dto.branch
      );
    }

    return {
      testRequest: dto,
      isComplete,
      notificationStatus: notifResult.status,
    };
  }

  async submitTesterValueAndSend(
    requestId: string,
    organizationId: string,
    testerUserId: string,
    testerName: string,
    data: { testerValue: number; testerValueUnit?: string }
  ): Promise<{ testRequest: TestRequestDTO; notificationStatus: string }> {
    const parsedValue = parseTesterNumericValue(data.testerValue);
    if (parsedValue === null) {
      throw new BadRequestError('Tester value must be a valid finite number');
    }

    // Check if test request exists to determine metalType and permissions
    const existing = await this.testRequestRepo.findById(requestId, organizationId);
    if (!existing) {
      throw new NotFoundError('Test request not found');
    }
    if (existing.status !== 'TESTING') {
      throw new ConflictError(`Cannot submit value for request with status '${existing.status}'`);
    }
    if (String(existing.assignedTesterId?._id || existing.assignedTesterId) !== testerUserId) {
      throw new ConflictError('You are not assigned to this test request.');
    }

    // Auto-compute Karat in backend: (purity % * 24) / 100 for Gold, null for Silver
    const isSilver = existing.metalType === 'SILVER';
    const computedKarat = isSilver ? null : Number(((parsedValue / 100) * 24).toFixed(2));

    // 1. Atomically transition from TESTING -> SENT
    const completedDoc = await this.testRequestRepo.atomicSubmitValue(
      requestId,
      organizationId,
      testerUserId,
      parsedValue,
      data.testerValueUnit || '%',
      computedKarat ?? undefined
    );

    if (!completedDoc) {
      throw new ConflictError('Failed to complete test request.');
    }

    const dto = this.toDTO(completedDoc);

    // 2. Audit tester value update
    await this.auditService.log({
      organizationId,
      actorUserId: testerUserId,
      actorUserName: testerName,
      action: 'TEST_REQUEST_VALUE_UPDATED',
      entityType: 'TEST_REQUEST',
      entityId: requestId,
      metadata: { testerValue: parsedValue, karat: computedKarat, tokenNumber: dto.tokenNumber },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: testerUserId,
      actorUserName: testerName,
      action: 'TEST_REQUEST_SENT',
      entityType: 'TEST_REQUEST',
      entityId: requestId,
      metadata: { tokenNumber: dto.tokenNumber },
    });

    // 3. Dispatch WhatsApp Notification (Non-blocking: failure will not rollback test request)
    const notifResult = await this.notificationService.dispatchTestResultWhatsApp({
      organizationId,
      testRequestId: requestId,
      recipientPhone: dto.phoneSnapshot,
      customerName: dto.customerNameSnapshot,
      tokenNumber: dto.tokenNumber,
      item: dto.item,
      weight: dto.weight,
      weightUnit: dto.weightUnit,
      testerValue: parsedValue,
      testerValueUnit: dto.testerValueUnit,
      actorUserId: testerUserId,
      branch: (dto as any).branch || 'kalyan',
    });

    // 4. Realtime Socket.IO notification scoped to branch (+ admins)
    emitToOrganization(
      organizationId,
      'test-request:completed',
      {
        requestId,
        testerValue: parsedValue,
        completedAt: dto.completedAt || new Date().toISOString(),
        notificationStatus: notifResult.status,
      },
      dto.branch
    );

    return {
      testRequest: dto,
      notificationStatus: notifResult.status,
    };
  }

  async getById(requestId: string, organizationId: string): Promise<TestRequestDTO> {
    const doc = await this.testRequestRepo.findById(requestId, organizationId);
    if (!doc) {
      throw new NotFoundError('Test request not found');
    }
    return this.toDTO(doc);
  }

  async queryRequests(
    organizationId: string,
    params: {
      search?: string;
      date?: string;
      status?: TestRequestStatus | 'ALL';
      branch?: string;
      limit?: number;
      page?: number;
    }
  ): Promise<{ items: TestRequestDTO[]; total: number }> {
    const { items, total } = await this.testRequestRepo.searchAndFilter(organizationId, params);
    return {
      items: items.map((doc) => this.toDTO(doc)),
      total,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public toDTO(doc: any, fallbackCreatedByName?: string): TestRequestDTO {
    // Build dual-report convenience fields
    const reports: ReportEntry[] = (doc.reports || []).map((r: any) => ({
      reportType: r.reportType,
      testerValue: r.testerValue,
      testerValueUnit: r.testerValueUnit || '%',
      karat: r.karat,
      elements: r.elements,
      readingNumber: r.readingNumber,
      stationId: r.stationId,
      submittedAt: r.submittedAt instanceof Date ? r.submittedAt.toISOString() : String(r.submittedAt),
      notificationStatus: r.notificationStatus,
    }));

    const manualReport = reports.find((r) => r.reportType === 'MANUAL');
    const machineReport = reports.find((r) => r.reportType === 'MACHINE_XRF');

    return {
      id: String(doc._id),
      organizationId: String(doc.organizationId),
      tokenNumber: doc.tokenNumber,
      tagId: doc.tagId,
      businessDate: doc.businessDate,
      customerId: String(doc.customerId?._id || doc.customerId),
      customerNameSnapshot: doc.customerNameSnapshot,
      jewellerName: doc.jewellerName || '',
      phoneSnapshot: doc.phoneSnapshot,
      item: doc.item,
      metalType: (doc.metalType as 'GOLD' | 'SILVER') || 'GOLD',
      weight: doc.weight,
      weightUnit: doc.weightUnit || 'g',
      status: doc.status,
      createdBy: String(doc.createdBy?._id || doc.createdBy),
      createdByName: doc.createdBy?.name || fallbackCreatedByName,
      assignedTesterId: doc.assignedTesterId ? String(doc.assignedTesterId?._id || doc.assignedTesterId) : undefined,
      assignedTesterName: doc.assignedTesterId?.name,
      testerValue: doc.testerValue,
      testerValueUnit: doc.testerValueUnit,
      karat: doc.karat,
      elements: doc.elements,
      readingNumber: doc.readingNumber,
      claimedAt: doc.claimedAt instanceof Date ? doc.claimedAt.toISOString() : doc.claimedAt,
      completedAt: doc.completedAt instanceof Date ? doc.completedAt.toISOString() : doc.completedAt,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
      branch: (doc as any).branch || 'kalyan',
      // Dual-report
      reports,
      manualReport,
      machineReport,
    };
  }
}
