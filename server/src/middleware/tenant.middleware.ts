import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './error.middleware.js';

export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.organizationId) {
    return next(new UnauthorizedError('Tenant context missing from session'));
  }
  req.organizationId = req.user.organizationId;
  next();
}
