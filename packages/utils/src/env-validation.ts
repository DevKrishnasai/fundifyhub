import { z } from 'zod';

// Common environment variables used across multiple services
const commonEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Database configuration
const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  SEED_USER_PASSWORD: z.string().default('Password123!'),
});

// Redis configuration
const redisEnvSchema = z.object({
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.string().transform((val: string) => parseInt(val)).refine((val: number) => !isNaN(val) && val > 0, 'REDIS_PORT must be a valid port number'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),
});

// JWT configuration
const jwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1, 'JWT_REFRESH_EXPIRES_IN is required'),
});

// Frontend environment variables
export const frontendEnvSchema = z.object({
  ...commonEnvSchema.shape,
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
  NEXT_PUBLIC_WS_URL: z.string().url('NEXT_PUBLIC_WS_URL must be a valid URL'),
  // UploadThing configuration (frontend also needs token for client-side uploads)
  UPLOADTHING_TOKEN: z.string().min(1, 'UPLOADTHING_TOKEN is required'),
});

// Main backend environment variables
export const mainBackendEnvSchema = z.object({
  ...commonEnvSchema.shape,
  ...databaseEnvSchema.shape,
  ...redisEnvSchema.shape,
  ...jwtEnvSchema.shape,

  // Server configuration
  API_PORT: z.string().transform((val: string) => parseInt(val)).refine((val: number) => !isNaN(val) && val > 0 && val < 65536, 'API_PORT must be a valid port number'),
  API_HOST: z.string().min(1, 'API_HOST is required'),

  // CORS configuration
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // UploadThing configuration
  UPLOADTHING_TOKEN: z.string().min(1, 'UPLOADTHING_TOKEN is required'),
  // Optional metrics (StatsD/Datadog)
  // Optional OTP HMAC secret (if not provided, JWT_SECRET will be used)
  OTP_HMAC_SECRET: z.string().optional(),
  // Default country dial code for phone normalization (digits only). Defaults to '91' for India.
  DEFAULT_COUNTRY_DIAL: z.string().regex(/^\d+$/, 'DEFAULT_COUNTRY_DIAL must be digits only').default('91'),
  // Bcrypt rounds configurable
  BCRYPT_ROUNDS: z.string().transform((val) => parseInt(val)).optional(),
  // OTP attempts policy (Policy B): total attempts (resends + failed verifies) allowed in a time window
  // NOTE: no defaults - these must be set in the environment explicitly
  OTP_ATTEMPTS_LIMIT: z.string().transform((val) => parseInt(val)).refine((n) => !isNaN(n) && n > 0, 'OTP_ATTEMPTS_LIMIT must be a positive integer'),
  // Window for attempts in milliseconds
  OTP_ATTEMPTS_WINDOW_MS: z.string().transform((val) => parseInt(val)).refine((n) => !isNaN(n) && n > 0, 'OTP_ATTEMPTS_WINDOW_MS must be a positive integer'),
});

// Live sockets environment variables
export const liveSocketsEnvSchema = z.object({
  ...commonEnvSchema.shape,

  // WebSocket server configuration
  WS_PORT: z.string().transform((val: string) => parseInt(val)).refine((val: number) => !isNaN(val) && val > 0 && val < 65536, 'WS_PORT must be a valid port number'),
});

// Job worker environment variables
export const jobWorkerEnvSchema = z.object({
  ...commonEnvSchema.shape,
  ...databaseEnvSchema.shape,
  ...redisEnvSchema.shape,
  DEFAULT_COUNTRY_DIAL: z.string().regex(/^\d+$/, 'DEFAULT_COUNTRY_DIAL must be digits only').default('91'),
});

/**
 * Validates environment variables for the frontend application
 * @throws {Error} If validation fails with detailed error message
 */
export function validateFrontendEnv(): z.infer<typeof frontendEnvSchema> {
  try {
    return frontendEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const errorMessages = zodError.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Frontend environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validates environment variables for the main backend application
 * @throws {Error} If validation fails with detailed error message
 */
export function validateMainBackendEnv(): z.infer<typeof mainBackendEnvSchema> {
  try {
    return mainBackendEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const errorMessages = zodError.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Main Backend environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validates environment variables for the live sockets application
 * @throws {Error} If validation fails with detailed error message
 */
export function validateLiveSocketsEnv(): z.infer<typeof liveSocketsEnvSchema> {
  try {
    return liveSocketsEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const errorMessages = zodError.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Live Sockets environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Validates environment variables for the job worker application
 * @throws {Error} If validation fails with detailed error message
 */
export function validateJobWorkerEnv(): z.infer<typeof jobWorkerEnvSchema> {
  try {
    return jobWorkerEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const errorMessages = zodError.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Job Worker environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}

export type FrontendEnv = z.infer<typeof frontendEnvSchema>;
export type MainBackendEnv = z.infer<typeof mainBackendEnvSchema>;
export type LiveSocketsEnv = z.infer<typeof liveSocketsEnvSchema>;
export type JobWorkerEnv = z.infer<typeof jobWorkerEnvSchema>;