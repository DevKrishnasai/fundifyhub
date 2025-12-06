/**
 * Notifications Routes
 *
 * GET /notifications/preferences - Get user notification preferences
 * PUT /notifications/preferences - Update user notification preferences
 * GET /notifications/in-app - Get in-app notifications
 * POST /notifications/in-app/:notificationId/read - Mark a notification as read
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

const router: Router = Router();

router.get(
  '/preferences',
  authenticateUser,
  requireAuthentication,
  asyncHandler(notificationsController.getPreferences)
);

router.put(
  '/preferences',
  authenticateUser,
  requireAuthentication,
  asyncHandler(notificationsController.updatePreferences)
);

router.get(
  '/in-app',
  authenticateUser,
  requireAuthentication,
  asyncHandler(notificationsController.getInAppNotifications)
);

router.post(
  '/in-app/:notificationId/read',
  authenticateUser,
  requireAuthentication,
  asyncHandler(notificationsController.markAsRead)
);

export default router;
