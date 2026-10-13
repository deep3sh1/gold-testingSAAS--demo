import mongoose, { Schema, Document } from 'mongoose';
import { OrganizationSettings } from '../../types/index.js';

export interface IOrganizationDocument extends Document {
  name: string;
  slug: string;
  code: string;
  status: 'ACTIVE' | 'SUSPENDED';
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, default: 'GN' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    settings: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      tokenPrefix: { type: String, default: 'GN' },
      defaultWeightUnit: { type: String, default: 'g' },
      defaultTesterValueUnit: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

export const OrganizationModel = mongoose.model<IOrganizationDocument>('Organization', organizationSchema);
