import { Request, Response, NextFunction } from 'express';
import { TestRequestService } from '../test-requests/test-request.service.js';
import { ForbiddenError } from '../../middleware/error.middleware.js';

export class TesterController {
  constructor(private testRequestService: TestRequestService = new TestRequestService()) {}

  claimRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const testerUserId = req.user!.userId;
      const testerName = req.user!.name;
      const testerBranch = (req.user as any)?.branch;
      const { requestId } = req.body;

      const existing = await this.testRequestService.getById(requestId, orgId);
      if (testerBranch && existing.branch && existing.branch !== testerBranch && req.user?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenError('You can only claim requests belonging to your branch');
      }

      const updated = await this.testRequestService.claimRequest(
        requestId,
        orgId,
        testerUserId,
        testerName
      );

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Request claimed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  submitValueAndSend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const testerUserId = req.user!.userId;
      const testerName = req.user!.name;
      const testerBranch = (req.user as any)?.branch;
      const { requestId, testerValue, testerValueUnit } = req.body;

      const existing = await this.testRequestService.getById(requestId, orgId);
      if (testerBranch && existing.branch && existing.branch !== testerBranch && req.user?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenError('You can only submit reports for requests belonging to your branch');
      }

      const result = await this.testRequestService.submitTesterValueAndSend(
        requestId,
        orgId,
        testerUserId,
        testerName,
        { testerValue, testerValueUnit }
      );

      res.status(200).json({
        success: true,
        data: result.testRequest,
        notificationStatus: result.notificationStatus,
        message: 'Test value saved and notification dispatched',
      });
    } catch (error) {
      next(error);
    }
  };

  submitReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const testerUserId = req.user!.userId;
      const testerName = req.user!.name;
      const testerBranch = (req.user as any)?.branch;
      const { requestId, reportType, testerValue, testerValueUnit, karat, elements } = req.body;

      const existing = await this.testRequestService.getById(requestId, orgId);
      if (testerBranch && existing.branch && existing.branch !== testerBranch && req.user?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenError('You can only submit reports for requests belonging to your branch');
      }

      const result = await this.testRequestService.submitReport(
        requestId,
        orgId,
        testerUserId,
        testerName,
        { reportType, testerValue, testerValueUnit, karat, elements }
      );

      res.status(200).json({
        success: true,
        data: result.testRequest,
        isComplete: result.isComplete,
        notificationStatus: result.notificationStatus,
        message: result.isComplete
          ? 'Both reports submitted — final WhatsApp certificate sent'
          : `${reportType} report submitted — awaiting ${reportType === 'MANUAL' ? 'machine XRF' : 'manual'} report`,
      });
    } catch (error) {
      next(error);
    }
  };

  getQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const userBranch = (req.user as any)?.branch;
      const isSuperOrOrgAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ORGANIZATION_ADMIN';
      const branch = isSuperOrOrgAdmin
        ? (req.query.branch as string) || undefined
        : userBranch;

      const result = await this.testRequestService.queryRequests(orgId, {
        search: req.query.search as string,
        date: req.query.date as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: req.query.status as any,
        branch,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
