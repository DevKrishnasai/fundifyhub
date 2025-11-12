// Load environment variables from repository root `.env` (dev convenience).
// Using a simple relative path as suggested so configs load the root .env
// before validators run. This is intentionally placed in per-app config
// files and not in the shared validator.
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
	dotenv.config({ path: '../../.env' });
}

import { validateMainBackendEnv } from '@fundifyhub/utils';

// Validate env once and construct a backwards-compatible config object.
const env = validateMainBackendEnv();

const config = {
	// raw validated env (flat)
	env,

	// Server settings
	server: {
		host: env.API_HOST,
		port: env.API_PORT,
		frontendUrl: env.FRONTEND_URL,
	},

	// JWT settings (used by auth utilities)
	jwt: {
		secret: env.JWT_SECRET,
		expiresIn: env.JWT_EXPIRES_IN,
		refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
	},

	// Redis connection settings
	redis: {
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
		url: env.REDIS_URL,
	},

	// OTP / attempts policy
	otp: {
		hmacSecret: env.OTP_HMAC_SECRET ?? env.JWT_SECRET,
		attemptsLimit: env.OTP_ATTEMPTS_LIMIT,
		attemptsWindowMs: env.OTP_ATTEMPTS_WINDOW_MS,
	},

	// UploadThing
	uploadthing: {
		token: env.UPLOADTHING_TOKEN,
	},

	// Database
	database: {
		url: env.DATABASE_URL,
		seedUserPassword: env.SEED_USER_PASSWORD,
	},

	// bcrypt
	bcrypt: {
		rounds: env.BCRYPT_ROUNDS,
	},

	// convenience
	nodeEnv: env.NODE_ENV,
	logLevel: env.LOG_LEVEL,
};

export default config;