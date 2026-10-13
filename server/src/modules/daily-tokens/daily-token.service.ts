import { DailyTokenRepository } from './daily-token.repository.js';
import {
  getIndianBusinessDate,
  formatTokenNumber,
  getBranchTokenPrefix,
  normalizeBranchKey,
} from '../../shared/index.js';

export class DailyTokenService {
  constructor(private dailyTokenRepo: DailyTokenRepository = new DailyTokenRepository()) {}

  /**
   * Generates the next atomic token number for a specific branch on the current Indian business day.
   * Scoped strictly per branch so that each branch starts from 001 every day:
   *  - Kalyan (West): KW-20261006-001
   *  - Ulhasnagar:    UL-20261006-001
   *  - Kalyan (East): KE-20261006-001
   *  - Dombivli:      DB-20261006-001
   */
  async generateToken(
    organizationId: string,
    branch: string = 'kalyan',
    overrideDate?: Date
  ): Promise<{ tokenNumber: string; businessDate: string; sequence: number }> {
    const businessDate = getIndianBusinessDate(overrideDate);
    const normalizedBranch = normalizeBranchKey(branch);
    const sequence = await this.dailyTokenRepo.getNextSequence(organizationId, businessDate, normalizedBranch);
    const branchPrefix = getBranchTokenPrefix(normalizedBranch);
    const tokenNumber = formatTokenNumber(branchPrefix, businessDate, sequence);

    return {
      tokenNumber,
      businessDate,
      sequence,
    };
  }

  /**
   * Returns current Indian business date string (YYYY-MM-DD)
   */
  getCurrentBusinessDate(): string {
    return getIndianBusinessDate();
  }
}
