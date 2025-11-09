import dotenv from 'dotenv';
import path from 'path';
import { validateMainBackendEnv } from '@fundifyhub/utils';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Validate and get typed environment variables
const env = validateMainBackendEnv();

export const config = {
  // Server Configuration
  server: {
    port: env.API_PORT,
    host: env.API_HOST,
    cors: {
      credentials: true,
      origins: [
        env.FRONTEND_URL
      ]
    }
  },

  // JWT Configuration
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },

  // Redis Configuration
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    url: env.REDIS_URL
  },

  storage: {
    uploadthingToken: env.UPLOADTHING_TOKEN
  },

  // Environment Configuration
  env: {
    isDevelopment: env.NODE_ENV === 'development',
    logLevel: env.LOG_LEVEL || 'info'
  }
  ,
  // OTP / Rate limiting configuration
  otp: {
    // maximum allowed attempts (resends + failed verifies) in the configured window
    attemptsLimit: env.OTP_ATTEMPTS_LIMIT,
    // sliding window duration in milliseconds
    attemptsWindowMs: env.OTP_ATTEMPTS_WINDOW_MS
  }
};

export default config;