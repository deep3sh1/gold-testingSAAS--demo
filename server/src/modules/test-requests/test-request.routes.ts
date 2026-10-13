import { Router } from 'express';
import { TestRequestController } from './test-request.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';
import { requireRoles } from '../../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js';
import { createTestRequestSchema, testRequestQuerySchema } from '../../validation/index.js';

const router: Router = Router();
const controller = new TestRequestController();

router.use(authenticate, requireTenant);

router.get(
  '/',
  requireRoles(['RECEPTIONIST', 'TESTER', 'ORGANIZATION_ADMIN']),
  validateQuery(testRequestQuerySchema),
  controller.list
);

router.get(
  '/:id/certificate',
  controller.getCertificate
);

router.get(
  '/:id',
  requireRoles(['RECEPTIONIST', 'TESTER', 'ORGANIZATION_ADMIN']),
  controller.getById
);

router.post(
  '/',
  requireRoles(['RECEPTIONIST', 'ORGANIZATION_ADMIN']),
  validateBody(createTestRequestSchema),
  controller.create
);

export const testRequestRoutes: Router = router;
