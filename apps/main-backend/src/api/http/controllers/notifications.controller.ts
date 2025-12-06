/**
 * Notifications Controller
 *
 * Handles HTTP requests related to notifications.
 *
 * @module api/http/controllers/notifications
 */
import { notificationsService } from '../../../domain/notifications';
import type { Request, Response } from 'express';

export const notificationsController = {
  async getPreferences(req: Request, res: Response) {
    // const preferences = await notificationsService.getPreferences(req.user.id, req.user);
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },

  async updatePreferences(req: Request, res: Response) {
    // const preferences = await notificationsService.updatePreferences(req.user.id, req.body, req.user);
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },

  async getInAppNotifications(req: Request, res: Response) {
    // const notifications = await notificationsService.getInAppNotifications(req.user.id, req.query, req.user);
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },

  async markAsRead(req: Request, res: Response) {
    // const notification = await notificationsService.markAsRead(req.params.notificationId, req.user.id, req.user);
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },
};
