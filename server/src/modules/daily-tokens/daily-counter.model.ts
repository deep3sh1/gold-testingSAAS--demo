import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyCounterDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  branch: string; // 'kalyan', 'kalyan_east', 'ulhasnagar', 'dombivali'
  businessDate: string; // YYYY-MM-DD
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const dailyCounterSchema = new Schema<IDailyCounterDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branch: { type: String, required: true, default: 'kalyan', lowercase: true, trim: true },
    businessDate: { type: String, required: true }, // Derived in Asia/Kolkata
    sequence: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

// COMPOUND UNIQUE INDEX: Enforces strictly one sequence counter per organization per branch per Indian business day.
dailyCounterSchema.index({ organizationId: 1, branch: 1, businessDate: 1 }, { unique: true });

export const DailyCounterModel = mongoose.model<IDailyCounterDocument>('DailyCounter', dailyCounterSchema);
