import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { loginSchema } from '../../validation/index.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new AuthController();

router.post('/login', validateBody(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);
router.post('/logout', authenticate, controller.logout);

export const authRoutes: Router = router;
