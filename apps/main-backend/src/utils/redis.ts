import Redis from 'ioredis'
import config from './config'

// Create a singleton Redis client for the main-backend service.
// Uses REDIS_URL if provided, otherwise falls back to host/port.
const connection = config.redis.url || `redis://${config.redis.host}:${config.redis.port}`

const redis = new Redis(connection)

redis.on('error', (err: Error) => {
  // lightweight logging to console; main logger may not be initialized at import time
  // In production, consider wiring this into the service logger
  console.error('[redis] connection error', err)
})

export default redis
