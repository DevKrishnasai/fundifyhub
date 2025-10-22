import { Queue } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';

const logger = createLogger({ serviceName: 'queue-service' });

// Redis connection configuration
const connection = {
  host: config.redis?.host || 'localhost',
  port: config.redis?.port || 6379,
};

// Create OTP queue only (auth focused)
export const otpQueue = new Queue('otp', { connection });

logger.info('Queue service initialized');

// Queue interfaces
export interface OTPJobData {
  userId: string;
  recipient: string; // phone number or email
  otp: string;
  userName: string;
  type: 'WHATSAPP' | 'EMAIL';
  templateType?: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
}



/**
 * Queue Service Class
 */
export class QueueService {
  /**
   * Add OTP job to queue
   */
  static async addOTPJob(
    data: OTPJobData,
    options?: {
      delay?: number;
      attempts?: number;
      priority?: number;
    }
  ): Promise<{ success: boolean; jobId?: string; message: string }> {
    try {
      const job = await otpQueue.add('send-otp', data, {
        attempts: options?.attempts || 3,
        delay: options?.delay || 0,
        priority: options?.priority || 0,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      logger.info(`📤 OTP job added to queue: ${job.id} for ${data.type} to ${data.recipient}`);
      
      return {
        success: true,
        jobId: job.id,
        message: 'OTP job queued successfully'
      };
    } catch (error) {
      logger.error('Failed to add OTP job to queue:', error as Error);
      return {
        success: false,
        message: 'Failed to queue OTP job'
      };
    }
  }



  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    success: boolean;
    stats?: {
      otp: any;
    };
    message: string;
  }> {
    try {
      const otpStats = await otpQueue.getJobCounts();

      return {
        success: true,
        stats: {
          otp: otpStats,
        },
        message: 'Queue stats retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error as Error);
      return {
        success: false,
        message: 'Failed to get queue stats'
      };
    }
  }

  /**
   * Clear all queues (admin only)
   */
  static async clearAllQueues(): Promise<{ success: boolean; message: string }> {
    try {
      await otpQueue.obliterate({ force: true });

      logger.info('🧹 OTP queue cleared by admin');
      
      return {
        success: true,
        message: 'OTP queue cleared successfully'
      };
    } catch (error) {
      logger.error('Failed to clear queue:', error as Error);
      return {
        success: false,
        message: 'Failed to clear queue'
      };
    }
  }

  /**
   * Get job details by ID
   */
  static async getJobDetails(queueType: 'otp', jobId: string): Promise<{
    success: boolean;
    job?: any;
    message: string;
  }> {
    try {
      let queue;
      switch (queueType) {
        case 'otp':
          queue = otpQueue;
          break;
        default:
          return { success: false, message: 'Invalid queue type' };
      }

      const job = await queue.getJob(jobId);
      
      if (!job) {
        return { success: false, message: 'Job not found' };
      }

      return {
        success: true,
        job: {
          id: job.id,
          data: job.data,
          progress: job.progress,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
        },
        message: 'Job details retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get job details:', error as Error);
      return {
        success: false,
        message: 'Failed to get job details'
      };
    }
  }
}

export default QueueService;