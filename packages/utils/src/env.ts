import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  redis: {
    host: string;
    port: number;
    url?: string;
  };
  services: {
    websocket: { port: number };
  };
}

export const appConfig: AppConfig = {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    url: process.env.REDIS_URL,
  },
  services: {
    websocket: { port: process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 8080 },
  },
};

export function validateConfig() {
  // Basic validation, extend as needed
  if (!appConfig.redis.host) throw new Error('REDIS_HOST is required');
  if (!appConfig.redis.port) throw new Error('REDIS_PORT is required');
  // websocket port optional default provided
}

export default appConfig;
