/**
 * Notifications Service (Domain Layer)
 * 
 * Manages user notification preferences and in-app notifications.
 * Note: This is for user-facing notification management (preferences, inbox).
 * Actual notification dispatch happens in @fundifyhub/providers/notifications.
 * 
 * In-App Notification States:
 * CREATED → SENT → READ (or DELETED)
 * 
 * @module domain/notifications
 */

import { prisma } from '@fundifyhub/prisma';
import { ValidationError, NotFoundError, ForbiddenError, ErrorCode } from '@fundifyhub/utils';
import type { InAppNotification, NotificationPreference } from '@fundifyhub/types';

export interface NotificationPreferencesInput {
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  inAppNotifications?: boolean;
  dailyDigest?: boolean;
  unsubscribeAll?: boolean;
}

export interface GetInAppNotificationsInput {
  page?: number;
  pageSize?: number;
  status?: 'SENT' | 'READ' | 'DELETED';
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * NotificationsService - User notification management
 * 
 * Handles:
 * 1. User notification preferences (which channels to use)
 * 2. In-app notification inbox (stored notifications)
 * 3. Notification read status tracking
 * 
 * Does NOT handle:
 * - Actual notification dispatch (that's in providers layer)
 * - Email/WhatsApp/SMS sending (that's in providers)
 * - Event triggering (handled by domain event handlers)
 */
export class NotificationsService {
  private static instance: NotificationsService;

  static getInstance(): NotificationsService {
    if (!NotificationsService.instance) {
      NotificationsService.instance = new NotificationsService();
    }
    return NotificationsService.instance;
  }

  /**
   * Get user notification preferences
   * 
   * Returns user's notification settings for all channels.
   * 
   * @throws NotFoundError if user doesn't exist
   * @throws ForbiddenError if not own profile or admin
   */
  async getPreferences(userId: string, user: any): Promise<NotificationPreference> {
    try {
      if (!userId) {
        throw new ValidationError('User ID required', ErrorCode.INVALID_INPUT);
      }

      // Check access: user can view own preferences, admins can view any
      if (user.id !== userId && !user.roles?.includes('SUPER_ADMIN')) {
        throw new ForbiddenError('Cannot view other users preferences', ErrorCode.FORBIDDEN);
      }

      // TODO: (agent) Fetch user's NotificationPreference record
      // TODO: (agent) If not exists, create defaults for user
      // TODO: (agent) Return preferences

      console.log(`[NotificationsService.getPreferences] Preferences retrieved for user: ${userId}`);

      return {} as NotificationPreference;
    } catch (err) {
      console.error(
        `[NotificationsService.getPreferences] Failed to get preferences for user ${userId}:`,
        err
      );
      throw err;
    }
  }

  /**
   * Update notification preferences
   * 
   * User can update their own notification settings.
   * 
   * @throws NotFoundError if user doesn't exist
   * @throws ForbiddenError if not own profile
   */
  async updatePreferences(userId: string, input: NotificationPreferencesInput, user: any): Promise<NotificationPreference> {
    try {
      if (!userId) {
        throw new ValidationError('User ID required', ErrorCode.INVALID_INPUT);
      }

      // Only user can update their own preferences
      if (user.id !== userId) {
        throw new ForbiddenError('Cannot update other users preferences', ErrorCode.FORBIDDEN);
      }

      // TODO: (agent) Fetch user's NotificationPreference
      // TODO: (agent) Update provided fields
      // TODO: (agent) Handle unsubscribeAll: if true, disable all channels
      // TODO: (agent) Save to database
      // TODO: (agent) Emit PreferencesUpdated event

      console.log(`[NotificationsService.updatePreferences] Preferences updated for user: ${userId}`, input);

      return {} as NotificationPreference;
    } catch (err) {
      console.error(
        `[NotificationsService.updatePreferences] Failed to update preferences for user ${userId}:`,
        err
      );
      throw err;
    }
  }

  /**
   * Get in-app notifications for user
   * 
   * Returns user's notification inbox with pagination.
   * 
   * @throws ValidationError if pagination invalid
   */
  async getInAppNotifications(
    userId: string,
    input: GetInAppNotificationsInput,
    user: any
  ): Promise<{ notifications: InAppNotification[]; total: number; unreadCount: number }> {
    try {
      const page = input.page || 1;
      const pageSize = Math.min(input.pageSize || 20, 100);

      if (page < 1 || pageSize < 1) {
        throw new ValidationError('Invalid pagination', ErrorCode.INVALID_INPUT);
      }

      // Only user can view their own notifications
      if (user.id !== userId) {
        throw new ForbiddenError('Cannot view other users notifications', ErrorCode.FORBIDDEN);
      }

      // TODO: (agent) Build WHERE clause for notifications
      // TODO: (agent) Filter by status if provided
      // TODO: (agent) Filter by type if provided
      // TODO: (agent) Apply date range if provided
      // TODO: (agent) Fetch notifications ordered by createdAt DESC
      // TODO: (agent) Count unread (status !== READ)
      // TODO: (agent) Return paginated results with unread count

      console.log('[NotificationsService.getInAppNotifications] Notifications retrieved', {
        userId,
        page,
        pageSize,
      });

      return { notifications: [], total: 0, unreadCount: 0 };
    } catch (err) {
      console.error(
        '[NotificationsService.getInAppNotifications] Failed to get notifications:',
        err
      );
      throw err;
    }
  }

  /**
   * Mark single notification as read
   * 
   * @throws NotFoundError if notification doesn't exist
   * @throws ForbiddenError if not owner
   */
  async markAsRead(notificationId: string, userId: string, user: any): Promise<InAppNotification> {
    try {
      if (!notificationId || !userId) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      // Only user can mark their own notifications
      if (user.id !== userId) {
        throw new ForbiddenError('Cannot update other users notifications', ErrorCode.FORBIDDEN);
      }

      // TODO: (agent) Fetch notification, verify userId matches
      // TODO: (agent) Update status to READ
      // TODO: (agent) Update readAt timestamp
      // TODO: (agent) Return updated notification

      console.log(`[NotificationsService.markAsRead] Notification marked as read: ${notificationId}`);

      return {} as InAppNotification;
    } catch (err) {
      console.error(
        `[NotificationsService.markAsRead] Failed to mark notification ${notificationId} as read:`,
        err
      );
      throw err;
    }
  }

  /**
   * Mark all notifications as read for user
   * 
   * @throws ForbiddenError if not own user
   */
  async markAllAsRead(userId: string, user: any): Promise<{ markedCount: number }> {
    try {
      if (!userId) {
        throw new ValidationError('User ID required', ErrorCode.INVALID_INPUT);
      }

      // Only user can mark their own notifications
      if (user.id !== userId) {
        throw new ForbiddenError('Cannot update other users notifications', ErrorCode.FORBIDDEN);
      }

      // TODO: (agent) Find all notifications with status !== READ
      // TODO: (agent) Update all to READ with readAt timestamp
      // TODO: (agent) Count updated records
      // TODO: (agent) Emit AllNotificationsRead event (optional)

      console.log(`[NotificationsService.markAllAsRead] All notifications marked as read for user: ${userId}`);

      return { markedCount: 0 };
    } catch (err) {
      console.error(
        `[NotificationsService.markAllAsRead] Failed to mark all as read for user ${userId}:`,
        err
      );
      throw err;
    }
  }

  /**
   * Delete notification
   * 
   * @throws NotFoundError if notification doesn't exist
   * @throws ForbiddenError if not owner
   */
  async deleteNotification(notificationId: string, userId: string, user: any): Promise<void> {
    try {
      if (!notificationId || !userId) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      // Only user can delete their own notifications
      if (user.id !== userId) {
        throw new ForbiddenError('Cannot delete other users notifications', ErrorCode.FORBIDDEN);
      }

      // TODO: (agent) Fetch notification, verify userId matches
      // TODO: (agent) Update status to DELETED
      // TODO: (agent) Set deletedAt timestamp

      console.log(`[NotificationsService.deleteNotification] Notification deleted: ${notificationId}`);
    } catch (err) {
      console.error(
        `[NotificationsService.deleteNotification] Failed to delete notification ${notificationId}:`,
        err
      );
      throw err;
    }
  }

  /**
   * Create in-app notification (internal - called by event handlers)
   * 
   * @internal
   */
  async createInAppNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    relatedEntityId?: string
  ): Promise<InAppNotification> {
    try {
      // TODO: (agent) Create InAppNotification record
      // TODO: (agent) Set status to CREATED initially
      // TODO: (agent) Store createdAt timestamp

      console.log(`[NotificationsService.createInAppNotification] Notification created for user: ${userId}`, {
        type,
      });

      return {} as InAppNotification;
    } catch (err) {
      console.error('[NotificationsService.createInAppNotification] Failed to create notification:', err);
      throw err;
    }
  }
}

export const notificationsService = NotificationsService.getInstance();
