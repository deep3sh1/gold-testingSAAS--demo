import mongoose, { Schema, Document } from 'mongoose';
import { Role, UserStatus } from '../../types/index.js';

export interface IUserDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  branch?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'RECEPTIONIST', 'TESTER'],
      required: true,
      default: 'RECEPTIONIST',
    },
    branch: { type: String, trim: true, lowercase: true, default: 'kalyan' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
