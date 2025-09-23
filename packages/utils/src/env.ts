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
  
  // Email
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
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
 * Get an optional environment variable with a default value
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get an environment variable as a number
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
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
    user: getOptionalEnv('POSTGRES_USER', 'user'),
    password: getOptionalEnv('POSTGRES_PASSWORD', 'pass'),
    name: getOptionalEnv('POSTGRES_DB', 'fundifyhub'),
  },
  
  redis: {
    host: getOptionalEnv('REDIS_HOST', 'localhost'),
    port: getNumberEnv('REDIS_PORT', 6379),
    url: getOptionalEnv('REDIS_URL', 'redis://localhost:6379'),
  },
  
  app: {
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
    logLevel: getOptionalEnv('LOG_LEVEL', 'debug'),
  },
  
  services: {
    api: {
      port: getNumberEnv('API_PORT', 3001),
      host: getOptionalEnv('API_HOST', 'localhost'),
      url: getOptionalEnv('API_URL', 'http://localhost:3001'),
    },
    websocket: {
      port: getNumberEnv('WS_PORT', 3002),
      host: getOptionalEnv('WS_HOST', 'localhost'),
      url: getOptionalEnv('WS_URL', 'ws://localhost:3002'),
    },
  },
  
  auth: {
    jwtSecret: getRequiredEnv('JWT_SECRET'),
    jwtExpiresIn: getOptionalEnv('JWT_EXPIRES_IN', '7d'),
  },
  
  razorpay: {
    keyId: getRequiredEnv('RAZORPAY_KEY_ID'),
    keySecret: getRequiredEnv('RAZORPAY_KEY_SECRET'),
  },
  
  email: {
    host: getOptionalEnv('SMTP_HOST', 'smtp.gmail.com'),
    port: getNumberEnv('SMTP_PORT', 587),
    user: getRequiredEnv('SMTP_USER'),
    password: getRequiredEnv('SMTP_PASS'),
  },
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
    appConfig.email.user;
    appConfig.email.password;
    
    console.log('✅ Environment configuration validated successfully');
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    process.exit(1);
  }
}

/**
 * Helper function to get environment variables (for backward compatibility)
 * @deprecated Use appConfig object instead
 */
export function getEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}