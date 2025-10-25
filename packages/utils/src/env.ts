import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the root .env file
// This looks for .env file in the monorepo root, regardless of where this code is executed from
config({ path: resolve(__dirname, '../../../.env') });

export interface AppConfig {
  // Database
  database: {
    url: string;
    user: string;
    password: string;
    name: string;
  };
  
  // Redis
  redis: {
    host: string;
    port: number;
    url: string;
  };
  
  // Application
  app: {
    nodeEnv: string;
    logLevel: string;
  };
  
  // Services
  services: {
    api: {
      port: number;
      host: string;
      url: string;
    };
    websocket: {
      port: number;
      host: string;
      url: string;
    };
  };
  
  // Authentication
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  
  // Payment Gateway
  razorpay: {
    keyId: string;
    keySecret: string;
  };
  
  // Email configuration moved to database - configured via admin panel
}

/**
 * Get a required environment variable
 * Throws an error if the variable is not defined
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not defined`);
  }
  return value;
}

/**
 * Get a required environment variable as a number
 */
function getRequiredNumberEnv(key: string): number {
  const value = getRequiredEnv(key);
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

/**
 * Centralized configuration object
 * All apps should use this instead of accessing process.env directly
 */
export const appConfig: AppConfig = {
  database: {
    url: getRequiredEnv('DATABASE_URL'),
    user: getRequiredEnv('POSTGRES_USER'),
    password: getRequiredEnv('POSTGRES_PASSWORD'),
    name: getRequiredEnv('POSTGRES_DB'),
  },
  
  redis: {
    host: getRequiredEnv('REDIS_HOST'),
    port: getRequiredNumberEnv('REDIS_PORT'),
    url: getRequiredEnv('REDIS_URL'),
  },
  
  app: {
    nodeEnv: getRequiredEnv('NODE_ENV'),
    logLevel: getRequiredEnv('LOG_LEVEL'),
  },
  
  services: {
    api: {
      port: getRequiredNumberEnv('API_PORT'),
      host: getRequiredEnv('API_HOST'),
      url: getRequiredEnv('API_URL'),
    },
    websocket: {
      port: getRequiredNumberEnv('WS_PORT'),
      host: getRequiredEnv('WS_HOST'),
      url: getRequiredEnv('WS_URL'),
    },
  },
  
  auth: {
    jwtSecret: getRequiredEnv('JWT_SECRET'),
    jwtExpiresIn: getRequiredEnv('JWT_EXPIRES_IN'),
  },
  
  razorpay: {
    keyId: getRequiredEnv('RAZORPAY_KEY_ID'),
    keySecret: getRequiredEnv('RAZORPAY_KEY_SECRET'),
  },
  
  // Email configuration moved to database - configured via admin panel
};

/**
 * Validate that all required environment variables are present
 * Call this on application startup to fail fast if configuration is invalid
 */
export function validateConfig(): void {
  try {
    // Test access to all required variables
    appConfig.database.url;
    appConfig.auth.jwtSecret;
    appConfig.razorpay.keyId;
    appConfig.razorpay.keySecret;
    // Email configuration is now database-driven via admin panel
    
    console.log('✅ Environment configuration validated successfully');
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    process.exit(1);
  }
}

/**
 * Helper function to get required environment variables
 * Use this only when you can't use the appConfig object
 */
export function getRequiredEnvVar(key: string): string {
  return getRequiredEnv(key);
}