import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';

export class AuditController {
  constructor(private auditService: AuditService = new AuditService()) {}

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await this.auditService.getRecentLogs(orgId, limit);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  };
}
