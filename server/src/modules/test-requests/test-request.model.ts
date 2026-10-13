import mongoose, { Schema, Document } from 'mongoose';
import { TestRequestStatus, ReportType } from '../../types/index.js';

export interface IReportEntry {
  reportType: ReportType;
  testerValue: number;
  testerValueUnit: string;
  karat?: number;
  elements?: Record<string, number>;
  readingNumber?: string;
  stationId?: string;
  reportImageBase64?: string;
  submittedAt: Date;
  notificationStatus?: string;
}

export interface ITestRequestDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  tokenNumber: string;
  branch?: string;
  tagId?: string;
  businessDate: string; // YYYY-MM-DD
  customerId: mongoose.Types.ObjectId;
  customerNameSnapshot: string;
  jewellerName?: string;
  phoneSnapshot: string;
  item: string;
  metalType?: 'GOLD' | 'SILVER';
  weight: number;
  weightUnit: string;
  status: TestRequestStatus;
  createdBy: mongoose.Types.ObjectId;
  assignedTesterId?: mongoose.Types.ObjectId;
  // Legacy single-report fields
  testerValue?: number;
  testerValueUnit?: string;
  karat?: number;
  elements?: Record<string, number>;
  readingNumber?: string;
  reportImageBase64?: string;
  reportCapturedAt?: Date;
  claimedAt?: Date;
  completedAt?: Date;
  // Dual-report array
  reports: IReportEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const testRequestSchema = new Schema<ITestRequestDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tokenNumber: { type: String, required: true, trim: true },
    branch: { type: String, trim: true, lowercase: true, default: 'kalyan', index: true },
    tagId: { type: String, trim: true, default: null, index: true },
    businessDate: { type: String, required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    customerNameSnapshot: { type: String, required: true, trim: true },
    jewellerName: { type: String, trim: true, default: '' },
    phoneSnapshot: { type: String, required: true, trim: true },
    item: { type: String, required: true, trim: true },
    metalType: { type: String, enum: ['GOLD', 'SILVER'], default: 'GOLD' },
    weight: { type: Number, required: true },
    weightUnit: { type: String, default: 'g', trim: true },
    status: {
      type: String,
      enum: ['WAITING', 'TESTING', 'PARTIAL', 'SENT'],
      default: 'WAITING',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTesterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    testerValue: { type: Number, default: null },
    testerValueUnit: { type: String, default: '' },
    karat: { type: Number, default: null },
    elements: { type: Schema.Types.Mixed, default: null },
    readingNumber: { type: String, default: null },
    reportImageBase64: { type: String, default: null },
    reportCapturedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    reports: {
      type: [
        {
          reportType: { type: String, enum: ['MANUAL', 'MACHINE_XRF'], required: true },
          testerValue: { type: Number, required: true },
          testerValueUnit: { type: String, default: '%' },
          karat: { type: Number, default: null },
          elements: { type: Schema.Types.Mixed, default: null },
          readingNumber: { type: String, default: null },
          stationId: { type: String, default: null },
          reportImageBase64: { type: String, default: null },
          submittedAt: { type: Date, default: Date.now },
          notificationStatus: { type: String, default: null },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound indexes for Reception and Tester queues
testRequestSchema.index({ organizationId: 1, tokenNumber: 1 });
testRequestSchema.index({ organizationId: 1, businessDate: 1, status: 1 });
testRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
testRequestSchema.index({ organizationId: 1, customerId: 1 });
testRequestSchema.index({ organizationId: 1, createdAt: -1 });

export const TestRequestModel = mongoose.model<ITestRequestDocument>('TestRequest', testRequestSchema);
