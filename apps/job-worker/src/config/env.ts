/**
 * Environment configuration for the Job Worker.
 *
 * @module apps/job-worker/src/config
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
