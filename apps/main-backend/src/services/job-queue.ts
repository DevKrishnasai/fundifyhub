import { Queue } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';

const logger = createLogger({ serviceName: 'job-queue' });

export interface OTPJobData {
  userId?: string;
  recipient: string; // phone number or email
  otp: string;
  userName: string;
  firstName?: string;
  lastName?: string;
  type: 'WHATSAPP' | 'EMAIL';
  templateType?: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
}

class JobQueueService {
  private otpQueue: Queue<OTPJobData>;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    // Create OTP queue that matches the job worker
    this.otpQueue = new Queue('otp', { connection });

    logger.info('Job queue service initialized');
  }

  /**
   * Add an OTP job to the queue
   */
  async addOTPJob(data: OTPJobData, options?: {
    delay?: number;
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
  }): Promise<void> {
    try {
      const jobOptions = {
        delay: options?.delay || 0,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || {
          type: 'exponential' as const,
          delay: 2000
        },
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
      };

      const job = await this.otpQueue.add('send-otp', data, jobOptions);
      
      logger.info(`📤 Queued ${data.type} OTP job ${job.id} for ${data.recipient}`);
    } catch (error) {
      logger.error(`Failed to queue ${data.type} OTP job:`, error as Error);
      throw error;
    }
  }

  /**
   * Add email OTP job
   */
  async addEmailOTP(data: {
    recipient: string;
    otp: string;
    userName: string;
    firstName?: string;
    lastName?: string;
    templateType?: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
  }): Promise<void> {
    await this.addOTPJob({
      ...data,
      type: 'EMAIL'
    });
  }

  /**
   * Add WhatsApp OTP job
   */
  async addWhatsAppOTP(data: {
    recipient: string;
    otp: string;
    userName: string;
    firstName?: string;
    lastName?: string;
    templateType?: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
  }): Promise<void> {
    await this.addOTPJob({
      ...data,
      type: 'WHATSAPP'
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.otpQueue.getWaiting(),
        this.otpQueue.getActive(),
        this.otpQueue.getCompleted(),
        this.otpQueue.getFailed(),
        this.otpQueue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error as Error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      };
    }
  }

  /**
   * Clean completed and failed jobs
   */
  async cleanQueue(): Promise<void> {
    try {
      await Promise.all([
        this.otpQueue.clean(24 * 60 * 60 * 1000, 10, 'completed'), // Clean completed jobs older than 24h  
        this.otpQueue.clean(7 * 24 * 60 * 60 * 1000, 5, 'failed') // Clean failed jobs older than 7 days
      ]);
      logger.info('Queue cleanup completed');
    } catch (error) {
      logger.error('Error cleaning queue:', error as Error);
    }
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    try {
      await this.otpQueue.close();
      logger.info('Job queue service closed');
    } catch (error) {
      logger.error('Error closing job queue service:', error as Error);
    }
  }
}

// Singleton instance
export const jobQueueService = new JobQueueService();
export default jobQueueService;