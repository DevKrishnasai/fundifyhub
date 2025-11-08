import dotenv from 'dotenv';
import path from 'path';

// TODO: need to add validation for env variables if required variables are missing then throw an error so that server doesn't start with invalid config
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
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    url: process.env.REDIS_URL
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

export default config;