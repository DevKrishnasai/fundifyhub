/**
 * Notification validation schemas
 */

import { z } from 'zod';

export const ListNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  category: z.string().optional(),
  requestId: z.string().optional(),
  loanId: z.string().optional(),
});

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;

export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID required'),
});

export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;

export const MarkMultipleNotificationsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID required'),
});

export type MarkMultipleNotificationsReadInput = z.infer<typeof MarkMultipleNotificationsReadSchema>;

export const ArchiveNotificationSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID required'),
});

export type ArchiveNotificationInput = z.infer<typeof ArchiveNotificationSchema>;
