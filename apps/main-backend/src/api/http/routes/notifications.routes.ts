/**
 * Notifications Routes
 *
 * GET /notifications - List notifications
 * GET /notifications/unread-count - Get unread count
 * PUT /notifications/:id/read - Mark notification as read
 * PUT /notifications/read-all - Mark all notifications as read
 * GET /notifications/preferences - Get user notification preferences
 * PUT /notifications/preferences - Update user notification preferences
 *
 * @module api/http/routes/notifications
 */

import { Router } from 'express';
import {
  authenticateUser,
  requireAuthentication,
  asyncHandler,
} from '../middlewares';
import { notificationsController } from '../controllers';
import { prisma } from '@fundifyhub/prisma';

const router: Router = Router();

/**
 * GET /notifications
 * List notifications for current user
 */
router.get(
  '/',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { prisma } = req.app.locals;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { userId: user.id },
      }),
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
        },
      },
    });
  })
);

/**
 * GET /notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { prisma } = req.app.locals;

    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { count },
    });
  })
);

/**
 * PUT /notifications/:id/read
 * Mark notification as read
 */
router.put(
  '/:id/read',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { id } = req.params;
    const { prisma } = req.app.locals;

    const notification = await prisma.notification.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: notification,
    });
  })
);

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 */
router.put(
  '/read-all',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { prisma } = req.app.locals;

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { updated: result.count },
    });
  })
);

/**
 * GET /notifications/preferences
 * Get user notification preferences
 */
router.get(
  '/preferences',
  authenticateUser,
  requireAuthentication,
  asyncHandler(notificationsController.getPreferences)
);

/**
 * PUT /notifications/preferences
 * Update user notification preferences
 */
router.put(
  '/preferences',
  authenticateUser,
  requireAuthentication,
  asyncHandler(notificationsController.updatePreferences)
);

export default router;
