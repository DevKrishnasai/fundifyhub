/**
 * Channel Adapters
 *
 * Each channel adapter implements the ChannelAdapter interface
 * and handles the actual sending of notifications through that channel.
 * Adapters are responsible for:
 * - Connecting to external services (SMTP, WhatsApp, SMS providers)
 * - Formatting messages for the specific channel
 * - Handling channel-specific errors
 * - Health checks
 */

export * from './base-adapter';
export * from './email-adapter';
export * from './whatsapp-adapter';
export * from './in-app-adapter';
