
// Load environment variables from repository root `.env` (dev convenience).
// This keeps import-time validation working in development.
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
	dotenv.config({ path: '../../.env' });
}

import { validateJobWorkerEnv } from '@fundifyhub/utils';

/*
 * Job-Worker configuration
 * ------------------------
 * This module validates environment variables using the central Zod validator
 * (`validateJobWorkerEnv`) and exports a small, backwards-compatible `config`
 * object that other modules can import. Keeping the validation here ensures a
 * single source of truth for environment shapes and defaults while preserving
 * the nested `config` shape expected by existing code.
 */
const env = validateJobWorkerEnv();

/**
 * Backwards-compatible runtime config for the job-worker service.
 * - `env` contains the raw validated environment values (flat).
 * - `redis` is the connection information used by BullMQ and Redis clients.
 * - `chromium` is the optional path used by headless browser tasks.
 * - `defaultCountryDial` is used to normalize phone numbers for WhatsApp.
 */
const config = {
	env,

	redis: {
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
		url: env.REDIS_URL,
	},

	chromium: {
		path: env.CHROMIUM_PATH,
	},

	defaultCountryDial: env.DEFAULT_COUNTRY_DIAL,

	database: {
		url: env.DATABASE_URL,
		seedUserPassword: env.SEED_USER_PASSWORD,
	},

	nodeEnv: env.NODE_ENV,
	logLevel: env.LOG_LEVEL,
};

export default config;