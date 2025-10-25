import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.API_PORT!),
    host: process.env.API_HOST!,
    cors: {
      credentials: true,
      origins: [
        process.env.FRONTEND_URL!
      ]
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
    url: process.env.REDIS_URL
  },

  // OTP Configuration
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES!),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS!)
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    logLevel: process.env.LOG_LEVEL
  }
};

export default config;