/**
 * Notification Adapter
 * 
 * Wraps @fundifyhub/providers/notifications for event-driven notifications.
 * Publishes domain events → orchestrator consumes and routes to channels.
 * 
 * @module infra-adapters/notification
 */

/**
 * Event-driven notification orchestrator wrapper
 * 
 * Instead of directly sending notifications, we publish domain events
 * that the notification system consumes and routes.
 */
export class NotificationAdapter {
  /**
   * Publish domain event for notification processing
   * 
   * @example
   * ```ts
   * await notificationAdapter.publishEvent('UserRegistered', {
   *   userId: '123',
   *   email: 'user@example.com',
   *   fullName: 'John Doe'
   * })
   * ```
   */
  async publishEvent(eventType: string, data: Record<string, any>): Promise<void> {
    try {
      // TODO: (agent) Import notification orchestrator from @fundifyhub/providers
      // TODO: (agent) Call orchestrator.publishEvent(eventType, data)
      // TODO: (agent) Orchestrator will:
      //   - Map event type to templates
      //   - Get user preferences
      //   - Route to appropriate channels (email, WhatsApp, etc.)
      //   - Enqueue to job-worker if async

      console.log('[NotificationAdapter] Event published (stub):', { eventType, data });
    } catch (err) {
      console.error('[NotificationAdapter] Failed to publish event:', err);
      // Don't re-throw - notifications are optional
    }
  }

  /**
   * Send direct notification (bypass event system)
   * 
   * Use only for critical notifications that can't wait for async processing.
   */
  async sendDirect(
    userId: string,
    channel: 'email' | 'whatsapp' | 'sms' | 'push' | 'in-app',
    message: any
  ): Promise<void> {
    try {
      // TODO: (agent) Import specific channel adapter from @fundifyhub/providers
      // TODO: (agent) Call channel-specific send method
      // TODO: (agent) Handle channel-specific errors

      console.log('[NotificationAdapter] Direct notification sent (stub):', {
        userId,
        channel,
      });
    } catch (err) {
      console.error('[NotificationAdapter] Failed to send direct notification:', err);
      // Don't re-throw - notifications are optional
    }
  }

  /**
   * Send email
   */
  async sendEmail(
    toEmail: string,
    subject: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: (agent) Import email adapter from @fundifyhub/providers
      // TODO: (agent) Call emailAdapter.send({
      //   to: toEmail,
      //   subject,
      //   template: templateName,
      //   variables
      // })

      console.log('[NotificationAdapter] Email sent (stub):', { toEmail, subject });
    } catch (err) {
      console.error('[NotificationAdapter] Failed to send email:', err);
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(
    phoneNumber: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: (agent) Import WhatsApp adapter from @fundifyhub/providers
      // TODO: (agent) Call whatsappAdapter.send({
      //   to: phoneNumber,
      //   template: templateName,
      //   variables
      // })

      console.log('[NotificationAdapter] WhatsApp sent (stub):', { phoneNumber });
    } catch (err) {
      console.error('[NotificationAdapter] Failed to send WhatsApp:', err);
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      // TODO: (agent) Import SMS adapter from @fundifyhub/providers
      // TODO: (agent) Call smsAdapter.send({ to: phoneNumber, message })

      console.log('[NotificationAdapter] SMS sent (stub):', { phoneNumber });
    } catch (err) {
      console.error('[NotificationAdapter] Failed to send SMS:', err);
    }
  }

  /**
   * Send push notification
   */
  async sendPush(userId: string, title: string, message: string): Promise<void> {
    try {
      // TODO: (agent) Import push adapter from @fundifyhub/providers
      // TODO: (agent) Get user's device tokens
      // TODO: (agent) Call pushAdapter.send({ deviceTokens, title, message })

      console.log('[NotificationAdapter] Push sent (stub):', { userId });
    } catch (err) {
      console.error('[NotificationAdapter] Failed to send push:', err);
    }
  }
}

export const notificationAdapter = new NotificationAdapter();
