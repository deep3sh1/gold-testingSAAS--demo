import { DailyCounterModel, IDailyCounterDocument } from './daily-counter.model.js';
import { normalizeBranchKey } from '../../shared/index.js';
import mongoose from 'mongoose';

export class DailyTokenRepository {
  /**
   * Atomically increments the daily sequence counter for the given organization, branch, and Indian business date.
   * Safe under high concurrency: two simultaneous requests within the same branch will receive sequential unique numbers.
   * Different branches (e.g. Kalyan vs Ulhasnagar) maintain completely separate counters starting from 001 every day.
   */
  async getNextSequence(organizationId: string, businessDate: string, branch: string = 'kalyan'): Promise<number> {
    const orgObjId = new mongoose.Types.ObjectId(organizationId);
    const normalizedBranch = normalizeBranchKey(branch);

    const result = await DailyCounterModel.findOneAndUpdate(
      {
        organizationId: orgObjId,
        branch: normalizedBranch,
        businessDate,
      },
      {
        $inc: { sequence: 1 },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return result.sequence;
  }

  async getCurrentSequence(organizationId: string, businessDate: string, branch: string = 'kalyan'): Promise<number> {
    const normalizedBranch = normalizeBranchKey(branch);
    const record = await DailyCounterModel.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      branch: normalizedBranch,
      businessDate,
    }).lean();

    return record ? record.sequence : 0;
  }
}
