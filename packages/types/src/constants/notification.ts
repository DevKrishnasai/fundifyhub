/**
 * Notification-related constants and enums
 * Aligned with Prisma schema
 */

export enum NotificationCategoryType {
  SECURITY = 'SECURITY',
  TRANSACTIONAL = 'TRANSACTIONAL',
  REMINDER = 'REMINDER',
  MARKETING = 'MARKETING',
  SYSTEM = 'SYSTEM',
}

export const NOTIFICATION_CATEGORIES = Object.values(NotificationCategoryType);

export enum NotificationPriorityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  BULK = 'BULK',
}

export const NOTIFICATION_PRIORITIES = Object.values(NotificationPriorityLevel);
