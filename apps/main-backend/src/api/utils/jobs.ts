/**
 * Job Queue Utility for API Layer
 * 
 * Thin wrapper for enqueueing background jobs using BullMQ.
 * Provides type-safe methods for common job types.
 * 
 * @module api/utils/jobs
 */

import { NotificationChannel, NotificationPriority, DeliveryMode, TEMPLATE_NAMES } from '@fundifyhub/types';
import logger from './logger';
import { notificationsQueue } from '../../queues/notifications.queue';

/**
 * Notification job data structure
 */
export interface NotificationJobData {
  templateName: TEMPLATE_NAMES;
  channels: NotificationChannel[];
  deliveryMode: DeliveryMode;
  priority: NotificationPriority;
  recipient: {
    userId?: string;
    email?: string;
    phoneNumber?: string;
    name?: string;
  };
  variables: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Email job data structure
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * WhatsApp job data structure
 */
export interface WhatsAppJobData {
  phoneNumber: string;
  templateName: string;
  variables: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * SMS job data structure
 */
export interface SMSJobData {
  phoneNumber: string;
  message: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Enqueue a multi-channel notification job
 * 
 * @param jobData Notification job data
 * @returns Promise with job ID or error
 */
export async function enqueueNotificationJob(
  jobData: NotificationJobData
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const priority = jobData.priority === NotificationPriority.HIGH ? 1 
      : jobData.priority === NotificationPriority.NORMAL ? 5 
      : 10;

    const job = await notificationsQueue.add('send-notification', jobData, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    logger.debug('[Jobs] Notification job enqueued', {
      jobId: job.id,
      template: jobData.templateName,
      channels: jobData.channels,
      recipient: jobData.recipient.userId || jobData.recipient.email,
    });

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error) {
    logger.error('[Jobs] Failed to enqueue notification job:', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enqueue an email job
 */
export async function enqueueEmailJob(
  jobData: EmailJobData
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const priority = jobData.priority === 'high' ? 1 : jobData.priority === 'low' ? 10 : 5;
    
    const job = await notificationsQueue.add('send-email', jobData, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    logger.debug('[Jobs] Email job enqueued', {
      jobId: job.id,
      to: jobData.to,
      template: jobData.template,
    });

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error) {
    logger.error('[Jobs] Failed to enqueue email job:', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enqueue a WhatsApp job
 */
export async function enqueueWhatsAppJob(
  jobData: WhatsAppJobData
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const priority = jobData.priority === 'high' ? 1 : jobData.priority === 'low' ? 10 : 5;
    
    const job = await notificationsQueue.add('send-whatsapp', jobData, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    logger.debug('[Jobs] WhatsApp job enqueued', {
      jobId: job.id,
      phoneNumber: jobData.phoneNumber,
      template: jobData.templateName,
    });

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error) {
    logger.error('[Jobs] Failed to enqueue WhatsApp job:', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enqueue an SMS job
 */
export async function enqueueSMSJob(
  jobData: SMSJobData
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const priority = jobData.priority === 'high' ? 1 : jobData.priority === 'low' ? 10 : 5;
    
    const job = await notificationsQueue.add('send-sms', jobData, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    
    logger.debug('[Jobs] SMS job enqueued', {
      jobId: job.id,
      phoneNumber: jobData.phoneNumber,
    });

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error) {
    logger.error('[Jobs] Failed to enqueue SMS job:', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper to enqueue a simple notification
 */
export async function notifyUser(params: {
  userId: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
  templateName: TEMPLATE_NAMES;
  variables: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
}): Promise<{ success: boolean; error?: string }> {
  const channels = params.channels || [NotificationChannel.IN_APP];
  
  return enqueueNotificationJob({
    templateName: params.templateName,
    channels,
    deliveryMode: DeliveryMode.BROADCAST,
    priority: params.priority || NotificationPriority.NORMAL,
    recipient: {
      userId: params.userId,
      email: params.email,
      phoneNumber: params.phoneNumber,
      name: params.name,
    },
    variables: params.variables,
  });
}
