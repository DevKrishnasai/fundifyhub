
const config = {
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT!),
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  },

  // Service Configuration
  services: {
    configRefreshInterval: 2 * 60 * 1000, // 2 minutes
    chromiumPath: process.env.CHROMIUM_PATH
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL
  }
};

export default config;