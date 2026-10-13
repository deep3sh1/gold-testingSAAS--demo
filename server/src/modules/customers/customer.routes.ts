import { Router } from 'express';
import { CustomerController } from './customer.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';
import { requireRoles } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createCustomerSchema } from '../../validation/index.js';

const router: Router = Router();
const controller = new CustomerController();

router.use(authenticate, requireTenant);

router.get('/search', requireRoles(['RECEPTIONIST', 'ORGANIZATION_ADMIN', 'TESTER']), controller.search);
router.get('/', requireRoles(['RECEPTIONIST', 'ORGANIZATION_ADMIN', 'TESTER']), controller.list);
router.get('/:id', requireRoles(['RECEPTIONIST', 'ORGANIZATION_ADMIN', 'TESTER']), controller.getById);
router.post(
  '/',
  requireRoles(['RECEPTIONIST', 'ORGANIZATION_ADMIN']),
  validateBody(createCustomerSchema),
  controller.create
);

export const customerRoutes: Router = router;
