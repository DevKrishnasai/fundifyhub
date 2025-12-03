import { Router, type Router as ExpressRouter } from 'express';
import {
  getNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
  archiveNotificationController,
  deleteNotificationController,
} from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /notifications
 * Get paginated notifications for the authenticated user
 * Query params: page, limit, type, isRead, isArchived
 */
router.get('/', getNotificationsController);

/**
 * GET /notifications/unread-count
 * Get count of unread notifications for the authenticated user
 */
router.get('/unread-count', getUnreadCountController);

/**
 * PUT /notifications/read-all
 * Mark all notifications as read for the authenticated user
 * IMPORTANT: This must be before /:id routes to prevent "read-all" being matched as :id
 */
router.put('/read-all', markAllAsReadController);

/**
 * PUT /notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', markAsReadController);

/**
 * PUT /notifications/:id/archive
 * Archive a notification
 */
router.put('/:id/archive', archiveNotificationController);

/**
 * DELETE /notifications/:id
 * Delete a notification
 */
router.delete('/:id', deleteNotificationController);

export default router;
