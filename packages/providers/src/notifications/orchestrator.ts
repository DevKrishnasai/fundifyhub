/**
 * Notification orchestrator entrypoint.
 * Re-exports the NotificationService singleton with naming aligned to architecture docs.
 */
export {
  NotificationService,
  getNotificationService,
  type NotificationServiceConfig,
} from './notification-service';
