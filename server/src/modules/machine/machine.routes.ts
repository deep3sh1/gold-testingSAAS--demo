import { Router } from 'express';
import { MachineController } from './machine.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

const router: Router = Router();
const controller = new MachineController();

// Public machine heartbeat check for local agents
router.get('/heartbeat', (req, res) => res.json({ status: 'ONLINE', timestamp: new Date().toISOString() }));
router.post('/heartbeat', controller.heartbeat);

// Organization resolver middleware for machine endpoints
const resolveMachineTenant = (req: any, res: any, next: any) => {
  if (req.headers.authorization || req.cookies?.gs_session) {
    return authenticate(req, res, () => {
      if (req.user?.organizationId) {
        req.organizationId = req.user.organizationId;
      }
      next();
    });
  }
  if (req.headers['x-organization-id']) {
    req.organizationId = req.headers['x-organization-id'] as string;
    return next();
  }
  // Allow fallback to default active organization for physical lab stations
  req.organizationId = 'SYSTEM_MACHINE_AGENT';
  return next();
};

router.use('/ingest', resolveMachineTenant);
router.post('/ingest', controller.ingest);

router.use('/active-token', resolveMachineTenant);
router.get('/active-token', controller.getActiveToken);

router.use('/capture-report', resolveMachineTenant);
router.post('/capture-report', controller.captureReport);

export const machineRoutes: Router = router;

