import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from './error.middleware.js';
import { AuthSessionUser } from '../types/index.js';

// Extend Express Request declaration
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthSessionUser;
      organizationId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    let token = req.cookies?.[config.cookieName];

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No session found.');
    }

    const payload = jwt.verify(token, config.jwtSecret) as AuthSessionUser;
    req.user = payload;
    req.organizationId = payload.organizationId;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired session.'));
    }
  }
}
