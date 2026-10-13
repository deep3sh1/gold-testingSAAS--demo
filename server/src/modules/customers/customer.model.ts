import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  jewellerName?: string;
  phone: string; // Canonical +91XXXXXXXXXX
  rawPhone: string;
  branch?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomerDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    jewellerName: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, trim: true, index: true },
    rawPhone: { type: String, required: true },
    branch: { type: String, trim: true, lowercase: true, default: 'kalyan' },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast tenant-scoped and branch-scoped search
customerSchema.index({ organizationId: 1, branch: 1, phone: 1 });
customerSchema.index({ organizationId: 1, branch: 1, name: 1 });
customerSchema.index({ organizationId: 1, branch: 1, createdAt: -1 });
customerSchema.index({ organizationId: 1, phone: 1 });
customerSchema.index({ organizationId: 1, name: 1 });
customerSchema.index({ organizationId: 1, createdAt: -1 });

export const CustomerModel = mongoose.model<ICustomerDocument>('Customer', customerSchema);
