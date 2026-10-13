import { Request, Response, NextFunction } from 'express';
import { MachineService } from './machine.service.js';
import { IngestReadingInput, MachineStationHeartbeatInput } from './machine.types.js';
import { getIndianBusinessDate } from '../../shared/index.js';

import mongoose from 'mongoose';
import { OrganizationModel } from '../organizations/organization.model.js';

export class MachineController {
  constructor(private machineService: MachineService = new MachineService()) {}

  private async resolveOrganizationId(rawOrgId?: string): Promise<string | null> {
    if (rawOrgId && mongoose.isValidObjectId(rawOrgId)) {
      return rawOrgId;
    }
    // Auto-fallback to the active primary lab organization
    const activeOrg = await OrganizationModel.findOne({ status: 'ACTIVE' });
    return activeOrg ? String(activeOrg._id) : null;
  }

  ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawOrgId = req.organizationId || (req.headers['x-organization-id'] as string);
      const organizationId = await this.resolveOrganizationId(rawOrgId);

      if (!organizationId) {
        res.status(400).json({ success: false, message: 'No active laboratory organization found' });
        return;
      }

      const input: IngestReadingInput = req.body;
      const actorUserId = req.user?.userId;

      const result = await this.machineService.ingestReading(organizationId, input, actorUserId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.matched
          ? `Successfully processed WinFTM reading for token ${result.testRequest?.tokenNumber}`
          : 'Reading ingested and broadcasted (no active waiting/claimed token matched)',
      });
    } catch (error) {
      next(error);
    }
  };

  heartbeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawOrgId = req.organizationId || (req.headers['x-organization-id'] as string);
      const organizationId = await this.resolveOrganizationId(rawOrgId);

      if (!organizationId) {
        res.status(400).json({ success: false, message: 'No active laboratory organization found' });
        return;
      }

      const input: MachineStationHeartbeatInput = req.body;
      await this.machineService.recordHeartbeat(organizationId, input);

      res.status(200).json({
        success: true,
        message: 'Station heartbeat recorded',
      });
    } catch (error) {
      next(error);
    }
  };

  getActiveToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawOrgId = req.organizationId || (req.headers['x-organization-id'] as string);
      const organizationId = await this.resolveOrganizationId(rawOrgId);

      if (!organizationId) {
        res.status(400).json({ success: false, message: 'No active laboratory organization found' });
        return;
      }

      const branch = ((req.query.branch as string) || 'kalyan').toLowerCase().trim();
      const tokenNumber = req.query.tokenNumber as string;
      const date = (req.query.date as string) || getIndianBusinessDate();

      const activeToken = await this.machineService.getActiveTokenForBranch(organizationId, branch, tokenNumber, date);
      const todayTokens = await this.machineService.getTodayTokensForBranch(organizationId, branch, date);

      if (!activeToken) {
        res.status(200).json({
          success: true,
          active: false,
          message: `No active customer tokens for branch ${branch}`,
          data: null,
          todayTokens,
        });
        return;
      }

      res.status(200).json({
        success: true,
        active: true,
        data: activeToken,
        todayTokens,
      });
    } catch (error) {
      next(error);
    }
  };

  captureReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawOrgId = req.organizationId || (req.headers['x-organization-id'] as string);
      const organizationId = await this.resolveOrganizationId(rawOrgId);

      if (!organizationId) {
        res.status(400).json({ success: false, message: 'No active laboratory organization found' });
        return;
      }

      const input = req.body;
      const actorUserId = req.user?.userId;

      const result = await this.machineService.captureReport(organizationId, input, actorUserId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}
