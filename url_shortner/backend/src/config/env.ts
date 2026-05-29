import dotenv from 'dotenv';
import path from 'node:path';

// Load backend/.env, then database/.env as fallback for DATABASE_URL
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../database/.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

// Startup validation for Resend environment variables
if (isProduction) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('FATAL CONFIG ERROR: Missing required environment variable "RESEND_API_KEY" in production environment.');
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error('FATAL CONFIG ERROR: Missing required environment variable "EMAIL_FROM" in production environment.');
  }
} else if (process.env.NODE_ENV !== 'test') {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  [DashURL Config Warning]: RESEND_API_KEY is not defined. Transactional emails will fall back to terminal console logs in development.');
  }
  if (!process.env.EMAIL_FROM) {
    console.warn('⚠️  [DashURL Config Warning]: EMAIL_FROM is not defined. Emails will fall back to "noreply@dashurl.in".');
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3200),
  databaseUrl: requireEnv('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  isProduction: isProduction,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'noreply@dashurl.in',
} as const;
