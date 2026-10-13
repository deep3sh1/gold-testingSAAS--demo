import { Request, Response, NextFunction } from 'express';
import { TestRequestService } from './test-request.service.js';
import { ForbiddenError } from '../../middleware/error.middleware.js';

export class TestRequestController {
  constructor(private testRequestService: TestRequestService = new TestRequestService()) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.userId;
      const userName = req.user!.name;

      const created = await this.testRequestService.createTestRequest(
        orgId,
        userId,
        userName,
        req.body
      );

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const request = await this.testRequestService.getById(req.params.id, orgId);

      const userBranch = (req.user as any)?.branch;
      const isSuperOrOrgAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ORGANIZATION_ADMIN';
      if (!isSuperOrOrgAdmin && userBranch && request.branch && request.branch !== userBranch) {
        throw new ForbiddenError('You do not have permission to view requests from another branch');
      }

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };

  getCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await this.testRequestService.getById(req.params.id, req.organizationId || (req.query.orgId as string));

      const userBranch = (req.user as any)?.branch;
      const isSuperOrOrgAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ORGANIZATION_ADMIN';
      if (!isSuperOrOrgAdmin && userBranch && (doc as any).branch && (doc as any).branch !== userBranch) {
        throw new ForbiddenError('You do not have permission to view certificates from another branch');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { generateCertificateHtml } = await import('./test-request.certificate.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html = generateCertificateHtml(doc as any);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
