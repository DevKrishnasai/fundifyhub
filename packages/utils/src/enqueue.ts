import { Queue } from 'bullmq';
import {
  JOB_TYPES,
  QUEUE_NAMES,
  SERVICE_NAMES,
  SERVICE_CONTROL_ACTIONS,
  NotificationChannel,
  NotificationPriority,
  DeliveryMode,
  type NotificationRequest,
} from '@fundifyhub/types';

/**
 * Notification job data for queue processing.
 * This is the internal structure used by BullMQ workers.
 */
export interface NotificationJobData {
  /** Unique correlation ID for tracking the notification across systems */
  correlationId: string;
  /** Name of the template to use for rendering */
  templateName: string;
  /** Variables to substitute in the template */
  variables: Record<string, unknown>;
  /** Channels to send the notification through */
  channels: NotificationChannel[];
  /** How to deliver across multiple channels */
  deliveryMode: DeliveryMode;
  /** Priority level for queue ordering */
  priority: NotificationPriority;
  /** Recipient information */
  recipient: {
    userId?: string;
    email?: string;
    phoneNumber?: string;
    name?: string;
  };
  /** Additional metadata for tracking/analytics */
  metadata?: Record<string, unknown>;
  /** ISO timestamp for scheduled delivery */
  scheduledAt?: string;
  /** ISO timestamp after which notification should not be sent */
  expiresAt?: string;
}

/**
 * Service control job data for managing service lifecycle.
 */
export interface ServiceControlJobData {
  /** Name of the service to control */
  serviceName: SERVICE_NAMES;
  /** Action to perform on the service */
  action: SERVICE_CONTROL_ACTIONS;
  /** Optional configuration for the action */
  config?: Record<string, unknown>;
}

/**
 * Result of adding a notification job to the queue.
 */
export interface AddNotificationJobResult {
  /** Correlation ID for tracking */
  correlationId: string;
  /** BullMQ job ID if successfully added */
  jobId?: string;
  /** Error message if job addition failed */
  error?: string;
}

/**
 * Result of adding a service control job to the queue.
 */
export interface AddServiceControlJobResult {
  /** BullMQ job ID if successfully added */
  jobId?: string;
  /** Error message if job addition failed */
  error?: string;
}

/**
 * Interface for the enqueue client that provides job queue operations.
 */
export interface EnqueueClient {
  /**
   * Add a single notification job to the queue.
   * @param request - The notification request details
   * @returns Result with correlation ID and job ID or error
   */
  addNotificationJob(request: NotificationRequest): Promise<AddNotificationJobResult>;
  
  /**
   * Add multiple notification jobs to the queue in batch.
   * @param requests - Array of notification requests
   * @returns Array of results for each job
   */
  addNotificationJobs(requests: NotificationRequest[]): Promise<AddNotificationJobResult[]>;
  
  /**
   * Add a service control job to manage service lifecycle.
   * @param data - The service control job data
   * @returns Result with job ID or error
   */
  addServiceControlJob(data: ServiceControlJobData): Promise<AddServiceControlJobResult>;
  
  /**
   * Close the queue connections gracefully.
   */
  close(): Promise<void>;
}

/**
 * Creates an enqueue client for adding jobs to the notification and service control queues.
 * 
 * @param connection - Redis connection configuration
 * @param connection.host - Redis host address
 * @param connection.port - Redis port number
 * @returns EnqueueClient instance
 * 
 * @example
 * ```typescript
 * const client = createEnqueueClient({ host: 'localhost', port: 6379 });
 * 
 * await client.addNotificationJob({
 *   templateName: 'emiReminder',
 *   channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
 *   recipient: { email: 'user@example.com', phoneNumber: '+919876543210' },
 *   variables: { userName: 'John', amount: '₹5,000' }
 * });
 * 
 * await client.close();
 * ```
 */
export function createEnqueueClient(connection: { host: string; port: number }): EnqueueClient {
  const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION_QUEUE, { connection });
  const serviceControlQueue = new Queue(QUEUE_NAMES.SERVICE_CONTROL_QUEUE, { connection });

  const addNotificationJob = async (
    request: NotificationRequest
  ): Promise<AddNotificationJobResult> => {
    const correlationId = request.correlationId || generateCorrelationId();

    try {
      if (!request.templateName) {
        return { correlationId, error: 'Template name is required' };
      }

      if (!request.channels || request.channels.length === 0) {
        return { correlationId, error: 'At least one channel is required' };
      }

      const validationError = validateRecipientForChannels(request.recipient, request.channels);
      if (validationError) {
        return { correlationId, error: validationError };
      }

      const bullmqPriority = request.priority || NotificationPriority.NORMAL;

      let delay = 0;
      if (request.scheduledAt) {
        const scheduledTime = new Date(request.scheduledAt).getTime();
        const now = Date.now();
        delay = Math.max(0, scheduledTime - now);
      }

      const jobData: NotificationJobData = {
        correlationId,
        templateName: request.templateName,
        variables: request.variables,
        channels: request.channels,
        deliveryMode: request.deliveryMode || DeliveryMode.BROADCAST,
        priority: request.priority || NotificationPriority.NORMAL,
        recipient: request.recipient,
        metadata: request.metadata,
        scheduledAt: request.scheduledAt,
        expiresAt: request.expiresAt,
      };

      const job = await notificationQueue.add(
        JOB_TYPES.SEND_NOTIFICATION,
        jobData,
        {
          priority: bullmqPriority,
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          jobId: request.idempotencyKey || undefined,
        }
      );

      return {
        correlationId,
        jobId: job?.id,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        correlationId,
        error: errorMessage,
      };
    }
  };

  const addNotificationJobs = async (
    requests: NotificationRequest[]
  ): Promise<AddNotificationJobResult[]> => {
    return Promise.all(requests.map(request => addNotificationJob(request)));
  };

  const addServiceControlJob = async (
    data: ServiceControlJobData
  ): Promise<AddServiceControlJobResult> => {
    try {
      const job = await serviceControlQueue.add(
        JOB_TYPES.SERVICE_CONTROL,
        data,
        {
          priority: 1, // High priority
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );
      return { jobId: job?.id };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { error: errorMessage };
    }
  };

  const close = async (): Promise<void> => {
    await notificationQueue.close();
    await serviceControlQueue.close();
  };

  return {
    addNotificationJob,
    addNotificationJobs,
    addServiceControlJob,
    close,
  };
}

function validateRecipientForChannels(
  recipient: NotificationRequest['recipient'],
  channels: NotificationChannel[]
): string | null {
  for (const channel of channels) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        if (!recipient.email) {
          return 'Email address is required for EMAIL channel';
        }
        break;
      case NotificationChannel.WHATSAPP:
      case NotificationChannel.SMS:
        if (!recipient.phoneNumber) {
          return 'Phone number is required for WHATSAPP/SMS channel';
        }
        break;
      case NotificationChannel.IN_APP:
        if (!recipient.userId) {
          return 'User ID is required for IN_APP channel';
        }
        break;
      case NotificationChannel.PUSH:
        if (!recipient.userId) {
          return 'User ID is required for PUSH channel';
        }
        break;
    }
  }
  return null;
}

function generateCorrelationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default createEnqueueClient;