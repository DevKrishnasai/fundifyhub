/**
 * In-App Notification Adapter
 *
 * Handles storing in-app notifications in the database.
 * These notifications appear in the user's notification center.
 */

import { createLogger } from '@fundifyhub/logger';
import { NotificationChannel } from '@fundifyhub/types';
import { prisma } from '@fundifyhub/prisma';
import {
  BaseChannelAdapter,
  type ChannelSendParams,
  type ChannelSendResult,
} from './base-adapter';

const logger = createLogger({ serviceName: 'InAppAdapter' });

/** Extended params for in-app notifications */
export interface InAppSendParams extends ChannelSendParams {
  /** User ID to deliver notification to */
  userId: string;
  /** Notification title */
  title?: string;
  /** Action URL when clicked */
  actionUrl?: string;
  /** Related request ID */
  requestId?: string;
  /** Related loan ID */
  loanId?: string;
  /** Related EMI schedule ID */
  emiScheduleId?: string;
  /** Auto-dismiss after seconds (0 = no auto-dismiss) */
  autoDismissSeconds?: number;
}

/**
 * In-App notification adapter
 * Stores notifications directly in the database for display in the UI
 */
export class InAppAdapter extends BaseChannelAdapter {
  readonly channel = NotificationChannel.IN_APP;

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    // Verify database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      this._initialized = true;
      this._isAvailable = true;
      logger.info('In-App adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize In-App adapter: database connection failed');
      throw error;
    }
  }

  /**
   * Send (store) an in-app notification
   */
  async send(params: ChannelSendParams): Promise<ChannelSendResult> {
    if (!this._initialized) {
      return this.failureResult('Adapter not initialized', 'not_initialized');
    }

    const inAppParams = params as InAppSendParams;
    let { userId, title, content, actionUrl, requestId, loanId, emiScheduleId } = inAppParams;

    if (!userId) {
      return this.failureResult('userId is required for in-app notifications', 'missing_user_id');
    }

    // Validate related entities exist before creating notification
    try {
      // Check if request exists (if requestId provided)
      if (requestId) {
        const requestExists = await prisma.request.findFirst({
          where: { OR: [{ id: requestId }, { requestNumber: requestId }] },
          select: { id: true },
        });
        if (!requestExists) {
          logger.warn(`Cannot create in-app notification: request ${requestId} does not exist`);
          return this.failureResult(`Request ${requestId} not found`, 'invalid_request_id');
        }
        // Use the actual database ID for the foreign key
        const actualRequestId = requestExists.id;
        if (actualRequestId !== requestId) {
          logger.info(`Converting request number ${requestId} to database ID ${actualRequestId}`);
          requestId = actualRequestId;
        }
      }

      // Check if loan exists (if loanId provided)
      if (loanId) {
        const loanExists = await prisma.loan.findUnique({
          where: { id: loanId },
          select: { id: true },
        });
        if (!loanExists) {
          logger.warn(`Cannot create in-app notification: loan ${loanId} does not exist`);
          return this.failureResult(`Loan ${loanId} not found`, 'invalid_loan_id');
        }
      }

      // Check if EMI schedule exists (if emiScheduleId provided)
      if (emiScheduleId) {
        const emiScheduleExists = await prisma.eMISchedule.findUnique({
          where: { id: emiScheduleId },
          select: { id: true },
        });
        if (!emiScheduleExists) {
          logger.warn(`Cannot create in-app notification: EMI schedule ${emiScheduleId} does not exist`);
          return this.failureResult(`EMI schedule ${emiScheduleId} not found`, 'invalid_emi_schedule_id');
        }
      }

      const notification = await prisma.inAppNotification.create({
        data: {
          userId,
          title: title || 'Notification',
          message: content,
          actionUrl,
          requestId,
          loanId,
          emiScheduleId,
          isRead: false,
        },
      });

      logger.info(`In-app notification created for user ${userId}`);

      return this.successResult(notification.id, {
        userId,
        title: notification.title,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to create in-app notification: ${errorMessage}`);
      return this.failureResult(errorMessage, 'database_error');
    }
  }

  /**
   * Check if database is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Shutdown the adapter
   */
  async shutdown(): Promise<void> {
    this._isAvailable = false;
    this._initialized = false;
    logger.info('In-App adapter shutdown');
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await prisma.inAppNotification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.inAppNotification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.inAppNotification.count({
        where: { userId, isRead: false },
      });
    } catch {
      return 0;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ): Promise<Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    actionUrl: string | null;
    createdAt: Date;
  }>> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false } = options || {};

      return await prisma.inAppNotification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        select: {
          id: true,
          title: true,
          message: true,
          isRead: true,
          actionUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch {
      return [];
    }
  }
}

/** Singleton instance */
let inAppAdapterInstance: InAppAdapter | null = null;

/**
 * Get or create In-App adapter singleton
 */
export function getInAppAdapter(): InAppAdapter {
  if (!inAppAdapterInstance) {
    inAppAdapterInstance = new InAppAdapter();
  }
  return inAppAdapterInstance;
}

export default InAppAdapter;
