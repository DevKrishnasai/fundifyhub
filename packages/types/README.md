# @fundifyhub/types

Centralized TypeScript types, constants, enums, and Zod schemas for FundifyHub applications. This package is the single source of truth for all shared type definitions.

## Features

- 📝 **Type Safety** - Comprehensive TypeScript types
- ✅ **Validation** - Zod schemas for runtime validation
- 🏷️ **Constants** - Centralized enums and constants
- 🔄 **Workflow** - Stage-based request lifecycle types
- 🔔 **Notifications** - Multi-channel notification types
- 💳 **Payments** - Payment provider interfaces
- 📁 **Storage** - Storage provider interfaces
- 🗄️ **Cache** - Cache provider interfaces

## Installation

```bash
pnpm add @fundifyhub/types
```

## Quick Start

```typescript
import {
  // Roles
  ROLES,
  UserRole,
  
  // Request lifecycle
  REQUEST_STAGE,
  SUB_STATUS,
  STAGE_LABELS,
  STAGE_COLORS,
  
  // Notifications
  NotificationChannel,
  NotificationPriority,
  DeliveryMode,
  
  // Payments
  PaymentProviderType,
  PaymentOrderStatus,
  
  // Validation schemas
  loginSchema,
  registerSchema,
  
} from '@fundifyhub/types';
```

## User Roles

```typescript
import { ROLES, UserRole, ROLE_HIERARCHY, ROLE_LABELS } from '@fundifyhub/types';

// Available roles
ROLES.CUSTOMER        // 'CUSTOMER'
ROLES.AGENT           // 'AGENT'
ROLES.DISTRICT_ADMIN  // 'DISTRICT_ADMIN'
ROLES.STATE_ADMIN     // 'STATE_ADMIN'
ROLES.SUPER_ADMIN     // 'SUPER_ADMIN'

// Role hierarchy (higher = more access)
ROLE_HIERARCHY[ROLES.SUPER_ADMIN]  // 5
ROLE_HIERARCHY[ROLES.CUSTOMER]     // 1

// Display labels
ROLE_LABELS[ROLES.DISTRICT_ADMIN]  // 'District Admin'
```

## Request Stages (10-Stage System)

The simplified stage-based request lifecycle replaces the previous 28-status system.

```typescript
import { 
  REQUEST_STAGE, 
  SUB_STATUS, 
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_DESCRIPTIONS,
} from '@fundifyhub/types';

// Main stages
REQUEST_STAGE.DRAFT          // Customer creating request
REQUEST_STAGE.REVIEW         // Admin reviewing
REQUEST_STAGE.OFFER          // Offer negotiation
REQUEST_STAGE.INSPECTION     // Asset verification
REQUEST_STAGE.DOCUMENTATION  // Signatures & bank details
REQUEST_STAGE.DISBURSEMENT   // Money transfer
REQUEST_STAGE.ACTIVE         // Loan running
REQUEST_STAGE.COMPLETED      // Loan repaid ✓
REQUEST_STAGE.REJECTED       // Declined ✗
REQUEST_STAGE.CANCELLED      // Cancelled ✗

// Sub-statuses per stage
SUB_STATUS.REVIEW.PENDING         // 'PENDING'
SUB_STATUS.REVIEW.IN_REVIEW       // 'IN_REVIEW'
SUB_STATUS.REVIEW.INFO_REQUIRED   // 'INFO_REQUIRED'

SUB_STATUS.OFFER.SENT             // 'SENT'
SUB_STATUS.OFFER.ACCEPTED         // 'ACCEPTED'
SUB_STATUS.OFFER.DECLINED         // 'DECLINED'

SUB_STATUS.INSPECTION.SCHEDULED   // 'SCHEDULED'
SUB_STATUS.INSPECTION.IN_PROGRESS // 'IN_PROGRESS'
SUB_STATUS.INSPECTION.COMPLETED   // 'COMPLETED'

// Display configuration
STAGE_LABELS[REQUEST_STAGE.REVIEW]        // 'Under Review'
STAGE_DESCRIPTIONS[REQUEST_STAGE.REVIEW]  // 'Admin is reviewing your request'
STAGE_COLORS[REQUEST_STAGE.REVIEW]        // { bg: '...', text: '...', border: '...' }
```

## Notification Types

```typescript
import {
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  DeliveryMode,
  DEFAULT_RETRY_CONFIGS,
  DEFAULT_CHANNEL_RATE_LIMITS,
  type NotificationRequest,
  type NotificationResult,
} from '@fundifyhub/types';

// Channels
NotificationChannel.EMAIL
NotificationChannel.WHATSAPP
NotificationChannel.SMS
NotificationChannel.PUSH
NotificationChannel.IN_APP

// Priority levels
NotificationPriority.CRITICAL  // 1
NotificationPriority.HIGH      // 2
NotificationPriority.NORMAL    // 3
NotificationPriority.LOW       // 4
NotificationPriority.BULK      // 5

// Delivery modes
DeliveryMode.BROADCAST    // Same content to all channels
DeliveryMode.INDEPENDENT  // Unique content per channel
DeliveryMode.FALLBACK     // Try channels in order
DeliveryMode.SINGLE       // Single channel only
```

## Payment Types

```typescript
import {
  PaymentProviderType,
  PaymentOrderStatus,
  type IPaymentProvider,
  type PaymentResult,
  type RefundResult,
} from '@fundifyhub/types';

// Provider types
PaymentProviderType.RAZORPAY
PaymentProviderType.MANUAL

// Order status
PaymentOrderStatus.CREATED
PaymentOrderStatus.ATTEMPTED
PaymentOrderStatus.PAID
PaymentOrderStatus.FAILED
PaymentOrderStatus.EXPIRED
```

## Validation Schemas

All schemas are Zod-based for runtime validation.

```typescript
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  createRequestSchema,
} from '@fundifyhub/types';

// Login validation
const result = loginSchema.safeParse({
  email: 'user@example.com',
  password: 'password123',
});

if (result.success) {
  // result.data is typed
} else {
  // result.error contains validation errors
}

// With Express middleware
import { validateBody } from '@fundifyhub/utils';
router.post('/login', validateBody(loginSchema), loginController);
```

## Socket Types

```typescript
import {
  type ServerToClientEvents,
  type ClientToServerEvents,
  type SocketData,
  SOCKET_EVENTS,
} from '@fundifyhub/types';

// Event names
SOCKET_EVENTS.REQUEST_UPDATED
SOCKET_EVENTS.NOTIFICATION_NEW
SOCKET_EVENTS.PAYMENT_RECEIVED
SOCKET_EVENTS.EMI_REMINDER

// Type-safe socket
const socket: Socket<ServerToClientEvents, ClientToServerEvents>;
```

## Provider Interfaces

All provider interfaces follow a consistent pattern:

```typescript
import {
  type IPaymentProvider,
  type IStorageProvider,
  type ICacheProvider,
  type IAuditProvider,
} from '@fundifyhub/types';

// Example: Payment provider
interface IPaymentProvider {
  initialize(): Promise<void>;
  createOrder(input: CreateOrderInput): Promise<PaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult>;
  getPaymentDetails(paymentId: string): Promise<PaymentResult>;
  processRefund(input: RefundInput): Promise<RefundResult>;
  handleWebhook?(payload: unknown, signature: string): Promise<WebhookResult>;
}
```

## UI Constants

```typescript
import {
  STAGE_COLORS,
  STAGE_ICONS,
  CUSTOMER_ACTION_REQUIRED,
  ADMIN_ACTION_REQUIRED,
  AGENT_ACTION_REQUIRED,
} from '@fundifyhub/types';

// Colors for badges
const colors = STAGE_COLORS[REQUEST_STAGE.ACTIVE];
// { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' }

// Icons (Lucide icon names)
const icon = STAGE_ICONS[REQUEST_STAGE.OFFER]; // 'BadgeDollarSign'

// Action-required stages
CUSTOMER_ACTION_REQUIRED.includes(stage) // true if customer needs to act
ADMIN_ACTION_REQUIRED.includes(stage)    // true if admin needs to act
AGENT_ACTION_REQUIRED.includes(stage)    // true if agent needs to act
```

## Package Exports

The package exports are organized by domain:

```typescript
// Main barrel export
export * from './constants';
export * from './types';
export * from './auth-schemas';
export * from './stage-constants';
export * from './stage-workflow-types';
export * from './notification-types';
export * from './socket-types';

// Domain-specific
export * from './auth';
export * from './request';
export * from './loan';
export * from './payment';
export * from './notification';
export * from './providers';
export * from './ui';
export * from './common';
```

## License

MIT
