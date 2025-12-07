import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { NotificationCategoryType, NotificationPriorityLevel, Prisma } from '@fundifyhub/prisma';
import logger from '../../utils/logger';

/**
 * GET /notifications
 * Get paginated in-app notifications for the authenticated user
 */
export async function getNotificationsController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Filter options
    const category = req.query.category as NotificationCategoryType | undefined;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const isArchived = req.query.isArchived === 'true' ? true : false; // Default to not showing archived

    // Build where clause
    const where: Prisma.InAppNotificationWhereInput = {
      userId,
      isArchived,
    };

    if (category && Object.values(NotificationCategoryType).includes(category)) {
      where.category = category;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // Get notifications with count
    const [notifications, total] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              stage: true,
              subStatus: true,
            },
          },
          loan: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.inAppNotification.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + notifications.length < total,
        },
      },
    });
  } catch (error) {
    logger.error('Get notifications error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
}

/**
 * GET /notifications/unread-count
 * Get count of unread notifications
 */
export async function getUnreadCountController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const count = await prisma.inAppNotification.count({
      where: {
        userId: req.user.id,
        isRead: false,
        isArchived: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    logger.error('Get unread count error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
}

/**
 * PUT /notifications/:id/read
 * Mark a notification as read
 */
export async function markAsReadController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.inAppNotification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    if (notification.isRead) {
      res.json({ success: true, message: 'Already read', data: notification });
      return;
    }

    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (error) {
    logger.error('Mark as read error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
}

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
export async function markAllAsReadController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await prisma.inAppNotification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    logger.error('Mark all as read error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
}

/**
 * PUT /notifications/:id/archive
 * Archive a notification
 */
export async function archiveNotificationController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.inAppNotification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Notification archived',
      data: updated,
    });
  } catch (error) {
    logger.error('Archive notification error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to archive notification' });
  }
}

/**
 * DELETE /notifications/:id
 * Delete a notification
 */
export async function deleteNotificationController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.inAppNotification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    await prisma.inAppNotification.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    logger.error('Delete notification error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
}

/**
 * Creates an in-app notification for a user
 * Used internally by other controllers/services
 */
export async function createInAppNotification(params: {
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
}): Promise<void> {
  try {
    await prisma.inAppNotification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        category: params.category || NotificationCategoryType.TRANSACTIONAL,
        priority: params.priority || NotificationPriorityLevel.NORMAL,
        actionUrl: params.actionUrl,
        icon: params.icon,
        requestId: params.requestId,
        loanId: params.loanId,
        emiScheduleId: params.emiScheduleId,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch (error) {
    logger.error('Create in-app notification error:', error instanceof Error ? error : new Error(String(error)));
    // Don't throw - notification creation should not break the main flow
  }
}
