/**
 * Notifications Queue
 * BullMQ queue for notification jobs (used by backend to enqueue)
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import config from '../config/env';
import logger from '../api/utils/logger';

const connection = new Redis(config.redis.url || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const notificationsQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

notificationsQueue.on('error', (error: Error) => {
  logger.error('[Queue] Notifications queue error:', error);
});

export async function enqueueNotification(data: unknown): Promise<void> {
  try {
    await notificationsQueue.add('send-notification', data);
    logger.info('[Queue] Notification job enqueued');
  } catch (error) {
    logger.error('[Queue] Failed to enqueue notification:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
