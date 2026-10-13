import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { customerRoutes } from './modules/customers/customer.routes.js';
import { testRequestRoutes } from './modules/test-requests/test-request.routes.js';
import { testerRoutes } from './modules/tester/tester.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { machineRoutes } from './modules/machine/machine.routes.js';
import { publicCertificateRoutes } from './modules/test-requests/public-certificate.routes.js';

export function createApp(): express.Application {
  const app = express();

  // Core Middlewares
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === config.clientUrl ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root & Health Check
  app.get(['/', '/api', '/api/index'], (req, res) => {
    res.json({
      status: 'ok',
      service: 'goldscope-assay-api',
      message: 'GOLDSCOPE ASSAY SaaS API is active',
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'goldscope-assay-api',
      env: config.env,
      apiBaseUrl: config.apiBaseUrl,
      integratedNumber: config.whatsapp.msg91?.integratedNumber,
      template: config.whatsapp.templateName,
      timestamp: new Date().toISOString(),
    });
  });

  // API v1 Routes
  const apiRouter = express.Router();
  apiRouter.use('/public/certificates', publicCertificateRoutes);
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/customers', customerRoutes);
  apiRouter.use('/test-requests', testRequestRoutes);
  apiRouter.use('/tester', testerRoutes);
  apiRouter.use('/audit', auditRoutes);
  apiRouter.use('/machine', machineRoutes);

  app.use('/api/v1', apiRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
