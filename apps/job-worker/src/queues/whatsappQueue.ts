import { Queue } from 'bullmq';
import { config } from '../config';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
};

export const WHATSAPP_QUEUE_NAME = 'whatsapp-queue';

const whatsappQueue = new Queue(WHATSAPP_QUEUE_NAME, { connection });

export const addWhatsAppJob = async (name: string, data: any, opts?: any) => {
  return whatsappQueue.add(name, data, opts || {});
};

// Intentionally do not export the raw queue instance as a default export.
// Callers should use the template-driven enqueue flow which adds jobs
// via `addWhatsAppJob` and lets templates control job options.
