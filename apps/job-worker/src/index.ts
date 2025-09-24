import { Worker, Queue } from "bullmq";
import { createLogger } from "@fundifyhub/logger";
import { appConfig, validateConfig } from "@fundifyhub/utils";
import { 
  processPaymentJob, 
  processNotificationJob, 
  getJobStats,
  type PaymentJobData,
  type NotificationJobData 
} from "./data-service";

// Create simple logger instance
const logger = createLogger({ serviceName: 'job-worker' });

// Validate environment configuration on startup
logger.info('Initializing job worker...');
validateConfig();
logger.info('Environment configuration validated');

const connection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
};

logger.info(`Connecting to Redis at ${connection.host}:${connection.port}`);

// Create queues
const paymentQueue = new Queue("payment", { connection });
const notificationQueue = new Queue("notification", { connection });
logger.info('Payment and notification queues created');

// Create payment worker with real database operations
const paymentWorker = new Worker(
  "payment",
  async (job: any) => {
    logger.info(`Processing payment job ${job.id} with data: ${JSON.stringify(job.data)}`);
    
    try {
      const result = await processPaymentJob(job);
      logger.info(`Payment job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      logger.error(`Payment job ${job.id} failed`, error as Error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

// Create notification worker
const notificationWorker = new Worker(
  "notification", 
  async (job: any) => {
    logger.info(`Processing notification job ${job.id}`);
    
    try {
      const result = await processNotificationJob(job);
      logger.info(`Notification job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      logger.error(`Notification job ${job.id} failed`, error as Error);
      throw error;
    }
  },
  { connection, concurrency: 10 }
);

// Payment worker event handlers
paymentWorker.on("completed", (job: any) => {
  logger.info(`Payment job ${job.id} completed (duration: ${job.finishedOn - job.processedOn}ms)`);
});

paymentWorker.on("failed", (job: any, err: any) => {
  logger.error(`Payment job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`);
});

paymentWorker.on("error", (err: any) => {
  logger.error(`Payment worker error: ${err?.message}`);
});

// Notification worker event handlers
notificationWorker.on("completed", (job: any) => {
  logger.info(`Notification job ${job.id} completed (duration: ${job.finishedOn - job.processedOn}ms)`);
});

notificationWorker.on("failed", (job: any, err: any) => {
  logger.error(`Notification job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`);
});

notificationWorker.on("error", (err: any) => {
  logger.error(`Notification worker error: ${err?.message}`);
});

// Periodic job stats logging
setInterval(async () => {
  try {
    const stats = await getJobStats();
    if (stats.success) {
      logger.info(`Job stats: ${JSON.stringify(stats.stats)}`);
    }
  } catch (error) {
    logger.error(`Failed to get job stats: ${(error as Error).message}`);
  }
}, 60000); // Log stats every minute

process.on('SIGINT', async () => {
  logger.info('Gracefully shutting down job workers...');
  await Promise.all([
    paymentWorker.close(),
    notificationWorker.close()
  ]);
  logger.info('Job workers shut down successfully');
  process.exit(0);
});

logger.info("Job workers started successfully, waiting for jobs...");
logger.info("Available job types: payment, notification");