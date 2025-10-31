import { Queue } from 'bullmq';
import { config } from '../config';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

export const EMAIL_QUEUE_NAME = 'email-queue';

const emailQueue = new Queue(EMAIL_QUEUE_NAME, { connection });

export const addEmailJob = async (name: string, data: any, opts?: any) => {
  return emailQueue.add(name, data, opts || {});
};

// Intentionally do not export the raw queue instance as a default export.
// Use `addEmailJob` so templates and the job-worker control job options.
