# 🗺️ FundifyHub Development Roadmap

> **Last Updated:** December 5, 2025  
> **Status:** Major Refactoring  
> **Philosophy:** Framework-First, Zero Legacy, Full Type Safety

---

## 🎯 Core Principles (MANDATORY FOR ALL CODE)

### 1. ❌ NO Backward Compatibility
- Remove ALL legacy code (28-status system)
- Use ONLY stage-based system (10 stages)
- No deprecated patterns
- Clean, fresh codebase

### 2. 🏗️ Framework-First Architecture
Every external service MUST be abstracted as a pluggable framework:

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│    (Controllers, Services - NO direct provider calls)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRAMEWORK INTERFACES                       │
│  INotificationService | IPaymentService | IStorageService   │
│  ICacheService        | IQueueService   | IAuditService     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ADAPTERS                                │
│  EmailAdapter    │ RazorpayAdapter  │ UploadThingAdapter    │
│  WhatsAppAdapter │ ManualAdapter    │ S3Adapter (future)    │
│  SMSAdapter      │ StripeAdapter    │                       │
│  InAppAdapter    │   (future)       │                       │
│  PushAdapter     │                  │                       │
└─────────────────────────────────────────────────────────────┘
```

### 3. 🔒 Full Type Safety
- ❌ Zero `any` types (use `unknown` + type guards)
- ✅ Strict TypeScript (`"strict": true`)
- ✅ Zod validation for ALL inputs
- ✅ Proper error types with discriminated unions
- ✅ Generic types for reusability

### 4. 📦 Centralized Constants & Types
- All constants in `@fundifyhub/types`
- No hardcoded strings/numbers
- Single source of truth

### 5. 🔄 Real-Time First
- Socket.IO connected on user login
- Real-time in-app notifications
- Live updates for all actions
- Optimistic UI updates

### 6. 📝 Full Audit Trail
- Every action logged (CREATE, UPDATE, DELETE, VIEW)
- Who (userId, role), What (action, entity), When (timestamp)
- Before/After state for changes
- IP address, User agent
- Immutable audit log

### 7. ⚡ Caching Everywhere
- Redis for API response caching
- React Query for client-side caching
- Proper TTL and invalidation strategies

### 8. 📚 Documentation
- JSDoc for ALL exported functions
- Swagger/OpenAPI for ALL API endpoints
- README.md for ALL packages

---

## 📋 TODO List (Priority Order)

### 🔴 PHASE 1: Legacy Removal & Cleanup

#### 1.1 Remove Legacy Status System
- [ ] Delete `REQUEST_STATUS` enum (28 values) from constants.ts
- [ ] Delete `REQUEST_STATUS_COLORS`, `REQUEST_STATUS_LABELS` from ui.constants.ts
- [ ] Delete `STATUS_BANNER_CONFIG` for old statuses
- [ ] Delete old workflow.types.ts
- [ ] Update all frontend components to use `REQUEST_STAGE`
- [ ] Remove `stageToLegacyStatus()` mapping function
- [ ] Remove `currentStatus` computed field from backend responses

#### 1.2 Fix All `any` Types
- [x] `contexts/SocketContext.tsx` - Use proper socket event types ✅ (2025-12-04)
- [x] `components/uploadthing-components.tsx` - Use proper UploadThing types ✅ (2025-12-04)
- [x] `app/settings/page.tsx` - Use `unknown` + type guards ✅ (2025-12-04)
- [x] `lib/uploadthing/AssetUpload.tsx` - Proper error handling ✅ (2025-12-04)
- [x] `components/request/AssignAgentModal.tsx` - Proper error types ✅ (2025-12-04)
- [x] `components/request/modals/AssignAdminModal.tsx` - Proper error types ✅ (2025-12-04)
- [x] `components/request/sidebar/TimelineSidebar.tsx` - Proper metadata types ✅ (2025-12-05)
- [x] `components/request/RequestDetailPage.tsx` - Proper metadata types ✅ (2025-12-05)
- [x] `components/request/sections/*.tsx` - District access + upload types ✅ (2025-12-05)
- [x] `components/request/modals/ActionModalManager.tsx` - District + data types ✅ (2025-12-05)
- [x] `components/request/context/RequestActionContext.tsx` - WorkflowContext types ✅ (2025-12-05)
- [x] `hooks/queries/useRequests.ts` - Pagination types ✅ (2025-12-05)
- [x] `hooks/useRetry.ts` - Proper error types ✅ (2025-12-04)
- [x] `main-backend/utils/uploadthing.ts` - Error handling without `any` ✅ (2025-12-05)
- [x] `main-backend/api/payments/razorpay.ts` - Webhook types + PaymentOrderStatus ✅ (2025-12-05)
- [x] `main-backend/api/admin/service/controllers.ts` - Prisma error handling ✅ (2025-12-05)
- [x] `main-backend/api/documents/controllers.ts` - Document types ✅ (2025-12-05)
- [x] `main-backend/api/auth/controllers.ts` - OTP result types ✅ (2025-12-05)
- [x] `job-worker/services/whatsapp-service.ts` - Error handling ✅ (2025-12-05)

#### 1.3 Restructure Code
- [ ] Organize components by feature (`components/features/`)
- [ ] Organize hooks properly (`hooks/queries/`, `hooks/utils/`)
- [ ] Backend: each domain has `routes.ts`, `controllers/`, `validators/`, `services/`
- [ ] Remove duplicate/unused files

---

### 🟡 PHASE 2: Framework Packages

#### 2.1 Notification Framework (`@fundifyhub/notifications`)
Features needed:
- Multi-channel: Email, WhatsApp, SMS (future), In-App, Push
- Per-channel templates (HTML for email, string for WhatsApp, etc.)
- Delivery modes: SINGLE, BROADCAST, FALLBACK, INDEPENDENT
- Retry with exponential backoff
- Dead letter queue
- Rate limiting per channel
- User preference management

Tasks:
- [x] Create `INotificationChannel` interface ✅ (2025-12-05)
- [x] Implement EmailChannel (nodemailer) ✅ (2025-12-05)
- [x] Implement WhatsAppChannel (whatsapp-web.js) ✅ (2025-12-05)
- [x] Implement InAppChannel (Socket.IO) ✅ (2025-12-05)
- [x] Implement PushChannel (web-push) ✅ (2025-12-05)
- [x] Create template registry with per-channel formats ✅ (2025-12-05)
- [x] Implement delivery strategies ✅ (2025-12-05)
- [x] Add retry/backoff logic ✅ (2025-12-05)
- [x] Add rate limiting types ✅ (2025-12-05)
- [ ] Implement rate limiting in NotificationService (future)
- [ ] Add SMS channel (future)

#### 2.2 Payment Framework (`@fundifyhub/payments`)
- [x] Create `IPaymentProvider` interface ✅ (2025-12-05)
- [x] Implement RazorpayProvider ✅ (2025-12-05)
- [x] Implement ManualProvider (Cash/Cheque/Bank) ✅ (2025-12-05)
- [x] Add webhook abstraction ✅ (2025-12-05)
- [x] Add refund support ✅ (2025-12-05)
- [x] Create PaymentProviderFactory ✅ (2025-12-05)

#### 2.3 Storage Framework (`@fundifyhub/storage`)
- [x] Create `IStorageProvider` interface ✅ (2025-12-05)
- [x] Implement UploadThingProvider ✅ (2025-12-05)
- [x] Add signed URL generation ✅ (2025-12-05)
- [ ] Prepare S3Provider interface (future)

#### 2.4 Cache Framework (`@fundifyhub/cache`)
- [x] Create `ICacheProvider` interface ✅ (2025-12-05)
- [x] Implement RedisCacheProvider ✅ (2025-12-05)
- [x] Add TTL management ✅ (2025-12-05)
- [x] Add invalidation patterns (deleteByPattern, getKeys) ✅ (2025-12-05)
- [x] Add batch operations (getMany, setMany, deleteMany) ✅ (2025-12-05)
- [x] Add cache stats (hits, misses, size) ✅ (2025-12-05)
- [ ] Add cache decorators (future)

#### 2.5 Audit Framework (`@fundifyhub/audit`)
- [x] Create audit event types (IAuditProvider, AuditEntry, AuditAction) ✅ (2025-12-05)
- [x] Create PrismaAuditProvider (batched writes, query, cleanup) ✅ (2025-12-05)
- [x] Add sensitive data masking ✅ (2025-12-05)
- [x] Add severity levels and action categories ✅ (2025-12-05)
- [ ] Create Express middleware (future)
- [ ] Add audit log retention cleanup job (future)

---

### 🟢 PHASE 3: Real-Time & Socket

#### 3.1 Socket Connection
- [x] Connect socket in AuthContext on login ✅ (2025-12-05)
- [x] Auto-reconnect logic (built into socket.io) ✅ (2025-12-05)
- [x] Join user/role rooms on connect ✅ (2025-12-05)
- [x] Graceful error handling with fallback mode ✅ (2025-12-05)
- [x] joinRoom/leaveRoom helpers for request/auction pages ✅ (2025-12-05)

#### 3.2 Real-Time Features
- [x] Display toast on new notification ✅ (2025-12-05)
- [x] Update notification badge (invalidate query on new notification) ✅ (2025-12-05)
- [x] Live request status updates (RequestContext already handles socket events) ✅ (2025-12-05)
- [x] Live auction bid updates (AuctionDetailPage already handles socket events) ✅ (2025-12-05)
- [x] Live payment confirmations (SocketContext handles PAYMENT_RECEIVED) ✅ (2025-12-05)
- [x] EMI reminder notifications (SocketContext handles EMI_REMINDER) ✅ (2025-12-05)

---

### 🔵 PHASE 4: Documentation

- [ ] Swagger annotations for all endpoints (in progress - health, auth, payments done)
- [ ] JSDoc for all exported functions
- [x] README for each package ✅ (2025-12-05)
- [ ] Architecture decision records

---

### ⚪ PHASE 5: Backend API Completeness (NEW)

#### 5.1 Manual Payment Endpoints ✅ (2025-12-06)
- [x] POST /payments/manual/record - Record cash/cheque/bank payments
- [x] GET /payments/admin/list - List all payments with filters
- [x] GET /payments/admin/:paymentId - Get payment details
- [x] GET /payments/admin/loans - List loans with payment summary
- [x] GET /payments/admin/emis/overdue - List overdue EMIs

#### 5.2 Existing Payment/EMI Endpoints (Already Complete)
- [x] GET /payments/loan/:loanId/total-due - Total due for a loan
- [x] POST /payments/emi/pay - Pay EMI
- [x] GET /payments/emi/:emiId/breakdown - EMI breakdown with penalties
- [x] GET /payments/emi/:emiId/history - Payment attempt history
- [x] POST /payments/razorpay/create-order - Create Razorpay order
- [x] POST /payments/razorpay/verify - Verify payment
- [x] POST /payments/razorpay/webhook - Webhook handler

#### 5.3 Request Lifecycle (Already Complete)
- [x] POST /requests/:id/bank-details - Submit bank details
- [x] POST /requests/:id/create-loan - Create loan after disbursement
- [x] POST /requests/:id/status - Update status (includes disbursement)
- [x] POST /requests/:id/offer - Create admin offer
- [x] POST /requests/:id/offers/:offerId/confirm - Accept/reject offer

---

### 🟣 PHASE 6: End-to-End Integration (IN PROGRESS)

> **Goal:** Make all systems work together for complete end-to-end testing.

#### 6.1 Socket Events - Payments ✅ (2025-12-05)
- [x] Add `emitPaymentReceived()` helper in socket handlers
- [x] Add `emitEMIReminder()` helper in socket handlers  
- [x] Add `emitEMIOverdue()` helper in socket handlers
- [x] Emit PAYMENT_RECEIVED from Razorpay controller after success
- [x] Emit PAYMENT_RECEIVED from Manual payment controller after success

#### 6.2 Notification Worker Fix ✅ (2025-12-05)
- [x] Fix worker pausing incorrectly (In-App always available when DB is up)
- [x] Remove pause logic - In-App notifications should ALWAYS work

#### 6.3 Provider Integration (PENDING)
- [ ] Replace direct Razorpay SDK calls with RazorpayProvider from `@fundifyhub/providers`
- [ ] Use RedisCacheProvider for API response caching in main-backend
- [ ] Use PrismaAuditProvider for audit logging in controllers
- [ ] Use UploadThingProvider abstraction in document controllers

#### 6.4 Email/WhatsApp Configuration (PENDING)
- [ ] Add ServiceConfig seeding or admin UI for SMTP configuration
- [ ] Document WhatsApp web.js QR code scanning process
- [ ] Add admin endpoint to get WhatsApp QR code for linking

#### 6.5 Request Lifecycle Testing (PENDING)
Test complete flow: DRAFT → REVIEW → OFFER → INSPECTION → DOCUMENTATION → DISBURSEMENT → ACTIVE → COMPLETED
- [ ] Create test user accounts (Customer, Agent, District Admin, Super Admin)
- [ ] Submit a new request as customer
- [ ] Review and make offer as admin
- [ ] Accept offer as customer
- [ ] Assign agent and complete inspection
- [ ] Upload required documents
- [ ] Disburse loan
- [ ] Pay all EMIs
- [ ] Verify loan completion

#### 6.6 Role-Based Actions Verification (PENDING)
- [ ] Verify CUSTOMER can only see own requests, submit new requests, accept/decline offers, pay EMIs
- [ ] Verify AGENT can only see assigned inspections, complete inspections
- [ ] Verify DISTRICT_ADMIN can see district requests, assign agents, make offers, process disbursements
- [ ] Verify SUPER_ADMIN can see all requests, all actions, system settings

#### 6.7 Legacy Status Removal (PENDING)
- [ ] Count all files using REQUEST_STATUS in frontend
- [ ] Migrate each file to use REQUEST_STAGE 
- [ ] Remove REQUEST_STATUS from `@fundifyhub/types`
- [ ] Remove legacy workflow.types.ts
- [ ] Remove currentStatus computed field from backend responses

---

## 🔧 Current Session Summary (2025-12-05)

### Changes Made:
1. **NotificationWorker** (`apps/job-worker/src/workers/notificationWorker.ts`)
   - Fixed: Worker no longer pauses when email/WhatsApp unavailable
   - In-App notifications always work when database is up

2. **Socket Payment Events** (`apps/main-backend/src/socket/handlers.ts`)
   - Added: `emitPaymentReceived()`, `emitEMIReminder()`, `emitEMIOverdue()` helpers
   - Exported from `apps/main-backend/src/socket/index.ts`

3. **Razorpay Controller** (`apps/main-backend/src/api/payments/razorpay.ts`)
   - Added: Socket emission after successful payment in `processPayment()`
   - Emits to customer user room AND request room

4. **Manual Payment Controller** (`apps/main-backend/src/api/payments/manual.ts`)
   - Added: Socket emission after successful manual payment recording

### Services Running:
- Frontend: http://localhost:3000 ✅
- Backend: http://localhost:3001 ✅
- Job Worker: All workers initialized ✅
- Socket.IO: With Redis adapter ✅

### Next Steps for Agent:
1. Test end-to-end flow manually
2. Integrate @fundifyhub/providers into backend
3. Add ServiceConfig seeding for email
4. Remove legacy REQUEST_STATUS system

---

## 🔧 Coding Standards

### No Hardcoding
```typescript
// ❌ BAD
if (status === 'PENDING') { ... }
const timeout = 5000;

// ✅ GOOD
import { REQUEST_STAGE, TIMEOUTS } from '@fundifyhub/types';
if (stage === REQUEST_STAGE.REVIEW) { ... }
const timeout = TIMEOUTS.API_REQUEST;
```

### Error Handling
```typescript
// Use Result type
type Result<T, E = Error> = 
  | { ok: true; data: T }
  | { ok: false; error: E };

// Use unknown, not any
try {
  await someOperation();
} catch (error: unknown) {
  if (error instanceof ValidationError) {
    // handle
  }
  throw error;
}
```

### JSDoc Example
```typescript
/**
 * Creates a new loan request
 * 
 * @param data - Request creation data
 * @returns Created request with generated ID
 * @throws {ValidationError} If data is invalid
 */
export async function createRequest(data: CreateRequestInput): Promise<Request> {
  // ...
}
```

---

## 🚀 Quick Commands

```bash
pnpm dev              # All services
pnpm build            # Type check all
pnpm lint             # ESLint
pnpm db:generate      # After schema changes
pnpm db:migrate       # Run migrations
pnpm infra:up         # Start PostgreSQL + Redis
```

---

**Current Focus:** Phase 6 - End-to-End Integration (Socket events fixed, provider integration pending)