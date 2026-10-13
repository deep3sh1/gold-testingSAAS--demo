import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/index.js';
import { ForbiddenError, UnauthorizedError } from './error.middleware.js';

export function requireRoles(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next(); // Super admin bypass
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access forbidden for role '${req.user.role}'`));
    }

    next();
  };
}
