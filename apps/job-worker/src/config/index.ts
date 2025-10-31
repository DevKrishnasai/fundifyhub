import { appConfig } from '@fundifyhub/utils';

export const config = {
  // Redis Configuration
  redis: {
    host: appConfig.redis.host,
    port: appConfig.redis.port,
    url: appConfig.redis.url || `redis://${appConfig.redis.host}:${appConfig.redis.port}`
  },

  // Service Configuration
  services: {
    configRefreshInterval: 2 * 60 * 1000, // 2 minutes
    chromiumPath: process.env.CHROMIUM_PATH
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    logLevel: process.env.LOG_LEVEL
  }
};

export default config;