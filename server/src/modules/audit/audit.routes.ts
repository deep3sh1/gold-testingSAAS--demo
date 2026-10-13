import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';
import { requireRoles } from '../../middleware/rbac.middleware.js';

const router: Router = Router();
const controller = new AuditController();

router.use(authenticate, requireTenant, requireRoles(['ORGANIZATION_ADMIN', 'SUPER_ADMIN']));

router.get('/', controller.getLogs);

export const auditRoutes: Router = router;
