import { Router } from 'express';
import { TesterController } from './tester.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';
import { requireRoles } from '../../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js';
import {
  claimTestRequestSchema,
  submitTesterValueSchema,
  submitReportSchema,
  testRequestQuerySchema,
} from '../../validation/index.js';

const router: Router = Router();
const controller = new TesterController();

router.use(authenticate, requireTenant, requireRoles(['TESTER', 'ORGANIZATION_ADMIN']));

router.get('/queue', validateQuery(testRequestQuerySchema), controller.getQueue);
router.post('/claim', validateBody(claimTestRequestSchema), controller.claimRequest);
router.post('/submit', validateBody(submitTesterValueSchema), controller.submitValueAndSend);
// Dual-report endpoint: submit MANUAL or MACHINE_XRF report independently
router.post('/submit-report', validateBody(submitReportSchema), controller.submitReport);

export const testerRoutes: Router = router;
