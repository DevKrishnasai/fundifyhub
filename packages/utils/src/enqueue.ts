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

/** Notification job data for queue processing */
export interface NotificationJobData {
  correlationId: string;
  templateName: string;
  variables: Record<string, unknown>;
  channels: NotificationChannel[];
  deliveryMode: DeliveryMode;
  priority: NotificationPriority;
  recipient: {
    userId?: string;
    email?: string;
    phoneNumber?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
  scheduledAt?: string;
  expiresAt?: string;
}

/** Service control job data */
export interface ServiceControlJobData {
  serviceName: SERVICE_NAMES;
  action: SERVICE_CONTROL_ACTIONS;
  config?: Record<string, unknown>;
}

/** Result of adding a notification job */
export interface AddNotificationJobResult {
  correlationId: string;
  jobId?: string;
  error?: string;
}

/** Result of adding a service control job */
export interface AddServiceControlJobResult {
  jobId?: string;
  error?: string;
}

export interface EnqueueClient {
  addNotificationJob(request: NotificationRequest): Promise<AddNotificationJobResult>;
  addNotificationJobs(requests: NotificationRequest[]): Promise<AddNotificationJobResult[]>;
  addServiceControlJob(data: ServiceControlJobData): Promise<AddServiceControlJobResult>;
  close(): Promise<void>;
}

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