/**
 * Zod schemas for notification payloads exchanged between backend and frontend.
 * These schemas keep runtime validation aligned across clients while providing
 * strong TypeScript inference through zod.infer.
 */
import { z } from 'zod'

/**
 * Schema describing a single in-app notification item.
 */
export const notificationItemSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  type: z.string().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.string().optional(),
  channel: z.string().optional(),
  actionUrl: z.string().url().optional(),
  isRead: z.boolean().optional(),
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  readAt: z.union([z.string(), z.date(), z.null()]).optional(),
  archivedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  data: z.record(z.unknown()).optional(),
})

export type NotificationItemSchema = z.infer<typeof notificationItemSchema>

/**
 * Schema for paginated notification list responses from the API.
 */
export const notificationListSchema = z.object({
  notifications: z.array(notificationItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

export type NotificationList = z.infer<typeof notificationListSchema>

/**
 * Schema for unread notification count responses.
 */
export const notificationUnreadCountSchema = z.object({
  count: z.number(),
})

export type NotificationUnreadCount = z.infer<typeof notificationUnreadCountSchema>
