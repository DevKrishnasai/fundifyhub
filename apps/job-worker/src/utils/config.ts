
import dotenv from 'dotenv';
import path from 'path';
import { validateJobWorkerEnv } from '@fundifyhub/utils';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Validate and get typed environment variables
const env = validateJobWorkerEnv();

const config = {
  // Redis Configuration
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    url: env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`
  },

  // Service Configuration
  services: {
    configRefreshInterval: 2 * 60 * 1000, // 2 minutes
    chromiumPath: process.env.CHROMIUM_PATH
  },

  // Environment
  env: {
    isDevelopment: env.NODE_ENV === 'development',
    logLevel: env.LOG_LEVEL
  }
};

export default config;