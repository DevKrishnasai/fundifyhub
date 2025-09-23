import { Worker, Queue } from "bullmq";
import { createLogger } from "@fundifyhub/logger";
import { appConfig, validateConfig } from "@fundifyhub/utils";

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

// Create a queue for payment processing
const paymentQueue = new Queue("payment", { connection });
logger.info('Payment queue created');

// Create a worker to process payment jobs
const paymentWorker = new Worker(
  "payment",
  async (job: any) => {
    logger.info(`Processing payment job ${job.id}`);
    
    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const result = { 
        success: true, 
        processedAt: new Date().toISOString(),
        jobId: job.id 
      };
      
      logger.info(`Payment job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      logger.error(`Payment job ${job.id} failed`, error as Error);
      throw error;
    }
  },
  { connection }
);

paymentWorker.on("completed", (job: any) => {
  logger.info(`Job ${job.id} completed (duration: ${job.finishedOn - job.processedOn}ms)`);
});

paymentWorker.on("failed", (job: any, err: any) => {
  logger.error(`Job ${job?.id} failed (attempt ${job?.attemptsMade})`, err);
});

paymentWorker.on("error", (err: any) => {
  logger.error('Worker encountered a critical error', err);
});

process.on('SIGINT', async () => {
  logger.info('Gracefully shutting down job worker...');
  await paymentWorker.close();
  logger.info('Job worker shut down successfully');
  process.exit(0);
});

logger.info("Job worker started successfully, waiting for jobs...");