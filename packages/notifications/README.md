# @fundifyhub/notifications

A comprehensive, multi-channel notification service for FundifyHub applications. Supports Email, WhatsApp, Push, SMS, and In-App notifications with automatic retries, delivery tracking, and user preference management.

## Features

- 📧 **Multi-Channel Support** - Email, WhatsApp, SMS, Push, In-App
- 🔄 **Delivery Modes** - BROADCAST, INDEPENDENT, FALLBACK, SINGLE
- ⚡ **Retry Logic** - Exponential backoff with configurable strategies
- 🚦 **Rate Limiting** - Per-channel rate limiting with queue support
- 📝 **Template System** - Render templates from @fundifyhub/templates
- 🔔 **Real-Time** - In-app notifications via Socket.IO
- 📱 **Push Notifications** - Web Push (VAPID) support
- 📊 **Delivery Tracking** - Full notification lifecycle tracking
- 🎯 **Priority Levels** - CRITICAL, HIGH, NORMAL, LOW, BULK

## Installation

```bash
pnpm add @fundifyhub/notifications
```

## Quick Start

```typescript
import { NotificationService, createNotification, NotificationChannel, DeliveryMode } from '@fundifyhub/notifications';

// Initialize service
const notificationService = NotificationService.getInstance();
await notificationService.initialize();

// Send using builder pattern
const notification = createNotification('OTP_VERIFICATION')
  .to({ email: 'user@example.com', phoneNumber: '+919876543210' })
  .withVariables({ otpCode: '123456', expiresInMinutes: 10 })
  .viaEmailAndWhatsApp()
  .independent() // Different OTP per channel
  .highPriority()
  .build();

const result = await notificationService.send(notification);
```

## Delivery Modes

### BROADCAST (Default)
Same content sent to all channels. Use for password reset links, welcome messages.

```typescript
const notification = createNotification('PASSWORD_RESET')
  .to({ email: 'user@example.com', phoneNumber: '+919876543210' })
  .withVariables({ resetLink: 'https://...' })
  .via([NotificationChannel.EMAIL, NotificationChannel.WHATSAPP])
  .broadcast()
  .build();
```

### INDEPENDENT
Each channel gets unique content (e.g., different OTP per channel).

```typescript
const notification = createNotification('OTP_VERIFICATION')
  .to({ email: 'user@example.com', phoneNumber: '+919876543210' })
  .withVariables({ baseVars: '...' })
  .via([NotificationChannel.EMAIL, NotificationChannel.WHATSAPP])
  .independent()
  .withVariableGenerator((channel, baseVars) => ({
    ...baseVars,
    otpCode: generateOTP(), // Different OTP per channel
  }))
  .build();
```

### FALLBACK
Try channels in order, stop on first success.

```typescript
const notification = createNotification('CRITICAL_ALERT')
  .to({ email: 'user@example.com', phoneNumber: '+919876543210' })
  .withVariables({ alertMessage: '...' })
  .via([NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP])
  .fallback() // Try push first, then email, then WhatsApp
  .build();
```

## Channel Adapters

### Email Adapter
Uses nodemailer for SMTP-based email delivery.

```typescript
import { EmailAdapter, getEmailAdapter } from '@fundifyhub/notifications';

const emailAdapter = getEmailAdapter();
await emailAdapter.initialize({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: { user: 'user', pass: 'pass' },
  fromEmail: 'noreply@fundifyhub.com',
});
```

### WhatsApp Adapter
Uses whatsapp-web.js for WhatsApp Business messaging.

```typescript
import { WhatsAppAdapter, getWhatsAppAdapter } from '@fundifyhub/notifications';

const whatsAppAdapter = getWhatsAppAdapter();
await whatsAppAdapter.initialize();
```

### Push Adapter
Uses Web Push (VAPID) for browser push notifications.

```typescript
import { PushAdapter, getPushAdapter, PushSubscription } from '@fundifyhub/notifications';

const pushAdapter = getPushAdapter();
await pushAdapter.initialize({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
  vapidSubject: 'mailto:admin@fundifyhub.com',
});

// Send to a subscription
const result = await pushAdapter.send({
  recipient: JSON.stringify(subscription), // PushSubscription from browser
  subject: 'New Payment',
  content: 'Your EMI payment of ₹5,000 has been received.',
  priority: NotificationPriority.HIGH,
  metadata: {
    title: 'Payment Received',
    icon: '/icons/payment.png',
    actionUrl: '/dashboard/payments',
  },
});
```

### In-App Adapter
Stores notifications in the database for display in the UI.

```typescript
import { InAppAdapter, getInAppAdapter } from '@fundifyhub/notifications';

const inAppAdapter = getInAppAdapter();
await inAppAdapter.initialize();
```

## Retry Configuration

Each priority level has default retry settings:

| Priority | Max Attempts | Initial Delay | Max Delay | Strategy |
|----------|--------------|---------------|-----------|----------|
| CRITICAL | 5 | 500ms | 1 min | Exponential |
| HIGH | 4 | 1s | 2 min | Exponential |
| NORMAL | 3 | 2s | 5 min | Exponential |
| LOW | 2 | 5s | 10 min | Exponential |
| BULK | 2 | 10s | 15 min | Linear |

Custom retry config:

```typescript
const notification = createNotification('CUSTOM')
  .to({ email: 'user@example.com' })
  .withVariables({ ... })
  .viaEmail()
  .withRetryConfig({
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
  })
  .build();
```

## Rate Limiting

Default rate limits per channel:

| Channel | Max Requests | Window |
|---------|--------------|--------|
| EMAIL | 100 | 1 min |
| WHATSAPP | 50 | 1 min |
| SMS | 30 | 1 min |
| PUSH | 500 | 1 min |
| IN_APP | 1000 | 1 min |

## API Reference

### NotificationService

```typescript
class NotificationService {
  static getInstance(config?: NotificationServiceConfig): NotificationService;
  static resetInstance(): void;
  async initialize(): Promise<void>;
  async send<T extends string>(request: NotificationRequest<T>): Promise<NotificationResult>;
  async shutdown(): Promise<void>;
}
```

### NotificationBuilder

```typescript
const notification = createNotification('TEMPLATE_NAME')
  .to(recipient)                    // Set recipient
  .withVariables(vars)              // Set template variables
  .via(channels)                    // Set channels array
  .viaEmail()                       // Shorthand for email only
  .viaWhatsApp()                    // Shorthand for WhatsApp only
  .viaEmailAndWhatsApp()            // Shorthand for both
  .broadcast()                      // Set BROADCAST mode
  .independent()                    // Set INDEPENDENT mode
  .fallback()                       // Set FALLBACK mode
  .single()                         // Set SINGLE mode
  .critical()                       // Set CRITICAL priority
  .highPriority()                   // Set HIGH priority
  .lowPriority()                    // Set LOW priority
  .withRetryConfig(config)          // Custom retry config
  .withVariableGenerator(fn)        // For INDEPENDENT mode
  .scheduledAt(timestamp)           // Schedule for later
  .expiresAt(timestamp)             // Set expiry
  .withMetadata(data)               // Add metadata
  .build();                         // Build the request
```

## Types

All types are exported from `@fundifyhub/types`:

- `NotificationChannel` - Enum: EMAIL, WHATSAPP, SMS, PUSH, IN_APP
- `NotificationStatus` - Enum: PENDING, PROCESSING, SENT, DELIVERED, etc.
- `NotificationPriority` - Enum: CRITICAL, HIGH, NORMAL, LOW, BULK
- `DeliveryMode` - Enum: BROADCAST, INDEPENDENT, FALLBACK, SINGLE
- `NotificationRequest` - Main request interface
- `NotificationResult` - Result interface
- `ChannelRateLimitConfig` - Rate limit configuration
- `PushOptions`, `EmailOptions`, `WhatsAppOptions`, etc.

## License

MIT
