# Fundify – System Architecture (Canonical Reference)

> **Last Updated:** December 2024  
> **Version:** 2.1 – Aligned with Prisma Schema & Engineering Guidelines

Fundify is a multi-tenant pawn/asset-backed loan platform operating at **district level** with:
- **Multi-role access**: Customer, Agent, District Admin, State Admin, Super Admin
- **Region-based handling**: Country → State → District → Warehouse hierarchy
- **Asset-backed loans** with pledging, inspection, and custody tracking
- **Auctions** for defaulted loans with bidding system
- **Multi-channel notifications**: Email, WhatsApp, SMS, Push, In-App
- **Realtime updates** via Socket.IO

---

## 0. Core Principles

| Principle | Description |
|-----------|-------------|
| **Schema is Canonical** | `packages/prisma/prisma/schema.prisma` is the source of truth. Only evolve incrementally via migrations. |
| **Domain-First** | Business logic lives in `domain/**` services, NOT in controllers, providers, or utils. |
| **Provider-Agnostic** | Payments, notifications, storage, cache, realtime – all behind interfaces in `packages/providers`. Easy to swap. |
| **Type-Safe** | Strict TypeScript everywhere. No `any`. Shared types from `@fundifyhub/types`. |
| **Region + Role Aware** | Visibility and actions driven by region assignments and user roles. |
| **Centralized Packages** | Types/enums/constants in `packages/types`, pure helpers in `packages/utils`, SDKs in `packages/providers`. No duplication in apps. |

---

## 1. Monorepo Structure

```
fundifyhub-2.0/
├── apps/
│   ├── main-backend/         # REST API, domain services, auth, RBAC, webhooks, realtime
│   ├── job-worker/           # Background workers (notifications, cron jobs)
│   └── frontend/             # Next.js 14+ App Router (all roles, unified UI)
│
├── packages/
│   ├── types/                # Shared enums, interfaces, constants (mirrors Prisma)
│   ├── utils/                # Pure helpers (EMI calc, formatters, validators) – NO I/O
│   ├── providers/            # External integrations (payments, storage, notifications, cache, realtime)
│   │   └── src/
│   │       ├── payments/     # Razorpay, Manual
│   │       ├── storage/      # UploadThing
│   │       ├── cache/        # Redis
│   │       ├── notifications/# Channels, templates, orchestrator
│   │       │   ├── channels/ # email, whatsapp, sms, push, in-app adapters
│   │       │   └── templates/# Notification templates per event
│   │       ├── realtime/     # Socket.IO helpers
│   │       └── audit/        # Audit logging
│   ├── prisma/               # Prisma schema, client, migrations
│   └── logger/               # Centralized logging (pino)
│
├── infra/                    # Docker compose, deployment configs
├── scripts/                  # Build/clean scripts
└── docs/                     # Additional documentation
```

### Package Aliases (from `tsconfig.base.json`)

```
@fundifyhub/types       → packages/types/src
@fundifyhub/utils       → packages/utils/src
@fundifyhub/utils/server → packages/utils/src/server
@fundifyhub/providers   → packages/providers/src
@fundifyhub/prisma      → packages/prisma/src
@fundifyhub/logger      → packages/logger/src
```

> **IMPORTANT:** The legacy packages `packages/notifications` and `packages/templates` are being consolidated into `packages/providers/src/notifications/`. All new notification and template work must go in `packages/providers`.

---

## 2. Domain Model (Aligned with Prisma Schema)

> **The Prisma schema in `packages/prisma/prisma/schema.prisma` is CANONICAL.**  
> Do NOT rewrite it. Only evolve incrementally via proper migrations.

### 2.1 User & Roles

| Model | Purpose |
|-------|---------|
| `User` | Core user entity with `roles: UserRole[]` (multi-role support) |
| `UserRole` enum | `CUSTOMER`, `AGENT`, `DISTRICT_ADMIN`, `STATE_ADMIN`, `SUPER_ADMIN` |
| `UserStateAssignment` | Links user to states (for STATE_ADMIN) |
| `UserDistrictAssignment` | Links user to districts (for DISTRICT_ADMIN, AGENT) |
| `Session` | JWT session tracking with device info, revocation support |
| `BankDetails` | User bank accounts for loan disbursement |

### 2.2 Geography Hierarchy

```
Country (code: IN, US, etc.)
    └── State (code: TN, KA, etc.)
        └── District (code: CHE, BLR, etc.)
            └── Warehouse (asset storage locations)
```

All models support soft delete (`deletedAt`, `deletedBy`).

### 2.3 Request / Case Lifecycle

| Model | Purpose |
|-------|---------|
| `Request` | Loan application with stage-based workflow (10 stages) |
| `RequestStage` enum | `DRAFT`, `REVIEW`, `OFFER`, `INSPECTION`, `DOCUMENTATION`, `DISBURSEMENT`, `ACTIVE`, `COMPLETED`, `REJECTED`, `CANCELLED` |
| `AdminOffer` | Loan offers made by admin with revision history |
| `OfferStatus` enum | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVISED`, `CANCELLED` |
| `Inspection` | Asset verification by agent |
| `InspectionStatus` enum | `PENDING`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `Comment` | Request-level comments (internal/external) |
| `Document` | File attachments (UploadThing integration) |
| `DocumentStatus` enum | `ACTIVE`, `ARCHIVED`, `DELETED` |

**Action Flags (denormalized for fast filtering):**
- `requiresCustomerAction` – Customer needs to act
- `requiresAdminAction` – Admin needs to act
- `requiresAgentAction` – Agent needs to act
- `isBlocked` – Request is blocked, needs resolution

**Stage Workflow:**
```
DRAFT → REVIEW → OFFER ↔ (negotiation) → INSPECTION → DOCUMENTATION → DISBURSEMENT → ACTIVE
                                                                                        ↓
                                                                                   COMPLETED
                                                                                   or DEFAULTED → AUCTION
```

### 2.4 Loan & Payments

| Model | Purpose |
|-------|---------|
| `Loan` | Active loan with fixed terms (amount, rate, tenure, EMI) |
| `LoanStatus` enum | `ACTIVE`, `COMPLETED`, `DEFAULTED` |
| `EMISchedule` | Fixed EMI schedule per loan (dueDate, amount, status) |
| `EMIStatus` enum | `PENDING`, `PAID`, `OVERDUE`, `DEFAULTED` |
| `Payment` | Individual payments made (linked to EMI) |
| `PaymentOrder` | Razorpay order lifecycle tracking |
| `PaymentOrderStatus` enum | `CREATED`, `ATTEMPTED`, `PAID`, `FAILED`, `EXPIRED` |

### 2.5 Asset & Custody

| Model | Purpose |
|-------|---------|
| `Asset` | Collateral for loan with valuation, condition, depreciation |
| `AssetStatus` enum | `PLEDGED`, `RELEASED`, `IN_AUCTION`, `FORFEITED`, `AUCTIONED`, `SOLD` |
| `AssetCondition` enum | `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `DAMAGED` |
| `AssetMovement` | Chain of custody tracking (intake, transfer, release) |
| `MovementType` enum | `INTAKE`, `TRANSFER`, `AUCTION`, `RELEASE`, `DISPOSAL` |
| `Warehouse` | Storage locations with capacity tracking |

### 2.6 Auction System

| Model | Purpose |
|-------|---------|
| `AuctionListing` | Auction for defaulted loan assets |
| `AuctionStatus` enum | `DRAFT`, `SCHEDULED`, `ACTIVE`, `EXTENDED`, `ENDED`, `SOLD`, `UNSOLD`, `CANCELLED` |
| `AuctionBid` | Individual bids with auto-bid support |
| `BidStatus` enum | `ACTIVE`, `OUTBID`, `WINNING`, `WON`, `WITHDRAWN`, `REJECTED`, `CANCELLED` |

### 2.7 Notifications

| Model | Purpose |
|-------|---------|
| `NotificationLog` | Tracks all notification delivery attempts across channels |
| `NotificationPreference` | User preferences per channel/category |
| `InAppNotification` | User notification center items |
| `NotificationChannel` enum | `EMAIL`, `WHATSAPP`, `SMS`, `PUSH`, `IN_APP` |
| `NotificationDeliveryStatus` enum | `PENDING`, `PROCESSING`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `PERMANENTLY_FAILED`, `CANCELLED`, `SCHEDULED` |
| `NotificationPriorityLevel` enum | `CRITICAL`, `HIGH`, `NORMAL`, `LOW`, `BULK` |
| `NotificationCategoryType` enum | `SECURITY`, `TRANSACTIONAL`, `REMINDER`, `MARKETING`, `SYSTEM` |
| `DeliveryModeType` enum | `BROADCAST`, `INDEPENDENT`, `FALLBACK`, `SINGLE` |
| `BackoffStrategyType` enum | `FIXED`, `EXPONENTIAL`, `LINEAR` |

### 2.8 Audit & System

| Model | Purpose |
|-------|---------|
| `AuditLog` | Tracks all system actions with actor, entity, changes |
| `ServiceConfig` | Admin-configurable service settings (WhatsApp QR, etc.) |
| `SerialCounter` | Human-friendly serial numbers (REQ-001, LOAN-001) |
| `OTPVerification` | OTP tracking with attempt/resend limits |

---

## 3. Shared Packages

### 3.1 `packages/types` (`@fundifyhub/types`)

**Purpose:** Central place for all shared TypeScript types, enums, interfaces that mirror Prisma schema.

**Structure:**
```
src/
├── index.ts              # Main exports
├── constants.ts          # ROLES, TEMPLATE_NAMES, QUEUE_NAMES, global constants
├── stage-constants.ts    # REQUEST_STAGE, SUB_STATUS, stage configs
├── stage-workflow-types.ts # Workflow events, transitions
├── auth/                 # Auth-related types
├── common/               # Pagination, API response, shared utilities
├── request/              # Request domain types
├── loan/                 # Loan domain types
├── document/             # Document types
├── payment/              # Payment types
├── notification/         # Notification types
├── providers/            # Provider interfaces (PaymentProvider, FileStorageService, etc.)
└── ui/                   # Frontend-specific types
```

**Key Exports:**
- `ROLES`, `UserRole`, `ROLE_HIERARCHY`, `ADMIN_ROLES`
- `REQUEST_STAGE`, `SUB_STATUS`, `LOAN_STATUS`, `EMI_STATUS`
- `DOCUMENT_TYPE`, `DOCUMENT_CATEGORY`
- `NotificationChannel`, `NotificationPriority`
- Provider interfaces: `PaymentProvider`, `FileStorageService`, `CacheProvider`

**Rules:**
- All shared domain types go here.
- Apps must NOT redefine enums or types that exist here.
- When Prisma schema changes, update corresponding types here.

### 3.2 `packages/utils` (`@fundifyhub/utils`)

**Purpose:** Pure helper functions. **NO I/O** (no DB, no HTTP, no Redis).

**Structure:**
```
src/
├── index.ts          # Browser-safe exports
├── server.ts         # Node.js-only exports (enqueue, etc.)
├── emi.ts            # EMI calculations, breakdown, overdue checks
├── phone.ts          # Phone number formatting/validation
├── env-validation.ts # Zod-based env config loader
├── formatters.ts     # formatCurrency, formatDate (to be added)
├── validators.ts     # Shared zod schemas (to be added)
├── mappers.ts        # Context mappers (to be added)
└── workflow/         # Stage transition logic
```

**Key Functions:**
- `calculateEmiSchedule()`, `calculateEmiBreakdown()`, `isEmiOverdue()`
- `formatPhone()`, `validatePhone()`
- `loadConfig()` – Zod-based environment validation

**Rules:**
- No I/O operations allowed.
- Pure functions only.
- Reusable across backend, frontend, and workers.

### 3.3 `packages/prisma` (`@fundifyhub/prisma`)

**Purpose:** Prisma schema, client, migrations, seed.

**Structure:**
```
├── prisma/
│   ├── schema.prisma   # CANONICAL – source of truth
│   ├── migrations/     # Migration history
│   └── seed.ts         # Development seed data
├── src/
│   ├── index.ts        # Re-exports client + enums
│   └── client.ts       # Singleton PrismaClient
└── prisma.config.ts
```

**Rules:**
- **Schema is CANONICAL.** Do not rewrite, only evolve via migrations.
- All apps import `PrismaClient` and Prisma enums from `@fundifyhub/prisma`.
- Run `pnpm db:generate` after schema changes.

### 3.4 `packages/providers` (`@fundifyhub/providers`)

**Purpose:** All external integrations behind interfaces. Easy to swap providers.

#### Current State vs Target State

| Component | Current Location | Target Location | Status |
|-----------|------------------|-----------------|--------|
| Payment providers | `packages/providers/src/payments/` | Same | ✅ Done |
| Storage providers | `packages/providers/src/storage/` | Same | ✅ Done |
| Cache providers | `packages/providers/src/cache/` | Same | ✅ Done |
| Notification channels | `packages/notifications/src/channel-adapters/` | `packages/providers/src/notifications/channels/` | 🔄 Migration needed |
| Notification templates | `packages/templates/src/templates/` | `packages/providers/src/notifications/templates/` | 🔄 Migration needed |
| Notification service | `packages/notifications/src/notification-service.ts` | `packages/providers/src/notifications/orchestrator.ts` | 🔄 Migration needed |
| Realtime helpers | `packages/providers/src/realtime/` | Same | ✅ Done |
| Audit logging | `packages/providers/src/audit/` | Same | ✅ Done |

**Target Structure:**
```
src/
├── index.ts              # Main exports
├── payments/
│   ├── index.ts
│   ├── razorpay.ts       # Razorpay implementation
│   └── manual.ts         # Manual payment provider
├── storage/
│   ├── index.ts
│   └── uploadthing.ts    # UploadThing implementation
├── cache/
│   ├── index.ts
│   └── redis.ts          # Redis client + rate limiting
├── notifications/        # ALL notification logic here (TARGET)
│   ├── index.ts
│   ├── orchestrator.ts   # Notification dispatch logic
│   ├── channels/
│   │   ├── index.ts
│   │   ├── email.ts      # Gmail/SMTP adapter
│   │   ├── whatsapp.ts   # WhatsApp Web.js adapter
│   │   ├── sms.ts        # SMS adapter
│   │   ├── push.ts       # Push notification adapter
│   │   └── in-app.ts     # In-app notification adapter
│   └── templates/
│       ├── index.ts
│       ├── auth-templates.ts
│       ├── request-templates.ts
│       ├── loan-templates.ts
│       ├── payment-templates.ts
│       └── auction-templates.ts
├── realtime/
│   ├── index.ts
│   └── socket-helpers.ts # Socket.IO emit utilities
└── audit/
    ├── index.ts
    └── prisma-audit.ts   # Prisma-based audit logging
```

**Provider Interfaces (defined in `@fundifyhub/types/providers`):**
```typescript
interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<Order>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
  capturePayment(paymentId: string, amount: number): Promise<Payment>;
  refund(paymentId: string, amount: number): Promise<Refund>;
}

interface FileStorageService {
  upload(file: File, options: UploadOptions): Promise<FileMetadata>;
  getSignedUrl(fileKey: string, expiresIn?: number): Promise<string>;
  delete(fileKey: string): Promise<void>;
}

interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

interface NotificationChannelAdapter {
  send(message: ChannelMessage): Promise<SendResult>;
  isAvailable(): Promise<boolean>;
}
```

**Rules:**
- No business logic here – only SDK wrappers.
- All external SDK usage MUST go through this package.
- Apps use infra-adapters to call providers (see section 4).

> **Migration Note:** `packages/notifications` and `packages/templates` are legacy. Their contents must be consolidated into `packages/providers/src/notifications/` and then deleted.

### 3.5 `packages/logger` (`@fundifyhub/logger`)

**Purpose:** Centralized logging factory.

```typescript
import { createLogger } from '@fundifyhub/logger';
const logger = createLogger('service-name');
logger.info('message', { context });
```

**Rules:**
- No `console.log` in production code.
- All services use this logger.
- Include context: `userId`, `requestId`, `correlationId`.

---

## 4. Backend Architecture (`apps/main-backend`)

### 4.1 Current Structure (Legacy)

```
src/
├── server.ts                 # Express app setup
├── api/                      # Routes + Controllers mixed
│   ├── auth/
│   ├── requests/             # 3000+ line controller – GOD FILE
│   ├── payments/
│   ├── admin/
│   └── ...
├── domain/                   # EMPTY – needs implementation
├── services/                 # Legacy services – TO BE MIGRATED
├── socket/                   # Socket.IO server
├── types/                    # Local types – TO BE MOVED to packages/types
└── utils/                    # Mixed utilities – TO BE SPLIT
```

### 4.2 Target Architecture (Layered)

```
src/
├── server.ts
├── config/
│   ├── env.ts                # loadConfig() from @fundifyhub/utils
│   └── di.ts                 # Dependency injection / wiring
│
├── api/
│   ├── http/
│   │   ├── routes/           # Route definitions only
│   │   │   ├── auth.routes.ts
│   │   │   ├── requests.routes.ts
│   │   │   ├── loans.routes.ts
│   │   │   ├── auctions.routes.ts
│   │   │   ├── payments.routes.ts
│   │   │   ├── notifications.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── geography.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── controllers/      # Input validation, call domain, format response
│   │   │   ├── auth.controller.ts
│   │   │   ├── requests.controller.ts
│   │   │   ├── loans.controller.ts
│   │   │   └── ...
│   │   └── middlewares/
│   │       ├── auth.middleware.ts
│   │       ├── rbac.middleware.ts
│   │       ├── rate-limit.middleware.ts
│   │       └── error-handler.middleware.ts
│   └── webhooks/
│       └── payments/
│           └── razorpay.webhook.ts
│
├── domain/                   # ALL BUSINESS LOGIC HERE
│   ├── access-control/
│   │   ├── rbac.ts           # canView*, canManage*, canAssign*
│   │   └── role-utils.ts     # Permission builders, hierarchy
│   ├── auth/
│   │   ├── auth.service.ts   # Login, register, password, tokens
│   │   └── session.service.ts # Session management
│   ├── users/
│   │   └── users.service.ts  # Profile, roles, assignments
│   ├── requests/
│   │   ├── requests.service.ts
│   │   ├── requests.validators.ts
│   │   └── requests.events.ts
│   ├── loans/
│   │   ├── loans.service.ts
│   │   └── loans.events.ts
│   ├── assignments/
│   │   └── assignments.service.ts
│   ├── auctions/
│   │   ├── auctions.service.ts
│   │   └── auctions.events.ts
│   ├── payments/
│   │   └── payments.service.ts
│   ├── notifications/
│   │   └── notifications.service.ts
│   └── events/
│       ├── bus.ts            # In-process event bus
│       └── handlers/
│           ├── request.handlers.ts
│           ├── loan.handlers.ts
│           ├── payment.handlers.ts
│           └── auction.handlers.ts
│
├── infra-adapters/           # Wrap providers for domain use
│   ├── payments-adapter.ts
│   ├── storage-adapter.ts
│   ├── notification-adapter.ts
│   ├── cache-adapter.ts
│   ├── realtime-adapter.ts
│   └── audit-adapter.ts
│
└── socket/                   # Socket.IO server setup
```

### 4.3 Controller Pattern

Controllers are THIN. They:
1. Validate input (zod)
2. Call domain service
3. Format response

```typescript
// api/http/controllers/requests.controller.ts
import { z } from 'zod';
import { RequestsService } from '@/domain/requests/requests.service';

const createRequestSchema = z.object({
  requestedAmount: z.number().positive(),
  districtId: z.string().cuid(),
  asset: z.object({
    assetType: z.string(),
    brand: z.string(),
    model: z.string(),
    purchaseYear: z.number(),
  }),
});

export async function createRequestController(req: Request, res: Response) {
  const userId = req.user.id;
  const input = createRequestSchema.parse(req.body);
  
  const result = await RequestsService.create(userId, input);
  
  res.status(201).json({ success: true, data: result });
}
```

### 4.4 Domain Service Pattern

Domain services contain ALL business logic:

```typescript
// domain/requests/requests.service.ts
import { prisma } from '@fundifyhub/prisma';
import { eventBus } from '../events/bus';
import { canCreateRequest } from '../access-control/rbac';
import { ForbiddenError } from '@/utils/errors';

export class RequestsService {
  static async create(userId: string, input: CreateRequestInput): Promise<Request> {
    // 1. Load user and check permissions
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { districtAssignments: true }
    });
    if (!canCreateRequest(user)) {
      throw new ForbiddenError('Cannot create request');
    }
    
    // 2. Business logic
    const requestNumber = await this.generateRequestNumber();
    
    // 3. Persist
    const request = await prisma.request.create({
      data: {
        requestNumber,
        customerId: userId,
        districtId: input.districtId,
        requestedAmount: input.requestedAmount,
        stage: 'REVIEW',
        requiresAdminAction: true,
        asset: { create: input.asset },
      },
      include: { asset: true },
    });
    
    // 4. Emit domain event (for notifications, audit, etc.)
    eventBus.emit('request.created', { request, userId });
    
    return request;
  }
}
```

### 4.5 Infra Adapter Pattern

Adapters wrap providers for domain use:

```typescript
// infra-adapters/payments-adapter.ts
import { createRazorpayProvider } from '@fundifyhub/providers';
import config from '@/config/env';

const provider = createRazorpayProvider({
  keyId: config.RAZORPAY_KEY_ID,
  keySecret: config.RAZORPAY_KEY_SECRET,
});

export const PaymentsAdapter = {
  createOrder: (params) => provider.createOrder(params),
  verifySignature: (orderId, paymentId, signature) => 
    provider.verifySignature(orderId, paymentId, signature),
  capturePayment: (paymentId, amount) => provider.capturePayment(paymentId, amount),
};
```

### 4.6 RBAC (Access Control)

**Visibility Rules:**
| Role | Visibility |
|------|------------|
| `CUSTOMER` | Own requests/loans only |
| `AGENT` | Assigned requests in their districts |
| `DISTRICT_ADMIN` | All requests in their assigned districts |
| `STATE_ADMIN` | All requests in districts within their assigned states |
| `SUPER_ADMIN` | Global access |

**Implementation:**
```typescript
// domain/access-control/rbac.ts
export function canViewRequest(user: User, request: Request): boolean {
  if (user.roles.includes('SUPER_ADMIN')) return true;
  if (request.customerId === user.id) return true;
  if (request.assignedAgentId === user.id) return true;
  if (request.assignedAdminId === user.id) return true;
  return hasDistrictAccess(user, request.districtId);
}

export function canManageRequest(user: User, request: Request): boolean {
  if (!canViewRequest(user, request)) return false;
  return hasAnyRole(user, ['AGENT', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']);
}

export function canAssignAgent(user: User, request: Request): boolean {
  return hasAnyRole(user, ['DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']) 
    && hasDistrictAccess(user, request.districtId);
}
```

### 4.7 Migration Plan (Legacy → Target)

| Legacy Location | Target Location | Action |
|-----------------|-----------------|--------|
| `api/requests/controllers.ts` (3000+ lines) | `api/http/controllers/requests.controller.ts` + `domain/requests/requests.service.ts` | Split & migrate |
| `api/auth/controllers.ts` | `domain/auth/auth.service.ts` | Extract domain logic |
| `services/*.ts` | `domain/**/*.service.ts` | Migrate then delete |
| `utils/rbac.ts` | `domain/access-control/rbac.ts` | Move |
| `utils/uploadthing.ts` | `infra-adapters/storage-adapter.ts` | Wrap provider |
| `utils/notifications.ts` | `infra-adapters/notification-adapter.ts` | Wrap provider |
| `utils/socket-client.ts` | `infra-adapters/realtime-adapter.ts` | Move |
| `utils/cache.ts` | `infra-adapters/cache-adapter.ts` | Wrap provider |
| `utils/audit.ts` | `infra-adapters/audit-adapter.ts` | Wrap provider |
| `types/*.ts` | `@fundifyhub/types` | Move shared types |

---

## 5. Job Worker (`apps/job-worker`)

### 5.1 Purpose

- Process notification jobs from queues (email, WhatsApp, SMS, push, in-app)
- Run scheduled tasks (EMI overdue updates, reminder notifications)
- Handle async operations that shouldn't block HTTP responses

### 5.2 Structure

```
src/
├── index.ts              # Worker entry point
├── config/
│   └── env.ts
├── services/
│   └── emi-cron.service.ts
├── workers/
│   ├── email.worker.ts
│   ├── whatsapp.worker.ts
│   ├── sms.worker.ts
│   ├── push.worker.ts
│   └── inapp.worker.ts
└── utils/
```

### 5.3 Queue Processing (BullMQ + Redis)

```typescript
// workers/email.worker.ts
import { Worker } from 'bullmq';
import { renderTemplate, sendEmail } from '@fundifyhub/providers/notifications';

const emailWorker = new Worker('notifications:email', async (job) => {
  const { to, templateName, variables, logId, userId } = job.data;
  
  // 1. Render template
  const content = await renderTemplate(templateName, variables);
  
  // 2. Send via provider
  const result = await sendEmail({ to, subject: content.subject, html: content.html });
  
  // 3. Update NotificationLog
  await updateNotificationStatus(logId, result.success ? 'SENT' : 'FAILED');
  
  // 4. Emit realtime event
  if (result.success) {
    emitToUser(userId, 'notification.delivered', { logId });
  }
}, { connection: redisConnection });
```

---

## 6. Frontend Architecture (`apps/frontend`)

### 6.1 Current Structure

```
src/
├── app/                      # Next.js App Router pages
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── layout/
│   ├── request/
│   └── ...
├── contexts/
│   ├── AuthContext.tsx
│   └── SocketContext.tsx
├── hooks/
│   ├── queries/              # React Query hooks
│   └── ...
└── lib/
    ├── api-client.ts
    ├── urls.ts
    └── ...
```

### 6.2 Target Architecture

```
src/
├── app/                      # Route pages only (minimal logic)
├── components/
│   ├── ui/                   # Base UI components (shadcn)
│   ├── layout/               # App shell, sidebar, topbar
│   ├── features/             # Feature-specific components
│   │   ├── requests/
│   │   ├── loans/
│   │   ├── auctions/
│   │   └── notifications/
│   └── common/               # Shared components
├── lib/
│   ├── api/
│   │   ├── client.ts         # Axios/fetch wrapper with auth
│   │   └── endpoints.ts      # Centralized endpoint definitions
│   ├── adapters/             # One adapter per backend domain
│   │   ├── auth-adapter.ts
│   │   ├── requests-adapter.ts
│   │   ├── loans-adapter.ts
│   │   ├── auctions-adapter.ts
│   │   ├── payments-adapter.ts
│   │   ├── notifications-adapter.ts
│   │   ├── documents-adapter.ts
│   │   ├── geography-adapter.ts
│   │   └── realtime-adapter.ts
│   ├── auth/
│   │   ├── session.ts
│   │   └── guards.tsx
│   ├── hooks/                # React Query + custom hooks
│   │   ├── useAuth.ts
│   │   ├── useRequests.ts
│   │   ├── useLoans.ts
│   │   ├── useAuctions.ts
│   │   ├── useNotifications.ts
│   │   └── useRealtime.ts
│   ├── state/                # Zustand stores
│   │   ├── user.store.ts
│   │   └── notifications.store.ts
│   └── utils/
│       ├── format.ts
│       ├── role.ts           # isCustomer, isAgent, isAdmin helpers
│       └── routes.ts
└── providers/                # React providers
    ├── auth-provider.tsx
    ├── query-provider.tsx
    └── realtime-provider.tsx
```

### 6.3 Routing Strategy

**No role in URL.** Role determines behavior inside pages.

```
/                         # Landing (public)
/login                    # Login
/register                 # Registration
/dashboard                # Overview (role-aware)
/requests                 # Request list (role-aware filtering)
/requests/[id]            # Request detail (role-aware actions)
/loans                    # Loan list
/loans/[id]               # Loan detail
/auctions                 # Auction list
/auctions/[id]            # Auction detail + bidding
/notifications            # Notification center
/settings                 # User settings
/users                    # User management (admin only)
/geography                # Region management (admin only)
/warehouses               # Warehouse management (admin only)
```

### 6.4 Adapter + Hook Pattern

```typescript
// lib/adapters/requests-adapter.ts
import { apiClient } from '../api/client';
import type { Request, PaginatedResponse } from '@fundifyhub/types';

export const RequestsAdapter = {
  list: (params) => apiClient.get<PaginatedResponse<Request>>('/requests', { params }),
  getById: (id: string) => apiClient.get<Request>(`/requests/${id}`),
  create: (data) => apiClient.post<Request>('/requests', data),
  updateStage: (id, stage, data) => apiClient.patch<Request>(`/requests/${id}/stage`, { stage, ...data }),
};

// lib/hooks/useRequests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RequestsAdapter } from '../adapters/requests-adapter';

export function useRequests(params) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: () => RequestsAdapter.list(params),
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: RequestsAdapter.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
  });
}
```

### 6.5 Role-Based UI

```typescript
// lib/utils/role.ts
import type { User } from '@fundifyhub/types';
import { ROLES } from '@fundifyhub/types';

export const isCustomer = (user: User) => user.roles.includes(ROLES.CUSTOMER);
export const isAgent = (user: User) => user.roles.includes(ROLES.AGENT);
export const isDistrictAdmin = (user: User) => user.roles.includes(ROLES.DISTRICT_ADMIN);
export const isStateAdmin = (user: User) => user.roles.includes(ROLES.STATE_ADMIN);
export const isSuperAdmin = (user: User) => user.roles.includes(ROLES.SUPER_ADMIN);
export const isAnyAdmin = (user: User) => 
  isDistrictAdmin(user) || isStateAdmin(user) || isSuperAdmin(user);
export const canManageRequests = (user: User) => 
  isAgent(user) || isAnyAdmin(user);
```

---

## 7. Notification System

### 7.1 End-to-End Flow

```
1. Domain Event (e.g., request.stage_changed)
   ↓
2. Event Handler → notificationAdapter.publishEvent(event)
   ↓
3. Notification Orchestrator (packages/providers/notifications/orchestrator.ts):
   - Lookup NotificationPolicy for event type
   - Check user preferences (NotificationPreference)
   - Apply rate limiting
   - Create NotificationLog entries
   ↓
4. Push jobs to BullMQ queues (per channel)
   ↓
5. Workers process jobs:
   - Render templates (packages/providers/notifications/templates/)
   - Send via channel adapter (packages/providers/notifications/channels/)
   - Update NotificationLog status
   - Create InAppNotification if needed
   ↓
6. Emit realtime event: notification.new
```

### 7.2 Event Types

```typescript
type NotificationEventKey =
  | 'request.created' | 'request.stage_changed' | 'request.offer_made'
  | 'request.offer_accepted' | 'request.inspection_scheduled'
  | 'loan.disbursed' | 'loan.emi_due_soon' | 'loan.emi_overdue' | 'loan.defaulted'
  | 'auction.created' | 'auction.bid_placed' | 'auction.outbid' | 'auction.won' | 'auction.ended'
  | 'payment.success' | 'payment.failed'
  | 'auth.otp' | 'auth.login_alert' | 'auth.password_reset';
```

---

## 8. Realtime System

### 8.1 Architecture

- Backend: `socket.io` + Redis adapter for horizontal scaling
- Frontend: `socket.io-client` via `realtime-adapter`

### 8.2 Room Structure

| Room Pattern | Purpose |
|--------------|---------|
| `user:<userId>` | User-specific notifications |
| `request:<requestId>` | Request status updates |
| `loan:<loanId>` | Loan/EMI updates |
| `auction:<auctionId>` | Auction bids, status changes |
| `region:<districtId>` | Region-level broadcasts |

### 8.3 Event Types

```typescript
// Server → Client
'request.updated' | 'request.comment_added' | 'loan.updated'
'auction.bid_placed' | 'auction.status_changed' | 'notification.new'

// Client → Server
'join:request' | 'leave:request' | 'join:auction' | 'leave:auction'
```

### 8.4 Room Security

**Authorization on Join:**
```typescript
// Server-side join handler
socket.on('join:request', async (requestId) => {
  const user = socket.data.user; // From auth middleware
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  
  // Check RBAC before allowing join
  if (!canViewRequest(user, request)) {
    socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot view this request' });
    return;
  }
  
  socket.join(`request:${requestId}`);
  socket.emit('joined', { room: `request:${requestId}` });
});
```

**Auto-join user room on connect:**
```typescript
io.use(authMiddleware); // Verify JWT, populate socket.data.user

io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  socket.join(`user:${userId}`); // Always join own notification room
});
```

---

## 9. Error Handling

### 9.1 Error Class Hierarchy

```typescript
// Base application error
class AppError extends Error {
  constructor(
    public code: string,           // Machine-readable code (e.g., 'LOAN_NOT_FOUND')
    public message: string,        // Human-readable message
    public statusCode: number,     // HTTP status code
    public details?: unknown       // Additional context
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(message: string, details?: ZodError) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super('NOT_FOUND', `${entity}${id ? ` with ID ${id}` : ''} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMITED', 'Too many requests', 429, { retryAfter });
  }
}
```

### 9.2 Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;    // For debugging/support
  };
}

// Example response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "issues": [
        { "path": ["email"], "message": "Invalid email format" }
      ]
    },
    "requestId": "req_abc123"
  }
}
```

### 9.3 Error Handling Rules

1. **Controllers:** Wrap in try/catch, let error-handler middleware handle
2. **Domain Services:** Throw specific error types, never generic `Error`
3. **Logging:** Log all 5xx errors with full stack trace, 4xx as warnings
4. **Never expose:** Internal error details, stack traces, or database errors to clients

---

## 10. Security

### 10.1 Authentication & Sessions

- **JWT tokens** with refresh rotation, HttpOnly cookies in production
- **Session tracking** with revocation support (`Session` model)
- **Token expiry:** Access token 15min, Refresh token 7 days
- **Device tracking:** Browser, OS, IP stored per session

### 10.2 Authorization (RBAC)

- **RBAC** via `domain/access-control`, enforced in middleware
- **Region-based filtering:** Not multi-tenancy, but visibility scoped by district/state assignments
- **Permission checks:** Always in domain services, never skip in controllers

### 10.3 Input Validation

- **Zod schemas** for all external input (request body, query params)
- **Sanitization:** Strip HTML/scripts from user content
- **File uploads:** Validate MIME types, max sizes via UploadThing

### 10.4 Rate Limiting

| Endpoint Category | Limit | Window | Key |
|-------------------|-------|--------|-----|
| Auth (login/register) | 5 requests | 15 min | IP + email |
| OTP requests | 3 requests | 5 min | IP + phone/email |
| API (authenticated) | 100 requests | 1 min | User ID |
| API (unauthenticated) | 20 requests | 1 min | IP |
| Webhook endpoints | 1000 requests | 1 min | IP |

**Implementation:** Redis sliding window via `@fundifyhub/providers/cache`

### 10.5 Webhook Security

- **Razorpay:** Verify `X-Razorpay-Signature` header using HMAC-SHA256
- **Idempotency:** Store processed webhook IDs in Redis (24h TTL) to prevent replay
- **Timeout:** Respond within 5 seconds, queue heavy processing

### 10.6 Security Headers

```typescript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 11. Observability

- **Logging:** Structured JSON via `@fundifyhub/logger`, include `userId`, `requestId`, `correlationId`
- **Health checks:** `/health/live`, `/health/ready`
- **Metrics:** Prometheus endpoint at `/metrics`
- **Audit logging:** All significant actions logged to `AuditLog` table

---

## 12. Deployment

### Environment Variables (validated via `loadConfig()`)

```bash
# ============================================
# Core Configuration
# ============================================
NODE_ENV=development|staging|production
PORT=4000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

# ============================================
# Database
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/fundifyhub

# ============================================
# Redis (Cache + Queues)
# ============================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=                              # Optional, for production

# ============================================
# Authentication
# ============================================
JWT_SECRET=your-super-secret-jwt-key         # 256-bit minimum
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ============================================
# Payment Provider (Razorpay)
# ============================================
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx                  # For webhook signature verification

# ============================================
# File Storage (UploadThing)
# ============================================
UPLOADTHING_SECRET=sk_live_xxx
UPLOADTHING_APP_ID=xxx
UPLOADTHING_TOKEN=xxx                        # Alternative to SECRET+APP_ID

# ============================================
# Email (Gmail SMTP)
# ============================================
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx       # Google App Password, not login password

# ============================================
# WhatsApp (WhatsApp Web.js)
# ============================================
WHATSAPP_ENABLED=true|false
WHATSAPP_SESSION_PATH=./whatsapp-session     # Persistent session storage

# ============================================
# Feature Flags
# ============================================
ENABLE_WHATSAPP_NOTIFICATIONS=true|false
ENABLE_SMS_NOTIFICATIONS=true|false
ENABLE_PUSH_NOTIFICATIONS=true|false
ENABLE_AUCTIONS=true|false
ENABLE_MULTI_ROLE=true                       # Users can have multiple roles

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_WINDOW_MS=60000                   # 1 minute
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# Logging
# ============================================
LOG_LEVEL=debug|info|warn|error
LOG_FORMAT=json|pretty                       # pretty for development
```

### Docker Compose

```yaml
services:
  main-backend:
    build: ./apps/main-backend
    depends_on: [postgres, redis]
  job-worker:
    build: ./apps/job-worker
    depends_on: [redis]
  frontend:
    build: ./apps/frontend
  postgres:
    image: postgres:15
  redis:
    image: redis:7-alpine
```

---

## 13. Adding/Swapping Providers

### Payment Provider (e.g., add Stripe)

1. Implement `PaymentProvider` interface in `packages/providers/src/payments/stripe.ts`
2. Add factory `createStripeProvider(config)`
3. Export from `packages/providers/src/payments/index.ts`
4. Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
5. Create webhook handler in `apps/main-backend/src/api/webhooks/payments/stripe.webhook.ts`

### Storage Provider (e.g., swap to S3)

1. Implement `FileStorageService` interface in `packages/providers/src/storage/s3.ts`
2. Add factory `createS3Provider(config)`
3. Update infra-adapter to use new provider

### Notification Channel (e.g., add Firebase Push)

1. Implement `NotificationChannelAdapter` in `packages/providers/src/notifications/channels/firebase-push.ts`
2. Add worker in `apps/job-worker/src/workers/push.worker.ts`
3. Update orchestrator to route to new channel

---

## 14. Schema Evolution

1. **Never delete columns/tables** without migration path
2. **Add nullable columns** first, migrate data, then make required
3. **Use Prisma migrations** for all changes
4. **Test on staging** before production
5. After schema change:
   - Run `pnpm db:generate`
   - Update types in `@fundifyhub/types` if needed
   - Update domain services, controllers, frontend

---

## 15. Database Indexing Strategy

### Existing Indexes (from Schema)

The Prisma schema includes comprehensive indexes for:
- **Primary keys:** All models have `@id` with `cuid()`
- **Foreign keys:** All relations indexed
- **Status fields:** `stage`, `status`, `isActive` indexed for filtering
- **Composite indexes:** Common query patterns (e.g., `[districtId, stage]`, `[userId, isRead]`)
- **Soft delete:** `deletedAt` indexed for filtered queries

### When to Add New Indexes

Add indexes when:
1. Query appears in slow query log (>100ms)
2. Filtering by new column frequently
3. Sorting by unindexed column
4. Join on non-FK column

**Warning:** Too many indexes slow down writes. Analyze before adding.

---

## 16. API Versioning

### Current Strategy: No Versioning (v1 implicit)

All endpoints are under `/api/` without version prefix. This works for early-stage development.

### Future Versioning (when needed)

When breaking changes are required:
1. Add version prefix: `/api/v2/`
2. Keep `/api/v1/` (or unversioned) for backward compatibility
3. Deprecation timeline: 6 months minimum
4. Use `Accept: application/vnd.fundify.v2+json` header as alternative

### Breaking Change Examples

- Removing a field from response
- Changing field type (string → number)
- Renaming endpoints
- Changing authentication method

**Non-breaking:** Adding new optional fields, new endpoints, new query params.

---

## 17. Frontend Form Handling

### Form Library Stack

- **Form state:** `react-hook-form`
- **Validation:** `zod` (reuse schemas from `@fundifyhub/utils`)
- **UI components:** shadcn/ui form components
- **File uploads:** UploadThing React components

### Multi-Step Form Pattern (Request Creation)

```typescript
// Example: Request creation wizard
const steps = [
  { id: 'asset', component: AssetDetailsStep },
  { id: 'amount', component: LoanAmountStep },
  { id: 'documents', component: DocumentUploadStep },
  { id: 'review', component: ReviewStep },
];

// State persisted in Zustand store between steps
const useRequestFormStore = create((set) => ({
  step: 0,
  data: {},
  setStep: (step) => set({ step }),
  updateData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
  reset: () => set({ step: 0, data: {} }),
}));
```

### File Upload Pattern

```typescript
// Using UploadThing + react-hook-form
<Controller
  name="assetPhotos"
  control={control}
  render={({ field }) => (
    <UploadDropzone
      endpoint="assetPhotoUploader"
      onClientUploadComplete={(files) => field.onChange(files)}
      onUploadError={(error) => setError('assetPhotos', { message: error.message })}
    />
  )}
/>
```

---

## 18. Summary

This architecture ensures:

1. **Separation of Concerns:** Domain logic isolated from HTTP/infrastructure
2. **Type Safety:** Strict TypeScript, shared types from `@fundifyhub/types`
3. **Scalability:** Stateless services, Redis for caching/queues, Socket.IO for realtime
4. **Maintainability:** Clear boundaries, no god files, centralized packages
5. **Provider Agnostic:** Easy to swap payment/storage/notification providers
6. **Future-Proof:** Clean patterns that support growth and new features
