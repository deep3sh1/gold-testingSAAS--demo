import { Request, Response, NextFunction } from 'express';
import { CustomerService } from './customer.service.js';
import { ForbiddenError } from '../../middleware/error.middleware.js';

export class CustomerController {
  constructor(private customerService: CustomerService = new CustomerService()) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const userBranch = (req.user as any)?.branch;
      const customer = await this.customerService.getOrCreateCustomer(
        orgId,
        {
          ...req.body,
          branch: req.body.branch || userBranch || 'kalyan',
        },
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const query = (req.query.q as string) || '';
      const userBranch = (req.user as any)?.branch;
      const isSuperOrOrgAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ORGANIZATION_ADMIN';
      const branch = isSuperOrOrgAdmin ? (req.query.branch as string) || undefined : userBranch;
      const customers = await this.customerService.searchCustomers(orgId, query, branch);

      res.status(200).json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const skip = parseInt(req.query.skip as string, 10) || 0;
      const userBranch = (req.user as any)?.branch;
      const isSuperOrOrgAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ORGANIZATION_ADMIN';
      const branch = isSuperOrOrgAdmin ? (req.query.branch as string) || undefined : userBranch;
      const customers = await this.customerService.listCustomers(orgId, limit, skip, branch);

      res.status(200).json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.organizationId!;
      const customer = await this.customerService.getById(req.params.id, orgId);

      const userBranch = (req.user as any)?.branch;
      const isSuperOrOrgAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ORGANIZATION_ADMIN';
      if (!isSuperOrOrgAdmin && userBranch && customer.branch && customer.branch !== userBranch) {
        throw new ForbiddenError('You do not have permission to view customers from another branch');
      }

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };
}
