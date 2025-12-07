/**
 * Server-side utility types
 * Types that are only relevant for backend services (job-worker, main-backend)
 */

import type { 
  SERVICE_NAMES, 
  SERVICE_CONTROL_ACTIONS,
  NotificationChannel,
  DeliveryMode,
  NotificationPriority,
} from '@fundifyhub/types';

/**
 * Job data for service control operations
 * Used to start/stop/restart background services
 */
export interface ServiceControlJobData {
  serviceName: SERVICE_NAMES;
  action: SERVICE_CONTROL_ACTIONS;
  config?: Record<string, unknown>;
}

/**
 * Job data for notification dispatch
 * Used by the notification worker
 * This extends NotificationRequest with optional expiry
 */
export interface NotificationJobData {
  correlationId: string;
  templateName: string;
  variables: Record<string, unknown>;
  channels: NotificationChannel[];
  deliveryMode: DeliveryMode;
  priority?: NotificationPriority;
  recipient: {
    userId?: string;
    email?: string;
    phone?: string;
    name?: string;
  };
  expiresAt?: string | Date;
  metadata?: Record<string, unknown>;
}
