// Load environment variables from repository root `.env` so validators run
// correctly during development.
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
	dotenv.config({ path: '../../.env' });
}

import { validateLiveSocketsEnv } from '@fundifyhub/utils';

/*
 * Live-sockets configuration
 * --------------------------
 * Validates env using the shared validator and exposes a small `config`
 * object. Consumers should import this module and use `config.server.port`
 * and `config.env` instead of calling the validator repeatedly.
 */
const env = validateLiveSocketsEnv();

/**
 * Minimal config object for the live-sockets service.
 */
const config = {
	env,
	server: {
		port: env.WS_PORT,
	},
	nodeEnv: env.NODE_ENV,
	logLevel: env.LOG_LEVEL,
};

export default config;