import type { Request, Response } from 'express';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { seedDatabase } from '../src/seed.js';

let initializedApp: any = null;

async function bootstrap() {
  await connectDatabase();
  await seedDatabase();
  return createApp();
}

export default async function handler(req: Request, res: Response) {
  // Always attach CORS headers so preflights and error responses never trigger CORS blocks in browser
  const origin = (req.headers.origin as string) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');

  // Immediately respond to OPTIONS preflight without waiting for database bootstrap
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (!initializedApp) {
      initializedApp = await bootstrap();
    }
    return initializedApp(req, res);
  } catch (error: any) {
    console.error('[Vercel Serverless Error]:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Failed to initialize serverless application',
      },
    });
  }
}
