import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from apps/api/.env, workspace root .env, and cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  apiBaseUrl: (process.env.PUBLIC_REPORT_URL)
    ? process.env.PUBLIC_REPORT_URL
    : (process.env.API_BASE_URL && !process.env.API_BASE_URL.includes('localhost') && !process.env.API_BASE_URL.includes('127.0.0.1'))
    ? process.env.API_BASE_URL
    : (process.env.PUBLIC_API_URL && !process.env.PUBLIC_API_URL.includes('localhost') && !process.env.PUBLIC_API_URL.includes('127.0.0.1'))
    ? process.env.PUBLIC_API_URL
    : 'https://lab-saas-server.vercel.app',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aurum_demo_db',
  jwtSecret: process.env.JWT_SECRET || 'aurum-demo-super-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'aurum_session',
  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER || 'mock') as 'mock' | 'cloud_api' | 'msg91' | 'twilio',
    apiUrl: process.env.WHATSAPP_API_URL || 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'demo_report',
    msg91: {
      authKey: process.env.MSG91_AUTHKEY || '',
      integratedNumber: process.env.MSG91_INTEGRATED_NUMBER || '919820012340',
      templateName: process.env.MSG91_TEMPLATE_NAME || 'demo_report',
      kalyanWestIntegratedNumber: process.env.MSG91_KALYAN_WEST_NUMBER || '919820012345',
      dombivliIntegratedNumber: process.env.MSG91_DOMBIVLI_NUMBER || '919820012348',
      templateNamespace: process.env.MSG91_TEMPLATE_NAMESPACE || '',
      templateLang: process.env.MSG91_TEMPLATE_LANG || 'en',
    },
  },
};
