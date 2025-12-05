# TODO / Progress – Fundify Refactoring

> **Last Updated:** December 5, 2024  
> **Reference:** ARCHITECTURE.md v2.2  
> **Agent Instructions:** Follow phases in order. Mark items `[x]` when done. Add notes if blocked.

---

## [2025-12-05] Agent Session

- [x] Add centralized env loader in `apps/main-backend/src/config/env.ts` using validated config and optional `CORS_ORIGINS`.
- [x] Wire server CORS allowlist from config (no hardcoded dev IPs) and keep socket CORS aligned.
- [x] Align `packages/providers` notifications exports with `notifications/orchestrator` and `notifications/channels/*` aliases.
- [x] Clean legacy compiled artifacts under `packages/providers/src/notifications`.
- [x] Populate notification template registry and enable TSX templates (added react-email deps, tsconfig include).
- [x] Resolve main-backend build errors (legacy controllers/types, rbac error codes, domain type gaps) after full `pnpm build` run.
- [x] Add backward-compatible `ValidationError` context overloads to handle legacy code paths.
- [x] Point server to new HTTP routes, keep Razorpay webhook mounted, and include the webhook controller in `tsconfig` without pulling legacy controllers.
- [x] Fix loan service Prisma relation naming (`emisSchedule`) and role utility typing to satisfy strict build.

---

## 🎉 Latest Completion: Phase 2.3 API Layer (Dec 5, 2024)

**Summary of Work:**
- ✅ Created HTTP API layer with routes, controllers, and middlewares
- ✅ 3 authentication middlewares (authenticateUser, requireAuthentication, optionalAuth)
- ✅ 4 RBAC middlewares (requireRole, checkPermission, requireDistrictAccess, auditAccess)
- ✅ 3 error handling middlewares (errorHandler, notFoundHandler, asyncHandler)
- ✅ 34 route endpoints across 3 route files (auth, requests, loans)
- ✅ 8 auth controller handlers (register, login, refresh, logout, password reset, verify email, getCurrentUser)
- ✅ All endpoints have TODO markers for production implementation
- ✅ Clean separation: routes → controllers → services → domain logic

**Files Created:**
- `api/http/middlewares/auth.middleware.ts` (168 lines) - JWT verification and session management
- `api/http/middlewares/rbac.middleware.ts` (200 lines) - Role-based and permission-based access control
- `api/http/middlewares/error-handler.middleware.ts` (185 lines) - Centralized error handling
- `api/http/middlewares/index.ts` - Barrel export
- `api/http/routes/auth.routes.ts` (128 lines) - 8 auth endpoints
- `api/http/routes/requests.routes.ts` (320 lines) - 17 request workflow endpoints
- `api/http/routes/loans.routes.ts` (188 lines) - 9 loan management endpoints
- `api/http/routes/index.ts` - Route registration and barrel export
- `api/http/controllers/auth.controller.ts` (150 lines) - Auth endpoint handlers
- `api/http/controllers/index.ts` - Controller barrel export
- `api/http/index.ts` - HTTP API setup and exports

**Key Achievements:**
- Complete authentication flow: register → email verification → login → token refresh → logout
- Request workflow: create → submit → assign agent → offer → inspect → verify docs → disburse
- Loan management: list → view → payments → EMI schedule → prepayment → close
- Consistent middleware composition pattern for auth + RBAC
- All routes have proper error handling via asyncHandler
- Permission checks integrated with RBAC layer
- Centralized error response formatting
- 34 endpoints ready for production implementation (currently return 501 Not Implemented)

---

## 🎉 Previous Completion: Phase 2.2 Infrastructure Adapters (Dec 5, 2024)

**Summary of Work:**
- ✅ Created 6 infrastructure adapter classes
- ✅ 43 public methods across all adapters
- ✅ 800+ lines of well-documented infrastructure code
- ✅ All adapters follow consistent patterns (singleton, TODO markers, JSDoc)
- ✅ Barrel export for clean imports
- ✅ TypeScript compilation: all adapters pass strict checking
- ✅ No external dependencies issues

**Files Created/Updated:**
- `apps/main-backend/src/infra-adapters/realtime.adapter.ts` (132 lines) - Socket.IO wrapper
- `apps/main-backend/src/infra-adapters/audit.adapter.ts` (237 lines) - Audit logging wrapper
- `apps/main-backend/src/infra-adapters/index.ts` (Barrel export)

**Files Verified (Already Existed):**
- `cache.adapter.ts` – 8 methods for Redis caching & rate limiting
- `payments.adapter.ts` – 7 methods for Razorpay payment processing
- `storage.adapter.ts` – 4 methods for UploadThing file storage
- `notification.adapter.ts` – 7 methods for event-driven notifications

**Key Achievements:**
- Consistent adapter pattern across 6 external services
- All adapters follow TODO-marker-based stub pattern for production implementation
- Clean separation: adapters only translate, no business logic
- Proper error handling: optional services don't crash the app
- All adapters are singletons for reuse across the codebase

---

## 🎉 Previous Completion: Phase 2.1 Domain Services (Dec 2024)

**Summary of Work:**
- ✅ Created 3 comprehensive domain services (Auth, Requests, Loans)
- ✅ 1,168 lines of well-documented, typed business logic
- ✅ Fixed 9 TypeScript compilation errors across the codebase
- ✅ All services follow domain-driven design patterns
- ✅ All methods include TODO markers for implementation details
- ✅ Full JSDoc documentation on all public methods
- ✅ Proper error handling with typed exceptions
- ✅ Permission checks integrated with RBAC layer
- ✅ EMI calculation algorithm fully implemented and ready to use

**Files Created:**
- `apps/main-backend/src/domain/auth/auth.service.ts` (286 lines)
- `apps/main-backend/src/domain/requests/requests.service.ts` (506 lines)
- `apps/main-backend/src/domain/loans/loans.service.ts` (376 lines)
- All services exported via domain/index.ts barrel export

**Key Achievements:**
- Auth Service: 7 core methods (register, login, password reset, token refresh, logout, etc.)
- Requests Service: 18 methods covering complete request lifecycle from creation to disbursement
- Loans Service: 11 methods for EMI management, payments, and loan lifecycle
- All services structured for easy adapter/event injection once Phase 3 is ready

---

---

## Phase 0: Repository Hygiene & Foundation

**Goal:** Clean setup, remove dead code, ensure tooling works.

### 0.0 Critical Fixes (DONE)

- [x] Fix schema comment: UserRole is array, not single (was stale comment)
- [x] Add `@fundifyhub/providers` alias to `tsconfig.base.json`

### 0.1 Package Cleanup

- [x] Delete `packages/notifications/` (contents consolidated to `packages/providers/src/notifications/`)
- [x] Delete `packages/templates/` (contents consolidated to `packages/providers/src/notifications/templates/`)
- [x] Remove `@fundifyhub/notifications` and `@fundifyhub/templates` from `tsconfig.base.json` paths
- [x] Update all imports in codebase from `@fundifyhub/notifications` → `@fundifyhub/providers/notifications`
- [x] Update all imports from `@fundifyhub/templates` → `@fundifyhub/providers/notifications/templates`
- [x] Clean `pnpm-workspace.yaml` if needed
- [x] Run `pnpm install` and fix any broken dependencies

### 0.2 Type Consolidation

- [x] Audit `apps/main-backend/src/types/` – move shared types to `@fundifyhub/types`
- [x] Moved: `AdminEmiScheduleSnapshot`, `NormalizedEmiData`, `CreateDocumentRequest`, `CommentWithAuthor`, `DocumentWithUrl`
- [x] Create `packages/types/src/api-types.ts` with shared API types
- [x] Create `packages/types/src/api-types-prisma.ts` for backend-only Prisma types
- [x] Ensure all apps import from `@fundifyhub/types`

### 0.3 Error Handling Infrastructure

- [x] Create `packages/utils/src/errors.ts`:
  - [x] `AppError` base class
  - [x] `ErrorCode` enum with 20+ specific codes
  - [x] `ValidationError`, `AuthenticationError`, `ForbiddenError`
  - [x] `NotFoundError`, `ConflictError`, `RateLimitError`
  - [x] `BusinessRuleError`, `ExternalServiceError`
  - [x] Type guards and helper functions
- [x] Export from `@fundifyhub/utils`
- [x] Status codes follow HTTP conventions

### 0.4 Tooling Verification

- [x] Verify `pnpm build` works for all packages
- [x] Verify `pnpm lint` passes (fix any errors)
- [x] Verify `pnpm install` works after cleanup
- [x] Prisma client generates correctly
- **Result:** ✅ All Phase 0 checks pass

---

## Phase 1: Shared Packages Enhancement

**Goal:** Strengthen shared packages with missing utilities and types.

### 1.1 `packages/utils` Enhancements

- [x] Add `formatters.ts`:
  - [x] `formatCurrency()`, `formatDate()`, `formatDateTime()`
  - [x] `formatPercentage()`, `formatPhoneNumber()`, `formatNumber()`
  - [x] `truncateText()`, `formatName()`, `formatAddress()`
- [x] Add `validators.ts` (zod schemas):
  - [x] `CommonSchemas` for reusable patterns
  - [x] `RequestSchemas`, `OfferSchemas`, `PaymentSchemas`
  - [x] `AuctionSchemas`, `InspectionSchemas`, `DocumentSchemas`
  - [x] `AuthSchemas`, `FilterSchemas`
  - [x] `validateData()` helper function
- [x] Export all from index.ts

### 1.2 Domain Access Control Layer

- [x] Create `apps/main-backend/src/domain/access-control/`:
  - [x] `rbac.ts` with comprehensive permission functions:
    - [x] Core role checks: `hasRole()`, `hasAnyRole()`, `hasAllRoles()`
    - [x] District access: `hasDistrictAccess()`, `hasAnyDistrictAccess()`, `getAccessibleDistrictIds()`
    - [x] Request permissions: `canCreateRequest()`, `canViewRequest()`, `canListRequests()`, `canAssignAgent()`, `canAssignAdmin()`, `canCreateOffer()`
    - [x] Loan permissions: `canViewLoan()`, `canMakePayment()`
    - [x] Auction permissions: `canViewAuction()`, `canPlaceBid()`, `canManageAuction()`
    - [x] Admin permissions: `canAccessAdminDashboard()`, `canManageUsers()`, `canManageGeography()`
    - [x] Assertions that throw `ForbiddenError`: `assertHasRole()`, `assertHasAnyRole()`, `assertHasDistrictAccess()`, `assertCanPerformAction()`
    - [x] `requireRoles()` middleware factory
    - [x] `getRoleHierarchyLevel()` for role comparisons
  - [x] `role-utils.ts` with convenience checks:
    - [x] `isCustomer()`, `isAgent()`, `isDistrictAdmin()`, `isStateAdmin()`, `isSuperAdmin()`, `isAdmin()`
    - [x] `getPrimaryRole()`, `getRoleLabel()`, `getUserRoleLabels()`
    - [x] `hasMultipleRoles()`
  - [x] `index.ts` barrel export

### 1.3 API Layer Directory Structure

- [x] Create directories:
  - [x] `apps/main-backend/src/api/http/routes/`
  - [x] `apps/main-backend/src/api/http/controllers/`
  - [x] `apps/main-backend/src/api/http/middlewares/`
  - [x] `apps/main-backend/src/api/webhooks/`
  - [x] `apps/main-backend/src/infra-adapters/`
  - [x] `apps/main-backend/src/config/`

### 1.4 Status

- **Result:** ✅ Phase 1 Foundation Complete
- **Completed:**
  - [x] packages/utils: errors.ts, formatters.ts, validators.ts
  - [x] packages/types: api-types.ts, api-types-prisma.ts (simplified)
  - [x] Domain access-control: rbac.ts, role-utils.ts with 25+ functions
  - [x] API directory structure created (6 directories ready)
  - [x] Build fixed: All foundation packages compile
- **Build Status:** packages layer fully working (types, utils, providers, logger, prisma)
- **Next:** Complete Phase 2 domain services and start API layer

---

## Phase 2: Domain Services & API Implementation

**Goal:** Implement domain services with pure business logic, then thin controllers/routes.

### 2.1 Domain Services - Core Logic ✅ (COMPLETED - Dec 2024)

Completed services with TODO markers for implementation details:

- [x] **Auth Service** (`apps/main-backend/src/domain/auth/auth.service.ts`)
  - [x] `register()` - User registration with email verification
  - [x] `login()` - JWT token generation
  - [x] `requestPasswordReset()` - Password reset flow
  - [x] `confirmPasswordReset()` - Password reset confirmation
  - [x] `verifyEmail()` - Email verification
  - [x] `refreshAccessToken()` - Token refresh
  - [x] `logout()` - Session cleanup

- [x] **Requests Service** (`apps/main-backend/src/domain/requests/requests.service.ts`)
  - [x] `create()` - New request creation
  - [x] `getById()` - Get request with permissions
  - [x] `list()` - List requests with filters
  - [x] `submitForReview()` - Submit for agent review
  - [x] `assignAgent()` - Assign agent to request
  - [x] `assignAdmin()` - Assign admin for escalation
  - [x] `createOffer()` - Create loan offer
  - [x] `customerAcceptOffer()` - Accept offer
  - [x] `customerRejectOffer()` - Reject offer
  - [x] `scheduleInspection()` - Schedule inspection
  - [x] `completeInspection()` - Complete inspection
  - [x] `uploadDocuments()` - Upload documents
  - [x] `verifyDocuments()` - Verify documents
  - [x] `disburseLoan()` - Disburse loan
  - [x] `cancelRequest()` - Cancel request
  - [x] `rejectRequest()` - Reject request

- [x] **Loans Service** (`apps/main-backend/src/domain/loans/loans.service.ts`)
  - [x] `getLoanById()` - Get loan with permissions
  - [x] `listLoans()` - List loans with filters
  - [x] `applyEMIPayment()` - Apply payment to EMI
  - [x] `getEMISchedule()` - Get full EMI schedule
  - [x] `recordPrepayment()` - Early repayment
  - [x] `closeLoan()` - Close/pay off loan
  - [x] `getOutstandingBalance()` - Outstanding balance
  - [x] `getPaymentHistory()` - Payment history
  - [x] `calculateEMISchedule()` - EMI calculation (internal)

### 2.2 TODO: Additional Domain Services (Still to implement)

### 1.3 `packages/providers` Consolidation

- [ ] Verify `src/notifications/` structure exists:
  - [ ] `orchestrator.ts` – notification dispatch logic
  - [ ] `channels/email.ts` – email adapter
  - [ ] `channels/whatsapp.ts` – WhatsApp adapter
  - [ ] `channels/sms.ts` – SMS adapter (stub if not implemented)
  - [ ] `channels/push.ts` – push adapter (stub if not implemented)
  - [ ] `channels/in-app.ts` – in-app notification adapter
  - [ ] `templates/index.ts` – template registry
  - [ ] `templates/auth-templates.ts`
  - [ ] `templates/request-templates.ts`
  - [ ] `templates/loan-templates.ts`
  - [ ] `templates/payment-templates.ts`
  - [ ] `templates/auction-templates.ts`
- [ ] Verify provider interfaces in `@fundifyhub/types/providers`:
  - [ ] `PaymentProvider` interface
  - [ ] `FileStorageService` interface
  - [ ] `CacheProvider` interface
  - [ ] `NotificationChannelAdapter` interface
- [ ] Update `packages/providers/package.json` exports if needed
- [ ] Add factory exports: `createRazorpayProvider()`, `createRedisCache()`, etc.

---

## Phase 2: Backend Domain Layer

**Goal:** Implement domain-driven architecture, extract business logic from controllers.

### 2.1 Create Directory Structure

- [ ] Create `apps/main-backend/src/api/http/routes/`
- [ ] Create `apps/main-backend/src/api/http/controllers/`
- [ ] Create `apps/main-backend/src/api/http/middlewares/`
- [ ] Create `apps/main-backend/src/api/webhooks/payments/`
- [ ] Create `apps/main-backend/src/infra-adapters/`
- [ ] Create `apps/main-backend/src/config/`

### 2.2 Domain: Access Control

- [ ] Create `domain/access-control/rbac.ts`:
  - [ ] `canViewRequest(user, request)`
  - [ ] `canManageRequest(user, request)`
  - [ ] `canCreateOffer(user, request)`
  - [ ] `canAssignAgent(user, request)`
  - [ ] `canViewLoan(user, loan)`
  - [ ] `canManageLoan(user, loan)`
  - [ ] `canViewAuction(user, auction)`
  - [ ] `canPlaceBid(user, auction)`
  - [ ] `canManageAuction(user, auction)`
- [ ] Create `domain/access-control/role-utils.ts`:
  - [ ] `hasAnyRole(user, roles)`
  - [ ] `hasDistrictAccess(user, districtId)`
  - [ ] `hasStateAccess(user, stateId)`
  - [ ] `getAccessibleDistrictIds(user)`
  - [ ] `getRoleHierarchyLevel(role)`
- [ ] Move `utils/rbac.ts` logic here, delete original

### 2.3 Domain: Auth

- [ ] Create `domain/auth/auth.service.ts`:
  - [ ] `register(input)` – create user, hash password, send verification
  - [ ] `login(email, password)` – validate, create session, return tokens
  - [ ] `refreshToken(refreshToken)` – rotate tokens
  - [ ] `logout(sessionId)` – revoke session
  - [ ] `requestPasswordReset(email)` – send OTP
  - [ ] `resetPassword(email, otp, newPassword)` – verify OTP, update password
- [ ] Create `domain/auth/session.service.ts`:
  - [ ] `createSession(userId, deviceInfo)`
  - [ ] `getSession(sessionId)`
  - [ ] `revokeSession(sessionId)`
  - [ ] `revokeAllUserSessions(userId)`
- [ ] Migrate logic from `api/auth/controllers.ts`, simplify controller

### 2.4 Domain: Requests

- [ ] Create `domain/requests/requests.service.ts`:
  - [ ] `create(userId, input)` – DRAFT → REVIEW, emit event
  - [ ] `getById(requestId, user)` – RBAC check
  - [ ] `list(user, filters)` – role-based filtering
  - [ ] `submitForReview(requestId, user)` – stage transition
  - [ ] `assignAdmin(requestId, adminId, user)` – validation + event
  - [ ] `assignAgent(requestId, agentId, user)` – validation + event
  - [ ] `createOffer(requestId, offerData, user)` – stage OFFER + event
  - [ ] `customerAcceptOffer(requestId, offerId, user)` – stage transition
  - [ ] `customerRejectOffer(requestId, offerId, user)` – back to negotiation
  - [ ] `scheduleInspection(requestId, data, user)` – stage INSPECTION
  - [ ] `completeInspection(requestId, data, user)` – stage DOCUMENTATION
  - [ ] `uploadDocuments(requestId, documents, user)`
  - [ ] `verifyDocuments(requestId, user)` – stage DISBURSEMENT
  - [ ] `disburseLoan(requestId, user)` – create Loan, stage ACTIVE
  - [ ] `cancelRequest(requestId, reason, user)` – stage CANCELLED
  - [ ] `rejectRequest(requestId, reason, user)` – stage REJECTED
- [ ] Create `domain/requests/requests.validators.ts` (zod schemas)
- [ ] Create `domain/requests/requests.events.ts` (event type definitions)
- [ ] **Split god controller:** `api/requests/controllers.ts` (3000+ lines) → thin controller + service

### 2.5 Domain: Loans

- [ ] Create `domain/loans/loans.service.ts`:
  - [ ] `create(requestId, loanData)` – internal, called by requests service
  - [ ] `getById(loanId, user)` – RBAC check
  - [ ] `list(user, filters)` – role-based filtering
  - [ ] `generateEmiSchedule(loan)` – create EMISchedule entries
  - [ ] `markEmiAsPaid(emiId, paymentId, user)` – update status
  - [ ] `updateOverdueEmis()` – cron job calls this
  - [ ] `markAsDefaulted(loanId, user)` – transition to DEFAULTED
  - [ ] `markAsCompleted(loanId, user)` – transition to COMPLETED
- [ ] Create `domain/loans/loans.events.ts`

### 2.6 Domain: Auctions

- [ ] Create `domain/auctions/auctions.service.ts`:
  - [ ] `create(loanId, auctionData, user)` – RBAC, create listing
  - [ ] `getById(auctionId, user)` – RBAC check
  - [ ] `list(user, filters)` – public + role-based
  - [ ] `publish(auctionId, user)` – SCHEDULED → ACTIVE
  - [ ] `placeBid(auctionId, bidData, user)` – validation, outbid logic
  - [ ] `extend(auctionId, newEndTime, user)` – if bid in last 5 mins
  - [ ] `endAuction(auctionId, user)` – determine winner
  - [ ] `cancelAuction(auctionId, reason, user)` – CANCELLED
- [ ] Create `domain/auctions/auctions.events.ts`

### 2.7 Domain: Payments

- [ ] Create `domain/payments/payments.service.ts`:
  - [ ] `createPaymentOrder(emiId, user)` – create Razorpay order
  - [ ] `verifyPayment(orderId, paymentId, signature)` – webhook handler calls
  - [ ] `recordManualPayment(emiId, paymentData, user)` – for cash payments
  - [ ] `getPaymentHistory(loanId, user)` – RBAC
- [ ] Create `domain/payments/payments.events.ts`

### 2.8 Domain: Notifications

- [ ] Create `domain/notifications/notifications.service.ts`:
  - [ ] `getPreferences(userId)` – user notification preferences
  - [ ] `updatePreferences(userId, preferences)` – save preferences
  - [ ] `getInAppNotifications(userId, filters)` – list notifications
  - [ ] `markAsRead(notificationId, userId)` – mark read
  - [ ] `markAllAsRead(userId)` – mark all read
- [ ] This is for user-facing notification management, NOT dispatch (that's in providers)

### 2.9 Domain: Events

- [ ] Create `domain/events/bus.ts`:
  - [ ] In-process event bus using EventEmitter or similar
  - [ ] `eventBus.emit(eventName, payload)`
  - [ ] `eventBus.on(eventName, handler)`
- [ ] Create event handlers in `domain/events/handlers/`:
  - [ ] `request.handlers.ts` – on request events, trigger notifications
  - [ ] `loan.handlers.ts` – on loan events, trigger notifications
  - [ ] `payment.handlers.ts` – on payment events, update EMI, trigger notifications
  - [ ] `auction.handlers.ts` – on auction events, trigger notifications

### 2.10 Infra Adapters ✅ (COMPLETED - Dec 5, 2024)

**Summary:** Created 6 infrastructure adapters with comprehensive TODO markers and JSDoc.

- [x] **`infra-adapters/cache.adapter.ts`** – Redis wrapper
  - [x] `set()`, `get()`, `delete()`, `deletePattern()`
  - [x] `checkRateLimit()`, `blacklistToken()`, `isTokenBlacklisted()`
  
- [x] **`infra-adapters/payments.adapter.ts`** – Razorpay wrapper
  - [x] `createOrder()`, `verifySignature()`, `capturePayment()`, `refund()`
  - [x] `getPayment()`, `getOrder()`, `getOrderPayments()`

- [x] **`infra-adapters/storage.adapter.ts`** – UploadThing wrapper
  - [x] `generateUploadUrl()`, `getDownloadUrl()`, `deleteFile()`, `verifyFile()`

- [x] **`infra-adapters/notification.adapter.ts`** – Event-driven notifications
  - [x] `publishEvent()`, `sendDirect()`
  - [x] `sendEmail()`, `sendWhatsApp()`, `sendSMS()`, `sendPush()`

- [x] **`infra-adapters/realtime.adapter.ts`** – Socket.IO wrapper
  - [x] `emitToUser()`, `broadcast()`, `joinRoom()`, `leaveRoom()`
  - [x] `updateSharedResource()`, `getConnectedUsers()`, `isUserConnected()`

- [x] **`infra-adapters/audit.adapter.ts`** – Audit logging wrapper
  - [x] `logAction()`, `logChange()`, `logAccess()`
  - [x] `getEntityAuditLog()`, `getUserAuditLog()`, `logFailure()`

- [x] **`infra-adapters/index.ts`** – Barrel export
  - [x] Exports all 6 adapters + singleton instances

### 2.11 API Layer Refactor

- [ ] Create routes files (just route definitions):
  - [ ] `api/http/routes/auth.routes.ts`
  - [ ] `api/http/routes/requests.routes.ts`
  - [ ] `api/http/routes/loans.routes.ts`
  - [ ] `api/http/routes/auctions.routes.ts`
  - [ ] `api/http/routes/payments.routes.ts`
  - [ ] `api/http/routes/notifications.routes.ts`
  - [ ] `api/http/routes/admin.routes.ts`
  - [ ] `api/http/routes/geography.routes.ts`
  - [ ] `api/http/routes/health.routes.ts`
- [ ] Create thin controllers (validate input, call service, format response):
  - [ ] `api/http/controllers/auth.controller.ts`
  - [ ] `api/http/controllers/requests.controller.ts`
  - [ ] `api/http/controllers/loans.controller.ts`
  - [ ] `api/http/controllers/auctions.controller.ts`
  - [ ] `api/http/controllers/payments.controller.ts`
  - [ ] `api/http/controllers/notifications.controller.ts`
  - [ ] `api/http/controllers/admin.controller.ts`
  - [ ] `api/http/controllers/geography.controller.ts`
- [ ] Create middlewares:
  - [ ] `api/http/middlewares/auth.middleware.ts`
  - [ ] `api/http/middlewares/rbac.middleware.ts`
  - [ ] `api/http/middlewares/rate-limit.middleware.ts`
  - [ ] `api/http/middlewares/error-handler.middleware.ts`
- [ ] Migrate Razorpay webhook to `api/webhooks/payments/razorpay.webhook.ts`
- [ ] Delete legacy `api/` structure after migration complete

### 2.12 Config

- [ ] Create `config/env.ts` – use `loadConfig()` from `@fundifyhub/utils`
- [ ] Create `config/di.ts` – dependency injection / wiring (optional)

---

## Phase 3: Job Worker

**Goal:** Robust background job processing for notifications and scheduled tasks.

### 3.1 Worker Structure

- [ ] Create `apps/job-worker/src/config/env.ts`
- [ ] Create `apps/job-worker/src/workers/email.worker.ts`
- [ ] Create `apps/job-worker/src/workers/whatsapp.worker.ts`
- [ ] Create `apps/job-worker/src/workers/sms.worker.ts`
- [ ] Create `apps/job-worker/src/workers/push.worker.ts`
- [ ] Create `apps/job-worker/src/workers/inapp.worker.ts`

### 3.2 Worker Implementation

- [ ] Each worker:
  - [ ] Consumes from BullMQ queue (e.g., `notifications:email`)
  - [ ] Renders template using `@fundifyhub/providers/notifications/templates`
  - [ ] Sends via channel adapter from `@fundifyhub/providers/notifications/channels`
  - [ ] Updates `NotificationLog` status
  - [ ] Emits realtime event on success
  - [ ] Handles retries and dead-letter queue

### 3.3 Cron Jobs

- [ ] Create `services/emi-cron.service.ts`:
  - [ ] `updateOverdueEmis()` – mark EMIs as OVERDUE, trigger notifications
  - [ ] `sendEmiReminders()` – upcoming due date reminders
  - [ ] `checkDefaultedLoans()` – mark loans as DEFAULTED after X missed EMIs
- [ ] Register cron schedules in `index.ts`

---

## Phase 4: Frontend Refactoring

**Goal:** Clean adapter layer, consistent patterns, role-aware components.

### 4.1 Adapter Layer

- [ ] Create `lib/adapters/auth-adapter.ts`:
  - [ ] `login()`, `register()`, `logout()`, `refreshToken()`, `getCurrentUser()`
- [ ] Create `lib/adapters/requests-adapter.ts`:
  - [ ] `list()`, `getById()`, `create()`, `updateStage()`, `createOffer()`, `acceptOffer()`
- [ ] Create `lib/adapters/loans-adapter.ts`:
  - [ ] `list()`, `getById()`, `getEmiSchedule()`, `payEmi()`
- [ ] Create `lib/adapters/auctions-adapter.ts`:
  - [ ] `list()`, `getById()`, `placeBid()`, `getMyBids()`
- [ ] Create `lib/adapters/payments-adapter.ts`:
  - [ ] `createOrder()`, `verifyPayment()`, `getHistory()`
- [ ] Create `lib/adapters/notifications-adapter.ts`:
  - [ ] `getNotifications()`, `markAsRead()`, `updatePreferences()`
- [ ] Create `lib/adapters/documents-adapter.ts`:
  - [ ] `upload()`, `getUrl()`, `delete()`
- [ ] Create `lib/adapters/geography-adapter.ts`:
  - [ ] `getCountries()`, `getStates()`, `getDistricts()`, `getWarehouses()`
- [ ] Create `lib/adapters/realtime-adapter.ts`:
  - [ ] Socket.IO client wrapper with reconnection
  - [ ] `joinRoom()`, `leaveRoom()`, `on()`, `off()`

### 4.2 Hooks Migration

- [ ] Refactor `hooks/queries/useRequests.ts` to use `requests-adapter`
- [ ] Refactor `hooks/queries/useLoans.ts` to use `loans-adapter`
- [ ] Refactor `hooks/queries/useAuctions.ts` to use `auctions-adapter`
- [ ] Create `hooks/useAuth.ts` using `auth-adapter`
- [ ] Create `hooks/useNotifications.ts` using `notifications-adapter`
- [ ] Create `hooks/useRealtime.ts` using `realtime-adapter`
- [ ] Delete inline fetch calls in components

### 4.3 Role Utils

- [ ] Create `lib/utils/role.ts`:
  - [ ] `isCustomer(user)`, `isAgent(user)`, `isDistrictAdmin(user)`
  - [ ] `isStateAdmin(user)`, `isSuperAdmin(user)`, `isAnyAdmin(user)`
  - [ ] `canManageRequests(user)`, `canManageLoans(user)`, `canManageAuctions(user)`
  - [ ] `getDefaultDashboard(user)` – return role-appropriate default view
- [ ] Centralize all role checks here, remove scattered checks in components

### 4.4 State Management

- [ ] Create `lib/state/user.store.ts` (Zustand):
  - [ ] `user`, `isAuthenticated`, `setUser`, `clearUser`
- [ ] Create `lib/state/notifications.store.ts` (Zustand):
  - [ ] `unreadCount`, `notifications`, `addNotification`, `markAsRead`
- [ ] Migrate from Context-only to Zustand where appropriate

### 4.5 Component Organization

- [ ] Move feature components to `components/features/`:
  - [ ] `components/features/requests/` – RequestList, RequestDetail, RequestForm, OfferCard
  - [ ] `components/features/loans/` – LoanList, LoanDetail, EmiSchedule, PaymentModal
  - [ ] `components/features/auctions/` – AuctionList, AuctionDetail, BidForm, BidHistory
  - [ ] `components/features/notifications/` – NotificationCenter, NotificationItem
- [ ] Keep `components/common/` for shared components
- [ ] Keep `components/ui/` for shadcn base components
- [ ] Keep `components/layout/` for app shell

### 4.6 Page Simplification

- [ ] Ensure pages in `app/` are thin:
  - [ ] Data fetching via hooks
  - [ ] Render feature components
  - [ ] No business logic in pages

---

## Phase 5: Realtime & Notifications Integration

**Goal:** End-to-end realtime updates and notification delivery.

### 5.1 Backend Realtime

- [ ] Ensure Socket.IO server in `socket/` uses Redis adapter
- [ ] Implement room join/leave handlers with RBAC validation
- [ ] Implement user room auto-join on auth
- [ ] Add authorization check before allowing room joins (see ARCHITECTURE.md 8.4)

### 5.2 Frontend Realtime

- [ ] Implement `realtime-adapter.ts` with:
  - [ ] Auto-reconnection
  - [ ] Room management
  - [ ] Event type safety
- [ ] Create `useRealtimeUpdates` hook:
  - [ ] On `request.updated` → invalidate request query
  - [ ] On `loan.updated` → invalidate loan query
  - [ ] On `auction.bid_placed` → invalidate auction query
  - [ ] On `notification.new` → add to notifications store

### 5.3 Notification Orchestrator

- [ ] Implement `packages/providers/src/notifications/orchestrator.ts`:
  - [ ] Accept notification event
  - [ ] Lookup policy for event type
  - [ ] Check user preferences
  - [ ] Apply rate limiting
  - [ ] Create NotificationLog entries
  - [ ] Push jobs to appropriate queues

### 5.4 Template System

- [ ] Create templates for all event types in `packages/providers/src/notifications/templates/`:
  - [ ] `request-created`, `request-stage-changed`, `offer-made`, `offer-accepted`
  - [ ] `loan-disbursed`, `emi-due-soon`, `emi-overdue`, `loan-defaulted`
  - [ ] `auction-created`, `bid-placed`, `outbid`, `auction-won`, `auction-ended`
  - [ ] `payment-success`, `payment-failed`
  - [ ] `otp`, `login-alert`, `password-reset`

---

## Phase 6: Testing, Observability & Security

**Goal:** Production-ready quality and security.

### 6.1 Testing

- [ ] Set up testing framework (Vitest or Jest)
- [ ] Unit tests for domain services:
  - [ ] `requests.service.test.ts`
  - [ ] `loans.service.test.ts`
  - [ ] `auctions.service.test.ts`
  - [ ] `payments.service.test.ts`
- [ ] Unit tests for RBAC:
  - [ ] `rbac.test.ts` – all permission functions
- [ ] Integration tests for critical flows:
  - [ ] Request creation → approval → disbursement
  - [ ] Payment flow
  - [ ] Auction bidding

### 6.2 Observability

- [ ] Add structured logging with correlation IDs in all services
- [ ] Add `/health/live` and `/health/ready` endpoints
- [ ] Add Prometheus metrics endpoint at `/metrics`
- [ ] Ensure AuditLog is populated for all significant actions

### 6.3 Security

- [ ] Review all endpoints for proper auth middleware
- [ ] Verify RBAC is enforced in all controllers
- [ ] Implement rate limiting per ARCHITECTURE.md 10.4:
  - [ ] Auth endpoints: 5 req/15min per IP+email
  - [ ] OTP requests: 3 req/5min per IP+phone/email
  - [ ] API (authenticated): 100 req/min per User ID
  - [ ] API (unauthenticated): 20 req/min per IP
  - [ ] Webhooks: 1000 req/min per IP
- [ ] Implement webhook security per ARCHITECTURE.md 10.5:
  - [ ] Verify Razorpay signature (HMAC-SHA256)
  - [ ] Store processed webhook IDs in Redis (24h TTL)
  - [ ] Respond within 5 seconds, queue heavy work
- [ ] Add Helmet.js for security headers
- [ ] Verify CORS configuration
- [ ] Add input sanitization (XSS prevention)

---

## Phase 7: Deployment & Cleanup

**Goal:** Production-ready deployment and final cleanup.

### 7.1 Deployment

- [ ] Update `infra/docker-compose.yml` with all services
- [ ] Create production Dockerfiles for each app
- [ ] Set up environment variable management
- [ ] Create deployment scripts/CI pipeline

### 7.2 Documentation

- [ ] Update README.md with setup instructions
- [ ] Verify ARCHITECTURE.md is up to date
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Add developer onboarding guide

### 7.3 Final Cleanup

- [ ] Delete all legacy files:
  - [ ] Old `api/` structure (after migration)
  - [ ] Old `services/` files (after migration)
  - [ ] Duplicate type definitions
- [ ] Run full lint and typecheck
- [ ] Verify all tests pass
- [ ] Tag release

---

## Notes & Blockers

_Record any blockers, decisions, or notes here during implementation._

| Date | Note |
|------|------|
| | |

---

## Completed Sessions

_Log completed work sessions here._

| Date | Session Summary | Items Completed |
|------|-----------------|-----------------|
| | | |
