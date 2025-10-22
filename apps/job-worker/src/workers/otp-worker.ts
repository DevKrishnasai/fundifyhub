import { Worker, Job } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';
import { processOTPJob } from '../services/otp-service'
import type { OTPJobData } from '../types';

const logger = createLogger({ serviceName: 'otp-worker' });

export class OTPWorker {
  private worker: Worker;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    this.worker = new Worker(
      'otp',
      async (job: Job<OTPJobData>) => {
        try {
          // Convert BullMQ Job to our expected format
          const jobData = {
            id: job.id!,
            data: job.data
          };
          const result = await processOTPJob(jobData);
          return result;
        } catch (error) {
          logger.error(`OTP job ${job.id} failed:`, error as Error);
          throw error;
        }
      },
      { 
        connection, 
        concurrency: config.worker.concurrency.otp 
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('error', (err: Error) => {
      logger.error('OTP worker error:', err);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`OTP job ${job?.id} failed:`, err);
    });

    if (config.env.isDevelopment) {
      this.worker.on('completed', (job) => {
        logger.info(`OTP job ${job.id} completed successfully`);
      });
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    logger.info('OTP worker closed');
  }

  get isRunning(): boolean {
    return !this.worker.closing;
  }
}