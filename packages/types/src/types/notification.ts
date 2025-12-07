/**
 * Notification-related types
 */

import type { NotificationCategoryType, NotificationPriorityLevel } from '../constants/notification';

export interface InAppNotificationDTO {
  id: string;
  userId: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  icon?: string | null;
  category: NotificationCategoryType;
  priority: NotificationPriorityLevel;
  isRead: boolean;
  readAt?: Date | string | null;
  isArchived: boolean;
  archivedAt?: Date | string | null;
  requestId?: string | null;
  loanId?: string | null;
  emiScheduleId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Job payload for notification worker
 * Used when enqueuing notifications via job-worker
 */
export interface NotificationJob {
  userId: string;
  title: string;
  message: string;
  category?: NotificationCategoryType;
  priority?: NotificationPriorityLevel;
  actionUrl?: string;
  icon?: string;
  requestId?: string;
  loanId?: string;
  emiScheduleId?: string;
  metadata?: Record<string, unknown>;
}
