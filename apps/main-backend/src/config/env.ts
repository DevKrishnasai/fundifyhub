import path from 'node:path';
import dotenv from 'dotenv';
import { validateMainBackendEnv, type MainBackendEnv } from '@fundifyhub/utils';

/**
 * Load and validate environment variables for the main backend service.
 * Uses zod-based validation from @fundifyhub/utils and fails fast on invalid config.
 */
export function loadMainBackendConfig(): MainBackendEnv {
  // Load repo-root .env for local development; no-op in production containers.
  if (process.env.NODE_ENV !== 'production') {
    const envPath = path.resolve(__dirname, '../../../..', '.env');
    dotenv.config({ path: envPath });
  }

  return validateMainBackendEnv();
}

const env = loadMainBackendConfig();

/**
 * Normalized, typed configuration object for the main backend.
 */
export const config = {
  env,
  server: {
    host: env.API_HOST,
    port: env.API_PORT,
    frontendUrl: env.FRONTEND_URL,
    additionalCorsOrigins: env.CORS_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) ?? [],
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    url: env.REDIS_URL,
  },
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
  otp: {
    hmacSecret: env.OTP_HMAC_SECRET ?? env.JWT_SECRET,
    attemptsLimit: env.OTP_ATTEMPTS_LIMIT,
    attemptsWindowMs: env.OTP_ATTEMPTS_WINDOW_MS,
  },
  uploadthing: {
    token: env.UPLOADTHING_TOKEN,
  },
  systemSignatureFileKey: env.SYSTEM_SIGNATURE_FILE_KEY ?? null,
  database: {
    url: env.DATABASE_URL,
    seedUserPassword: env.SEED_USER_PASSWORD,
  },
  bcrypt: {
    rounds: env.BCRYPT_ROUNDS,
  },
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
};

export type MainBackendConfig = typeof config;
export default config;
