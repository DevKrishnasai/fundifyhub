# @fundifyhub/providers

Pluggable provider abstractions for FundifyHub applications. This package provides a unified interface for external services like payments, storage, caching, and audit logging.

## Features

- 💳 **Payments** - Razorpay, Manual (Cash/Cheque/Bank Transfer)
- 📁 **Storage** - UploadThing (S3-ready interface)
- 🗄️ **Cache** - Redis-based caching with TTL management
- 📝 **Audit** - Prisma-based audit logging with batching
- 🔌 **Pluggable** - Easy to add new providers

## Installation

```bash
pnpm add @fundifyhub/providers
```

## Quick Start

### Payment Provider

```typescript
import { PaymentProviderFactory, PaymentProviderType } from '@fundifyhub/providers';

// Create a Razorpay provider
const razorpay = PaymentProviderFactory.createProvider(PaymentProviderType.RAZORPAY, {
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
});

// Create a payment order
const order = await razorpay.createOrder({
  amount: 50000, // ₹500.00 in paise
  currency: 'INR',
  receipt: 'order_123',
  notes: { emiScheduleId: 'emi_456' },
});

// Verify payment
const isValid = await razorpay.verifyPayment({
  orderId: order.data!.orderId,
  paymentId: 'pay_xyz',
  signature: 'razorpay_signature',
});
```

### Storage Provider

```typescript
import { UploadThingProvider } from '@fundifyhub/providers';

const storage = new UploadThingProvider({
  apiKey: process.env.UPLOADTHING_SECRET!,
});
await storage.initialize();

// Delete a file
await storage.delete('file_key');

// Get file info
const info = await storage.getFileInfo('file_key');
```

### Cache Provider

```typescript
import { RedisCacheProvider, getCacheProvider } from '@fundifyhub/providers';

// Get singleton instance
const cache = getCacheProvider();
await cache.initialize({
  host: 'localhost',
  port: 6379,
});

// Basic operations
await cache.set('user:123', { name: 'John' }, 3600); // TTL: 1 hour
const user = await cache.get('user:123');
await cache.delete('user:123');

// Batch operations
await cache.setMany([
  { key: 'key1', value: 'val1', ttl: 3600 },
  { key: 'key2', value: 'val2', ttl: 3600 },
]);
const values = await cache.getMany(['key1', 'key2']);

// Pattern deletion
await cache.deleteByPattern('user:*');

// Stats
const stats = await cache.getStats();
console.log(stats); // { hits, misses, size }
```

### Audit Provider

```typescript
import { PrismaAuditProvider, getAuditProvider } from '@fundifyhub/providers';

// Get singleton instance
const audit = getAuditProvider();
await audit.initialize();

// Log an action
await audit.log({
  action: 'UPDATE',
  resource: 'User',
  resourceId: 'user_123',
  actorId: 'admin_456',
  actorRole: 'SUPER_ADMIN',
  before: { email: 'old@example.com' },
  after: { email: 'new@example.com' },
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

// Query audit logs
const logs = await audit.query({
  resource: 'User',
  resourceId: 'user_123',
  startDate: new Date('2025-01-01'),
  endDate: new Date(),
});

// Cleanup old logs
await audit.cleanup(90); // Delete logs older than 90 days
```

## Payment Providers

### Razorpay Provider

Full integration with Razorpay payment gateway.

```typescript
const razorpay = PaymentProviderFactory.createProvider(PaymentProviderType.RAZORPAY, {
  keyId: 'rzp_key_xxx',
  keySecret: 'rzp_secret_xxx',
  webhookSecret: 'webhook_secret', // Optional: for webhook verification
});

// Create order
const order = await razorpay.createOrder({
  amount: 100000, // ₹1000.00
  currency: 'INR',
  receipt: 'order_123',
});

// Verify payment signature
const isValid = await razorpay.verifyPayment({
  orderId: order.data!.orderId,
  paymentId: 'pay_xxx',
  signature: 'signature_xxx',
});

// Fetch payment details
const payment = await razorpay.getPaymentDetails('pay_xxx');

// Process refund
const refund = await razorpay.processRefund({
  paymentId: 'pay_xxx',
  amount: 50000, // ₹500.00 partial refund
  reason: 'Customer requested',
});
```

### Manual Payment Provider

For Cash, Cheque, and Bank Transfer payments.

```typescript
const manual = PaymentProviderFactory.createProvider(PaymentProviderType.MANUAL);

// Record a cash payment
const payment = await manual.createOrder({
  amount: 50000,
  currency: 'INR',
  receipt: 'manual_123',
  notes: {
    paymentMethod: 'CASH',
    receivedBy: 'agent_456',
    collectedAt: new Date().toISOString(),
  },
});
```

## Cache Provider

Redis-based caching with comprehensive features.

### Configuration

```typescript
interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string; // Default: 'fundifyhub:'
  defaultTtl?: number; // Default: 3600 (1 hour)
}
```

### Cache Key Prefixes

```typescript
export const CACHE_KEY_PREFIXES = {
  USER: 'user:',
  SESSION: 'session:',
  REQUEST: 'request:',
  LOAN: 'loan:',
  ANALYTICS: 'analytics:',
  RATE_LIMIT: 'ratelimit:',
  OTP: 'otp:',
};
```

## Audit Provider

Prisma-based audit logging with batching for performance.

### Audit Entry Structure

```typescript
interface AuditEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT' | 'EXPORT';
  resource: string;
  resourceId?: string;
  actorId: string;
  actorRole: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: string[];
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}
```

### Sensitive Data Masking

Automatically masks sensitive fields like passwords, tokens, secrets.

```typescript
// Before masking
{ password: 'secret123', email: 'user@example.com' }

// After masking
{ password: '[REDACTED]', email: 'user@example.com' }
```

## Types

All provider interfaces and types are exported from `@fundifyhub/types`:

- `IPaymentProvider` - Payment provider interface
- `IStorageProvider` - Storage provider interface
- `ICacheProvider` - Cache provider interface
- `IAuditProvider` - Audit provider interface
- `PaymentProviderType` - Enum: RAZORPAY, MANUAL
- `PaymentResult`, `RefundResult`, etc.

## License

MIT
