import { TestRequestModel, ITestRequestDocument, IReportEntry } from './test-request.model.js';
import mongoose from 'mongoose';
import { TestRequestStatus } from '../../types/index.js';
import { getIndianBusinessDate } from '../../shared/index.js';

export function buildBranchFilter(branch?: string): any {
  if (!branch) return undefined;
  const b = branch.toLowerCase().trim();
  if (b === 'dombivli' || b === 'dombivali') {
    return { $in: ['dombivli', 'dombivali'] };
  }
  if (b === 'kalyan_east' || b === 'kalyaneast' || b === 'kolsewadi') {
    return { $in: ['kalyan_east', 'kalyaneast', 'kolsewadi'] };
  }
  if (b === 'kalyan' || b === 'kalyanwest') {
    return { $in: ['kalyan', 'kalyanwest'] };
  }
  return b;
}

export class TestRequestRepository {
  async create(data: {
    organizationId: string;
    tokenNumber: string;
    businessDate: string;
    customerId: string;
    customerNameSnapshot: string;
    jewellerName?: string;
    phoneSnapshot: string;
    item: string;
    metalType?: 'GOLD' | 'SILVER';
    weight: number;
    weightUnit: string;
    createdBy: string;
    branch?: string;
  }): Promise<ITestRequestDocument> {
    return TestRequestModel.create({
      organizationId: new mongoose.Types.ObjectId(data.organizationId),
      tokenNumber: data.tokenNumber,
      branch: (data.branch || 'kalyan').toLowerCase().trim(),
      businessDate: data.businessDate,
      customerId: new mongoose.Types.ObjectId(data.customerId),
      customerNameSnapshot: data.customerNameSnapshot,
      jewellerName: data.jewellerName || '',
      phoneSnapshot: data.phoneSnapshot,
      item: data.item,
      metalType: data.metalType || 'GOLD',
      weight: data.weight,
      weightUnit: data.weightUnit,
      status: 'WAITING',
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
    });
  }

  async findById(id: string, organizationId: string): Promise<ITestRequestDocument | null> {
    return TestRequestModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .populate('createdBy', 'name email role')
      .populate('assignedTesterId', 'name email role');
  }

  async findByIdDirect(id: string): Promise<ITestRequestDocument | null> {
    return TestRequestModel.findById(new mongoose.Types.ObjectId(id))
      .populate('createdBy', 'name email role')
      .populate('assignedTesterId', 'name email role');
  }

  async findByToken(tokenNumber: string): Promise<ITestRequestDocument | null> {
    return TestRequestModel.findOne({ tokenNumber })
      .populate('createdBy', 'name email role')
      .populate('assignedTesterId', 'name email role');
  }

  async atomicClaim(
    id: string,
    organizationId: string,
    testerUserId: string
  ): Promise<ITestRequestDocument | null> {
    return TestRequestModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: 'WAITING',
      },
      {
        $set: {
          status: 'TESTING',
          assignedTesterId: new mongoose.Types.ObjectId(testerUserId),
          claimedAt: new Date(),
        },
      },
      { new: true }
    ).populate('assignedTesterId', 'name email');
  }

  async atomicSubmitValue(
    id: string,
    organizationId: string,
    testerUserId: string,
    testerValue: number,
    testerValueUnit?: string,
    karat?: number,
    elements?: Record<string, number>
  ): Promise<ITestRequestDocument | null> {
    return TestRequestModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: 'TESTING',
        assignedTesterId: new mongoose.Types.ObjectId(testerUserId),
      },
      {
        $set: {
          status: 'SENT',
          testerValue,
          testerValueUnit: testerValueUnit || '%',
          karat: karat ?? null,
          elements: elements ?? null,
          completedAt: new Date(),
        },
      },
      { new: true }
    ).populate('assignedTesterId', 'name email');
  }

  async atomicCompleteWithMachineData(
    id: string,
    organizationId: string,
    data: {
      testerValue: number;
      karat?: number;
      elements?: Record<string, number>;
      readingNumber?: string;
      tagId?: string;
    }
  ): Promise<ITestRequestDocument | null> {
    const updateFields: Record<string, any> = {
      status: 'SENT',
      testerValue: data.testerValue,
      testerValueUnit: '%',
      completedAt: new Date(),
    };
    if (data.karat !== undefined) updateFields.karat = data.karat;
    if (data.elements !== undefined) updateFields.elements = data.elements;
    if (data.readingNumber !== undefined) updateFields.readingNumber = data.readingNumber;
    if (data.tagId !== undefined) updateFields.tagId = data.tagId;

    return TestRequestModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: { $in: ['WAITING', 'TESTING'] },
      },
      {
        $set: updateFields,
      },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTesterId', 'name email');
  }

  /**
   * Atomically add a report entry to a TestRequest.
   * Status logic:
   *   - TESTING  + first report  → PARTIAL  (one report submitted, waiting for second)
   *   - PARTIAL  + second report → SENT     (both reports done)
   *   - TESTING  + second (machine auto-ingest with no manual) → SENT
   *
   * The legacy testerValue / karat / elements are updated to reflect the LATEST report value.
   */
  async addReport(
    id: string,
    organizationId: string,
    report: Omit<IReportEntry, 'submittedAt'> & { submittedAt?: Date }
  ): Promise<ITestRequestDocument | null> {
    const entry: IReportEntry = {
      ...report,
      submittedAt: report.submittedAt || new Date(),
    };

    // First fetch the current doc to decide next status
    const current = await TestRequestModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: { $in: ['WAITING', 'TESTING', 'PARTIAL'] },
    });

    if (!current) return null;

    // Determine next status
    const existingTypes = (current.reports || []).map((r: IReportEntry) => r.reportType);
    const hasBothAfterThis =
      existingTypes.includes('MANUAL') && report.reportType === 'MACHINE_XRF' ||
      existingTypes.includes('MACHINE_XRF') && report.reportType === 'MANUAL';
    const nextStatus = hasBothAfterThis ? 'SENT' : 'PARTIAL';

    const completedAt = nextStatus === 'SENT' ? new Date() : current.completedAt;

    return TestRequestModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: { $in: ['WAITING', 'TESTING', 'PARTIAL'] },
      },
      {
        $push: { reports: entry },
        $set: {
          status: nextStatus,
          // Keep legacy fields pointing to latest reading
          testerValue: report.testerValue,
          testerValueUnit: report.testerValueUnit || '%',
          karat: report.karat ?? current.karat,
          elements: report.elements ?? current.elements,
          ...(completedAt ? { completedAt } : {}),
        },
      },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTesterId', 'name email');
  }

  /**
   * Save a WinFTM screen capture report directly to the TestRequest.
   * Immediately marks request as SENT, attaches the exact image, and records completed timestamp.
   */
  async saveCaptureReport(
    id: string,
    organizationId: string,
    data: {
      reportImageBase64: string;
      stationId?: string;
      testerValue?: number;
      karat?: number;
      readingNumber?: string;
    }
  ): Promise<ITestRequestDocument | null> {
    const reportEntry: IReportEntry = {
      reportType: 'MACHINE_XRF',
      testerValue: data.testerValue ?? 0,
      testerValueUnit: '%',
      karat: data.karat,
      readingNumber: data.readingNumber,
      stationId: data.stationId,
      reportImageBase64: data.reportImageBase64,
      submittedAt: new Date(),
    };

    const updateFields: Record<string, any> = {
      status: 'SENT',
      reportImageBase64: data.reportImageBase64,
      reportCapturedAt: new Date(),
      completedAt: new Date(),
    };

    if (data.testerValue !== undefined && data.testerValue !== null && data.testerValue > 0) {
      updateFields.testerValue = data.testerValue;
      updateFields.testerValueUnit = '%';
    }
    if (data.karat !== undefined && data.karat !== null && data.karat > 0) {
      updateFields.karat = data.karat;
    }

    return TestRequestModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
      {
        $set: updateFields,
        $push: { reports: reportEntry },
      },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTesterId', 'name email');
  }

  async findActiveWaitingOrTesting(
    organizationId: string,
    branch?: string,
    businessDate?: string
  ): Promise<ITestRequestDocument | null> {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    const date = businessDate || getIndianBusinessDate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      organizationId: orgId,
    };
    const branchFilter = buildBranchFilter(branch);
    if (branchFilter) {
      filter.branch = branchFilter;
    }

    // 1. Prioritize active claimed item in TESTING for today (most recently claimed first)
    let doc = await TestRequestModel.findOne({
      ...filter,
      businessDate: date,
      status: 'TESTING',
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('assignedTesterId', 'name email');

    // 2. Otherwise pick oldest waiting in line (FIFO) for today
    if (!doc) {
      doc = await TestRequestModel.findOne({
        ...filter,
        businessDate: date,
        status: { $in: ['PARTIAL', 'WAITING'] },
      })
        .sort({ createdAt: 1 })
        .populate('createdBy', 'name email')
        .populate('assignedTesterId', 'name email');
    }

    // 3. Fallback: if no waiting/testing token found for today, check the most recent token created today (even SENT)
    if (!doc) {
      doc = await TestRequestModel.findOne({
        ...filter,
        businessDate: date,
      })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('assignedTesterId', 'name email');
    }

    // 4. Ultimate fallback: only if today has zero tokens at all, look for uncompleted tokens
    if (!doc) {
      doc = await TestRequestModel.findOne({
        ...filter,
        status: { $in: ['TESTING', 'PARTIAL', 'WAITING'] },
      })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('assignedTesterId', 'name email');
    }

    return doc;
  }

  async listTodayTokensForBranch(
    organizationId: string,
    branch?: string,
    businessDate?: string
  ): Promise<ITestRequestDocument[]> {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    const date = businessDate || getIndianBusinessDate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      organizationId: orgId,
      businessDate: date,
    };
    const branchFilter = buildBranchFilter(branch);
    if (branchFilter) {
      filter.branch = branchFilter;
    }

    return TestRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('createdBy', 'name email')
      .populate('assignedTesterId', 'name email');
  }

  async findByIdentifier(
    organizationId: string,
    identifier: string
  ): Promise<ITestRequestDocument | null> {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    return TestRequestModel.findOne({
      organizationId: orgId,
      $or: [
        { tokenNumber: identifier.trim() },
        { tagId: identifier.trim() },
        { 'elements.readingNumber': identifier.trim() },
      ],
    })
      .populate('createdBy', 'name email')
      .populate('assignedTesterId', 'name email');
  }

  async searchAndFilter(
    organizationId: string,
    params: {
      search?: string;
      date?: string;
      status?: TestRequestStatus | 'ALL';
      branch?: string;
      limit?: number;
      page?: number;
    }
  ): Promise<{ items: ITestRequestDocument[]; total: number }> {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { organizationId: orgId };

    if (params.status && params.status !== 'ALL') {
      filter.status = params.status;
    }

    const branchFilter = buildBranchFilter(params.branch);
    if (branchFilter) {
      filter.branch = branchFilter;
    }

    if (params.date) {
      filter.businessDate = params.date;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { tokenNumber: { $regex: q, $options: 'i' } },
        { customerNameSnapshot: { $regex: q, $options: 'i' } },
        { phoneSnapshot: { $regex: q, $options: 'i' } },
        { item: { $regex: q, $options: 'i' } },
      ];
    }

    const limit = params.limit || 50;
    const page = params.page || 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TestRequestModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .populate('assignedTesterId', 'name email'),
      TestRequestModel.countDocuments(filter),
    ]);

    return { items, total };
  }
}
