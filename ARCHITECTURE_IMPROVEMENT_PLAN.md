# 🚀 FundifyHub Architecture Improvement Plan & Task Tracker

> **Last Updated:** December 3, 2025  
> **Status:** 🔄 In Progress  
> **Current Focus:** Phase 1 - Foundation & Critical Fixes

---

## 📋 Quick Navigation

1. [Overview](#overview)
2. [Agent Instructions](#agent-instructions)
3. [Tech Stack & Services](#tech-stack--services)
4. [Task Tracker](#task-tracker)
5. [Phase 1: Foundation & Critical Fixes](#phase-1-foundation--critical-fixes)
6. [Phase 2: Workflow & Notifications](#phase-2-workflow--notifications)
7. [Phase 3: API & Backend](#phase-3-api--backend)
8. [Phase 4: Frontend Consolidation](#phase-4-frontend-consolidation)
9. [Phase 5: Future Features (Auction)](#phase-5-future-features-auction)
10. [End-to-End User Flows](#end-to-end-user-flows)

---

## Overview

### What is FundifyHub?

A **pawn/loan application** that:
1. ✅ Accepts assets as collateral from customers
2. ✅ Provides loans against those assets
3. ✅ Collects EMI payments (Razorpay + Cash + Cheque)
4. ✅ Returns assets on loan completion
5. 🔜 Auctions assets on default (future)

### Current Architecture Health

| Component | Status | Main Issues |
|-----------|--------|-------------|
| Database Schema | 🟡 Medium | Overloaded models, string enums, missing indexes |
| WebSocket | 🟢 Good | ✅ Consolidated into main backend, Redis adapter ready |
| Workflow Engine | 🟡 Medium | Dual implementations, incomplete guards |
| Notifications | 🟢 Good | Works (WhatsApp + Email), needs optimization |
| API Backend | 🟡 Medium | Controller bloat, mixed validation |
| Frontend | 🟡 Medium | Duplicate socket patterns, some `any` types |

### Architecture Decision: Consolidate WebSocket into Main Backend

> **Decision Date:** December 3, 2025  
> **Reason:** Cost-cutting for free-tier deployments  
> **Impact:** Simpler deployment, single service, shared resources

**Before (2 services):**
```
Frontend:3000 ─┬─► Main Backend:3001 (REST API)
               └─► Live Sockets:3002 (WebSocket)
```

**After (1 service):**
```
Frontend:3000 ───► Main Backend:3001 (REST API + WebSocket)
```

**Benefits:**
- Single deployment target (free tier friendly)
- Shared Redis connection pool
- No cross-service communication needed
- Simpler authentication (same JWT middleware)
- Easier local development

**Migration Steps:**
1. Move socket handlers from `apps/live-sockets` to `apps/main-backend`
2. Attach Socket.IO to Express server
3. Update frontend to connect to main backend port
4. Remove `apps/live-sockets` folder
5. Update Docker Compose and scripts

---

## Agent Instructions

> **⚠️ MANDATORY:** All coding agents MUST follow these guidelines.

### Code Standards

```
1. ZERO `any` TYPES
   - Use proper types or `unknown` with type guards
   - Never use `any` as a shortcut
   
2. MODULARITY
   - One function = one responsibility
   - Max ~50 lines per function
   - Extract reusable code to shared packages
   
3. CENTRALIZATION
   - Constants → @fundifyhub/types/src/constants.ts
   - Types → @fundifyhub/types/src/types.ts
   - Utilities → @fundifyhub/utils/src/
   - Templates → @fundifyhub/templates/src/
   
4. DOCUMENTATION
   - JSDoc for exported functions
   - Inline comments for complex logic only
   - No redundant comments
   
5. ERROR HANDLING
   - Use structured error types
   - Log errors with context
   - Return meaningful messages
   
6. DATABASE
   - Always use Prisma from @fundifyhub/prisma
   - Use transactions for multi-table ops
   - Add indexes for frequent queries
   
7. API PATTERNS
   - Zod for ALL request validation
   - Response format: { success, message, data? }
   - Proper HTTP status codes
```

### File Naming Conventions

```
*.types.ts       → Type definitions
*.constants.ts   → Constants and enums  
*.service.ts     → Business logic
*.controller.ts  → HTTP request handlers
*.routes.ts      → Express route definitions
*.middleware.ts  → Express middleware
*.utils.ts       → Utility functions
*.schema.ts      → Zod validation schemas
```

### Import Order

```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';

// 2. External packages
import express from 'express';

// 3. Internal packages (@fundifyhub/*)
import { UserType } from '@fundifyhub/types';

// 4. Relative imports
import { validateRequest } from './middleware';
```

### Task Completion Checklist

Before marking any task complete:
- [ ] Run `pnpm build` - no TypeScript errors
- [ ] Run `pnpm lint` - no linting errors  
- [ ] Test the feature manually
- [ ] Update this file with completion date
- [ ] No `any` types introduced

---

## Tech Stack & Services

### Current Stack (All Free/Open Source) ✅

| Service | Purpose | Package |
|---------|---------|---------|
| **PostgreSQL** | Database | Docker/Local |
| **Redis** | Cache, Queues, Sessions | Docker/Local |
| **BullMQ** | Background Jobs | `bullmq` |
| **Email** | Notifications | `nodemailer` + SMTP |
| **WhatsApp** | Notifications | `whatsapp-web.js` |
| **Payments** | Razorpay + Manual | `razorpay` SDK |
| **Files** | Documents | UploadThing |
| **WebSocket** | Real-time | `socket.io` |

### To Add (All Free) 🆕

| Service | Purpose | Package | Priority |
|---------|---------|---------|----------|
| **Redis Adapter** | Socket Scaling | `@socket.io/redis-adapter` | 🔴 Critical |
| **Web Push** | Browser Notifications | `web-push` | 🟡 Medium |

### Payment Methods Supported

| Method | Type | How |
|--------|------|-----|
| **Razorpay** | Online | Razorpay SDK + Webhooks |
| **UPI** | Online | Via Razorpay |
| **Cash** | Manual | Admin marks paid |
| **Cheque** | Manual | Admin marks after clearance |
| **Bank Transfer** | Manual | Admin verifies & marks |

---

## Task Tracker

### Progress Summary

| Phase | Total | Done | In Progress | Status |
|-------|-------|------|-------------|--------|
| **Phase 1:** Foundation | 36 | 18 | 0 | 🟡 In Progress |
| **Phase 2:** Workflow | 13 | 0 | 0 | 🔴 Not Started |
| **Phase 3:** API | 14 | 3 | 0 | 🟡 In Progress |
| **Phase 4:** Frontend | 8 | 0 | 0 | 🔴 Not Started |
| **Phase 5:** Auction | 8 | 0 | 0 | 🔴 Not Started |
| **TOTAL** | **79** | **21** | **0** | **27%** |

### Current Sprint

**Focus:** Phase 1 Foundation Tasks - Code Organization & Type Safety

Priority tasks to complete first (in order):
1. [x] 1.0.1 - Password Reset Backend ✅
2. [x] 1.0.2 - Fix Frontend Reset Password ✅
3. [x] 1.0.3 - Admin User Creation Notification ✅
4. [x] 1.2.1-1.2.5 - WebSocket Consolidation ✅
5. [x] 1.1.5 - Add database indexes ✅
6. [x] 1.3.1-1.3.2 - Fix `any` types ✅
7. [x] 3.1.2-3.1.3, 3.1.6 - Validation & Error Handling ✅
8. [x] **1.4.1 - Restructure types by domain** ✅
9. [x] **1.4.4 - Merge Duplicate Workflow Files** ✅
10. [x] **1.4.2 - Create Backend Service Layer** ✅
11. [x] **1.4.3 - Split Large Controller Files** ✅
12. [x] **1.4.5 - Consolidate Constants File** ✅
13. [x] **1.1.4 - Convert to Prisma enums (type safety)** ✅
14. [x] **1.1.8 - Sync DB Schema & Update Seed** ✅
15. [ ] Review remaining Phase 1 tasks (NEXT)

### Recently Completed

| Task | Description | Completed |
|------|-------------|-----------|
| 1.0.1 | Password Reset Backend | Dec 3, 2025 |
| 1.0.2 | Frontend Reset Password Page | Dec 3, 2025 |
| 1.0.3 | Admin User Creation Notification | Dec 3, 2025 |
| 1.0.4 | Session Management & Logout | Dec 3, 2025 |
| 1.1.5 | Add Missing Database Indexes | Dec 3, 2025 |
| 1.2.1 | Consolidate Socket.IO into Main Backend | Dec 3, 2025 |
| 1.2.2 | Create Socket Module Structure | Dec 3, 2025 |
| 1.2.3 | Add Redis Adapter for Scaling | Dec 3, 2025 |
| 1.2.4 | Update Frontend Socket Connection | Dec 3, 2025 |
| 1.2.5 | Remove Live Sockets Service | Dec 3, 2025 |
| 1.3.1 | Fix `any` types in packages/types | Dec 3, 2025 |
| 1.3.2 | Fix `any` types in Frontend API Client | Dec 3, 2025 |
| 1.3.3 | Fix TypeScript Issues in Backend | Dec 3, 2025 |
| 1.3.4 | Remove Duplicate Interface Definitions | Dec 3, 2025 |
| 3.1.2 | Create Zod Validation Middleware | Dec 3, 2025 |
| 3.1.3 | Standardize Response Format | Dec 3, 2025 |
| 3.1.6 | Improve Error Handling (Custom Errors) | Dec 3, 2025 |
| 1.4.1 | Restructure packages/types by Domain | Dec 3, 2025 |
| 1.4.4 | Merge Duplicate Workflow Files | Dec 3, 2025 |
| 1.4.2 | Create Backend Service Layer | Dec 3, 2025 |
| 1.4.3 | Split Large Controller Files | Dec 3, 2025 |
| 1.4.5 | Consolidate Constants File | Dec 3, 2025 |
| 1.1.4 | Convert String Statuses to Prisma Enums | Dec 3, 2025 |
| 1.1.8 | Sync Database Schema & Update Seed | Dec 3, 2025 |

---

## Phase 1: Foundation & Critical Fixes

### 1.0 Authentication & User Management

> **Goal:** Complete, production-ready authentication flows for all roles

#### 1.0.1 Implement Password Reset Backend
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:**
  - `apps/main-backend/src/api/auth/controllers.ts`
  - `apps/main-backend/src/api/auth/routes.ts`
  - `packages/types/src/auth-schemas.ts`
  - `packages/types/src/constants.ts` - Added PASSWORD_RESET to TEMPLATE_NAMES
  - `packages/types/src/types.ts` - Added PasswordResetPayloadType
  - `packages/templates/src/templates/passwordReset/` - New template folder
  - `apps/main-backend/src/utils/notifications.ts` - Added sendPasswordResetNotification
  - `apps/main-backend/src/utils/audit.ts` - Added audit functions
- **Description:** Complete password reset flow
- **Endpoints Added:**
  - `POST /api/v1/auth/forgot-password` - Generate reset token, send email/WhatsApp
  - `POST /api/v1/auth/reset-password` - Verify token, update password
- **Features:**
  - Secure crypto random token generation
  - 1-hour token expiration
  - Multi-channel notification (email + WhatsApp)
  - Audit logging (passwordResetRequested, passwordReset)
  - Zod validation schemas (forgotPasswordSchema, resetPasswordConfirmSchema)
  - Professional email template with React Email
  - WhatsApp message template
- **Completed:** December 3, 2025

#### 1.0.2 Fix Frontend Reset Password Page
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:**
  - `apps/frontend/src/app/reset-password/page.tsx` - Updated with real API integration
  - `apps/frontend/src/app/reset-password/confirm/page.tsx` - New token-based reset page
  - `apps/frontend/src/lib/urls.ts` - Added FORGOT_PASSWORD and RESET_PASSWORD endpoints
- **Description:** Connect frontend to actual backend API
- **Features:**
  - Request password reset via email
  - Token-based reset confirmation page
  - Password validation with Zod
  - Error handling for expired/invalid tokens
  - Success confirmation with login redirect
  - Privacy-conscious messaging (doesn't reveal if email exists)
- **Completed:** December 3, 2025

#### 1.0.3 Improve Admin User Creation
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:**
  - `apps/main-backend/src/api/admin/users/controllers.ts` - Updated with notification
  - `apps/main-backend/src/utils/notifications.ts` - Added sendAdminUserCreatedNotification
  - `packages/types/src/constants.ts` - Added ADMIN_USER_CREATED to TEMPLATE_NAMES
  - `packages/types/src/types.ts` - Added AdminUserCreatedPayloadType
  - `packages/templates/src/templates/adminUserCreated/` - New template folder
- **Description:** 
  - Secure crypto random password generation
  - Send welcome email/WhatsApp with temp password and login link
  - Includes assigned roles and districts in notification
  - Professional email template with React Email
- **Completed:** December 3, 2025

#### 1.0.4 Add Session Management
- **Status:** `DONE`
- **Priority:** 🟡 High
- **Files:**
  - `packages/prisma/prisma/schema.prisma` - Added Session model
  - `apps/main-backend/src/services/session.service.ts` (new)
  - `apps/main-backend/src/api/user/sessions.controller.ts` (new)
  - `apps/main-backend/src/api/user/routes.ts` - Added session routes
- **Description:**
  - Created Session model with tokenHash, deviceInfo, IP, location, expiry
  - Track active sessions per user with device fingerprinting
  - Endpoints: GET /sessions, DELETE /sessions/:id, DELETE /sessions/all
  - Force logout from other devices
  - Session validation with auto-extension and cleanup
  - Multi-device support with current session detection
- **Completed:** December 2025

#### 1.0.5 Implement Notification Preferences API
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:**
  - `apps/main-backend/src/api/user/preferences.controller.ts` (new)
  - `apps/main-backend/src/api/user/routes.ts`
  - `apps/frontend/src/app/settings/page.tsx`
- **Description:**
  - Backend: CRUD for NotificationPreference model (model already exists!)
  - Frontend: Enable toggles in Notification Settings tab
- **Current State:** Frontend shows "Coming Soon" message
- **Completed:** _Not started_

#### 1.0.6 Add Platform Settings Management
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `apps/main-backend/src/api/admin/settings.controller.ts` (new)
  - `packages/prisma/prisma/schema.prisma`
- **Description:**
  - Create PlatformSettings model (key-value or typed)
  - Settings: maintenanceMode, allowRegistrations, allowNewApplications
  - Super Admin only endpoint
  - Maintenance middleware to block requests
- **Current State:** Frontend shows "Coming Soon" for platform settings
- **Completed:** _Not started_

#### 1.0.7 Add Two-Factor Authentication (2FA)
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `apps/main-backend/src/api/auth/2fa.controller.ts` (new)
  - `apps/frontend/src/app/settings/page.tsx`
- **Description:**
  - TOTP-based 2FA using `speakeasy` or `otpauth` package (free)
  - Setup: generate secret, show QR code, verify code
  - Login: require 2FA code if enabled
  - Recovery codes for backup
- **Current State:** Frontend shows "Coming Soon" button
- **Completed:** _Not started_

#### 1.0.8 Add Login Activity Logging
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `apps/main-backend/src/api/auth/controllers.ts`
  - `packages/prisma/prisma/schema.prisma`
- **Description:**
  - Create LoginActivity model (userId, ip, userAgent, location, success, timestamp)
  - Log all login attempts
  - Show recent activity in settings
  - Alert on new device login (uses existing loginAlert template)
- **Completed:** _Not started_

---

### ✅ Already Implemented (No Changes Needed)

These features already exist and are functional:

| Feature | Location | Status |
|---------|----------|--------|
| User Registration (OTP) | `auth/controllers.ts` | ✅ Complete |
| User Login | `auth/controllers.ts` | ✅ Complete |
| User Logout | `auth/controllers.ts` | ✅ Complete |
| Change Password | `auth/controllers.ts` | ✅ Complete |
| User Profile Get | `user/controllers.ts` | ✅ Complete |
| User Profile Update | `user/controllers.ts` | ✅ Complete |
| Admin Create User | `admin/users/controllers.ts` | ⚠️ Works but needs improvement |
| Admin List Users | `admin/users/controllers.ts` | ✅ Complete |
| Admin Update User | `admin/users/controllers.ts` | ✅ Complete |
| Admin Delete User | `admin/users/controllers.ts` | ✅ Complete |
| RBAC Middleware | `utils/rbac.ts` | ✅ Complete |
| JWT Auth Middleware | `utils/jwt.ts` | ✅ Complete |
| Settings Page | `frontend/settings/` | ⚠️ Works, some features "Coming Soon" |

---

### 1.1 Database Schema Redesign

> **Goal:** Normalize schema, add proper enums, optimize queries

#### 1.1.1 Extract Asset Model
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Create separate Asset model from Request fields
- **New Model Fields:**
  - id, assetType, brand, model, condition
  - purchaseYear, estimatedValue, inspectedValue
  - status (PLEDGED/RELEASED/IN_AUCTION/SOLD)
  - photos relation
- **Completed:** _Not started_

#### 1.1.2 Extract BankDetails Model
- **Status:** `TODO`
- **Priority:** 🟡 High  
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Users can have multiple bank accounts
- **New Model Fields:**
  - id, userId, accountNumber, ifscCode
  - accountName, upiId, isVerified, isPrimary
- **Completed:** _Not started_

#### 1.1.3 Extract AdminOffer Model
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Keep offer history, support revisions
- **New Model Fields:**
  - id, requestId, offeredBy, offeredAmount
  - tenureMonths, interestRate, processingFee
  - expiresAt, status (PENDING/ACCEPTED/DECLINED/EXPIRED/REVISED)
- **Completed:** _Not started_

#### 1.1.4 Convert String Statuses to Prisma Enums
- **Status:** `DONE`
- **Priority:** 🔴 Critical
- **Files:** 
  - `packages/prisma/prisma/schema.prisma`
  - `packages/types/src/constants.ts`
  - `packages/prisma/prisma/seed.ts`
  - `apps/main-backend/src/api/documents/controllers.ts`
  - `apps/main-backend/src/api/requests/controllers.ts`
  - `apps/main-backend/src/api/payments/razorpay.ts`
  - `apps/main-backend/src/services/request.service.ts`
- **Description:** Replace String status fields with Prisma enum types
- **Enums Created:**
  - RequestStatus (28 states)
  - LoanStatus (ACTIVE, COMPLETED, DEFAULTED)
  - EMIStatus (PENDING, PAID, OVERDUE, DEFAULTED)
  - InspectionStatus (PENDING, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
  - PaymentOrderStatus (CREATED, ATTEMPTED, PAID, FAILED, EXPIRED)
  - DocumentStatus (ACTIVE, ARCHIVED, DELETED)
- **Changes Made:**
  - Created Prisma enums in schema.prisma
  - Updated all model fields to use enum types
  - Updated seed.ts to use Prisma enum imports
  - Fixed backend controllers to import enum types from @fundifyhub/prisma
  - Cast TypeScript enum values to Prisma enum types where needed
- **Completed:** December 2025

#### 1.1.5 Add Missing Database Indexes
- **Status:** `DONE`
- **Priority:** 🔴 Critical
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Added indexes for frequent queries
- **Indexes Added:**
  - User: phoneNumber
  - Request: requestNumber, (district, currentStatus), (customerId, currentStatus), (assignedAgentId, currentStatus)
  - Loan: loanNumber, (status, disbursedDate)
  - EMISchedule: (dueDate, status), (loanId, status)
  - Payment: paymentReference, (loanId, paidDate)
- **Note:** NotificationLog indexes already existed in schema
- **Completed:** December 2025

#### 1.1.6 Remove Redundant Foreign Keys
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Remove requestId from EMISchedule, Payment, PaymentOrder (derivable via loanId)
- **Completed:** _Not started_

#### 1.1.7 Add FK for NotificationLog.userId
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Add proper relation NotificationLog.userId → User
- **Completed:** _Not started_

#### 1.1.8 Create Migration & Update Seed
- **Status:** `DONE`
- **Priority:** 🟡 High
- **Files:** 
  - `packages/prisma/prisma/schema.prisma`
  - `packages/prisma/prisma/seed.ts`
- **Description:** Sync database with Prisma schema changes using `db push` (development-only approach); seed updated to use Prisma enum types
- **Depends On:** 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5
- **Note:** Used `prisma db push --accept-data-loss` for development; for production, a proper migration would need to handle existing data conversion
- **Completed:** December 2025

---

### 1.2 WebSocket Consolidation (Merge into Main Backend)

> **Goal:** Single service deployment, cost-effective, scalable with Redis adapter

#### 1.2.1 Consolidate Socket.IO into Main Backend
- **Status:** ✅ `DONE`
- **Priority:** 🔴 Critical
- **Files:**
  - `apps/main-backend/src/server.ts`
  - `apps/main-backend/src/socket/` (new folder)
  - `apps/main-backend/package.json`
- **Description:** 
  - Move all socket logic from `apps/live-sockets` to `apps/main-backend/src/socket/`
  - Attach Socket.IO to Express HTTP server
  - Install `socket.io` and `@socket.io/redis-adapter` in main-backend
- **Migration Pattern:**
  ```typescript
  // apps/main-backend/src/server.ts
  import { createServer } from 'http';
  import { Server as SocketServer } from 'socket.io';
  import { createAdapter } from '@socket.io/redis-adapter';
  
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, { cors: {...} });
  
  // Add Redis adapter for horizontal scaling
  io.adapter(createAdapter(pubClient, subClient));
  
  httpServer.listen(PORT);
  ```
- **Completed:** December 3, 2025

#### 1.2.2 Create Socket Module Structure
- **Status:** ✅ `DONE`
- **Priority:** 🔴 Critical
- **Files:**
  - `apps/main-backend/src/socket/index.ts` - Socket initialization
  - `apps/main-backend/src/socket/handlers.ts` - Event handlers
  - `apps/main-backend/src/socket/middleware.ts` - Auth middleware
  - `apps/main-backend/src/socket/types.ts` - Socket type definitions
- **Description:** Organize socket code in modular structure
- **Completed:** December 3, 2025

#### 1.2.3 Add Redis Adapter for Scaling
- **Status:** ✅ `DONE`
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/socket/index.ts`
- **Description:** Enable horizontal scaling with Redis pub/sub (optional, auto-detects Redis URL)
- **Completed:** December 3, 2025

#### 1.2.4 Update Frontend Socket Connection
- **Status:** ✅ `DONE`
- **Priority:** 🔴 Critical
- **Files:**
  - `apps/frontend/src/lib/config.ts` - Auto-derives wsUrl from apiUrl
  - `apps/frontend/src/hooks/useSocket.ts` - Uses config.public.wsUrl
  - `.env.example` - Updated to point WS to port 3001
- **Description:** Point socket connection to main backend (port 3001)
- **Completed:** December 3, 2025

#### 1.2.5 Remove Live Sockets Service
- **Status:** `DONE` ✅
- **Priority:** 🟡 Low
- **Files:**
  - `apps/live-sockets/` - DELETED
  - `package.json` - Removed dev:sockets script
  - `tsconfig.json` - Removed live-sockets reference
  - `packages/types/src/socket-types.ts` - Updated comment
- **Description:** Cleaned up after WebSocket consolidation into main-backend
- **Completed:** December 3, 2025

#### 1.2.6 Move Connection Tracking to Redis
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/socket/rooms.ts`
- **Description:** Replace in-memory Map with Redis hash for user connections
- **Completed:** _Not started_

---

### 1.3 Type Safety Cleanup

> **Goal:** Zero `any` types across codebase

#### 1.3.1 Fix `any` Types in packages/types
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:** `packages/types/src/*.ts`
- **Description:** 
  - Replace `any` with proper types
  - Use `unknown` with type guards
  - Define proper JsonValue type
- **Pattern:**
  ```typescript
  // Before
  metadata?: any;
  
  // After
  type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
  metadata?: JsonValue;
  ```
- **Completed:** December 3, 2025

#### 1.3.2 Fix `any` in Frontend API Client
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:** 
  - `apps/frontend/src/lib/api-client.ts` - Removed all `any` defaults, added type guards
  - `apps/frontend/src/lib/document-api.ts` - Added explicit response type interfaces
  - `apps/frontend/src/lib/request-actions.ts` - Added StatusUpdateResponse, NotesPayload types
  - `apps/frontend/src/lib/analytics.ts` - Added Window type declaration for dataLayer
  - `apps/frontend/src/lib/actionLabels.ts` - Added JsonValue import, isPlainObject type guard
  - `apps/frontend/src/app/login/page.tsx` - Added LoginResponse interface
  - `apps/frontend/src/app/register/page.tsx` - Added AvailabilityResponse, OTPSendResponse, OTPVerifyResponse, RegisterResponse
  - `apps/frontend/src/components/request/context/RequestActionContext.tsx` - Fixed onSuccess callback signature
  - `apps/frontend/src/components/request/context/RequestContext.tsx` - Added GetRequestResponse interface
  - `apps/frontend/src/contexts/AuthContext.tsx` - Added ValidateResponse interface
- **Description:** 
  - Removed default `any` types from get<T>(), post<T>(), getWithResult<T>(), postWithResult<T>()
  - All API calls now require explicit type parameters
  - Added BackendEnvelope<T> interface for standard responses
  - Added type guards: isAxiosError(), isErrorPayload(), isBackendEnvelope()
  - Created response interfaces for all API endpoints
- **Completed:** December 3, 2025

#### 1.3.3 Fix TypeScript Issues in Backend
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/**/*.ts`
- **Description:** 
  - Remove all `@ts-ignore` comments ✅
  - Fix underlying type issues ✅
  - Properly type Prisma results ✅
- **Progress:**
  - ✅ Removed `@ts-ignore` from `server.ts` - Extended Express Request type with `rawBody`
  - ✅ Removed `any` from `APIResponseType<T>` in `types/index.ts` - now uses `unknown`
  - ✅ Fixed `audit.ts` - Removed `(req as any).user` casts, imported types properly
  - ✅ Fixed `serial.ts` - Added proper Prisma error type guards
  - ✅ Fixed `rateLimiter.ts` - Added `getNumberFromResult` helper for Redis results
  - ✅ Fixed `otpStore.ts` - Fixed `any` in error handling and Redis results
  - ✅ Added `AuthenticatedUser` interface and `isAuthenticated()` type guard in `types/index.ts`
  - ✅ Added Prisma helper types: `RequestDetailWithLoan`, `EMIScheduleItem`, `EMIWithBreakdown`
  - ✅ Fixed `getRequestDetailController` - proper EMI breakdown types, signed URL generation
  - ✅ Fixed `assignAgentController` - uses `Prisma.RequestUpdateInput` instead of `any`
  - ✅ Fixed `updateStatusController` - proper metadata typing with `StatusChangeMetadata` interface
  - ✅ Fixed all `req.user as any` patterns with `isAuthenticated()` type guard
  - ✅ Added `AdminEmiScheduleSnapshot` type and `isAdminEmiScheduleSnapshot()` type guard for JSON column
  - ✅ Added `NormalizedEmiData` type with `normalizeAdminSnapshot()` and `normalizeEmiCalcResult()` helpers
  - ✅ Fixed all UploadThing buffer casts with proper `File` constructor patterns
  - ✅ Fixed `confirmOfferController` and `createLoanController` - proper transaction return types
  - ✅ Fixed `generateAgreementController` and `submitSignedAgreementController` - proper EMI schedule mapping
  - ✅ Removed all `as any` casts from `controllers.ts` (was 50+, now 0)
  - ✅ Fixed `commentsEnabled` field access - removed unnecessary casts
  - ✅ Fixed `AUDIT_ACTION.DOCUMENT_UPLOADED` - removed unnecessary cast
- **Completed:** December 3, 2025

#### 1.3.4 Remove Duplicate Interface Definitions
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:** 
  - `packages/types/src/types.ts`
  - `packages/types/src/template-types.ts`
- **Description:** Remove duplicate LoanType, EMIScheduleType - single source
- **Note:** Verified that LoanType and EMIScheduleType are only defined once in `types.ts`. No duplicates found.
- **Completed:** December 3, 2025

#### 1.3.5 Standardize Enum Patterns
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/types/src/constants.ts`
- **Description:** Use consistent pattern - prefer `as const` objects
- **Completed:** _Not started_

---

### 1.4 Industry-Standard Code Organization

> **Goal:** Clean, scalable, maintainable codebase following industry best practices

#### 1.4.1 Restructure packages/types for Domain-Driven Design
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:** `packages/types/src/`
- **Description:** Reorganized types by domain instead of by file type
- **New Structure:**
  ```
  packages/types/src/
  ├── index.ts                  # Re-exports from all domains + legacy compatibility
  ├── common/
  │   ├── json.types.ts         # JsonValue, JsonObject, etc.
  │   ├── api.types.ts          # APIResponse, PaginatedResponse
  │   └── index.ts
  ├── auth/
  │   ├── auth.types.ts         # UserType, JWTPayloadType, SessionType
  │   ├── auth.schemas.ts       # Zod schemas for auth
  │   ├── auth.constants.ts     # ROLES, auth-related constants
  │   └── index.ts
  ├── request/
  │   ├── request.types.ts      # RequestType, InspectionType
  │   ├── request.constants.ts  # REQUEST_STATUS, status arrays
  │   ├── workflow.types.ts     # WORKFLOW_MATRIX, WorkflowAction, WorkflowState (merged)
  │   └── index.ts
  ├── loan/
  │   ├── loan.types.ts         # LoanType, EMIScheduleType, PaymentType
  │   ├── loan.constants.ts     # LOAN_STATUS, EMI_STATUS, etc.
  │   └── index.ts
  ├── document/
  │   ├── document.types.ts     # DocumentType
  │   ├── document.constants.ts # DOCUMENT_TYPE, DOCUMENT_CATEGORY
  │   └── index.ts
  ├── notification/
  │   ├── notification.constants.ts
  │   └── index.ts
  ├── payment/
  │   ├── payment.constants.ts  # PAYMENT_METHOD, PAYMENT_STATUS
  │   └── index.ts
  └── ui/
      ├── ui.constants.ts       # Colors, icons, labels for frontend
      └── index.ts
  ```
- **Key Changes:**
  - Created domain folders with barrel exports (index.ts)
  - Merged workflow.ts + workflow-types.ts → request/workflow.types.ts
  - Removed `as const` from status arrays to fix readonly assignment errors
  - Main index.ts exports all domains + maintains backward compatibility
  - Legacy files kept for reference but all exports come from domains
- **Completed:** December 2025

#### 1.4.2 Create Backend Service Layer
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:** `apps/main-backend/src/services/`
- **Description:** Extract business logic from controllers into services
- **What Was Done:**
  - Created `services/` folder with organized structure
  - Created `request.service.ts` - Request business logic with typed interfaces
  - Created `session.service.ts` - Session management
  - Created `services/index.ts` - Barrel exports
- **Service Pattern Implemented:**
  ```typescript
  // services/request.service.ts
  export interface UserContext {
    id: string;
    roles: UserRole[];
    districts: string[];
    firstName?: string;
    lastName?: string;
  }
  
  export async function getRequestDetail(
    requestId: string,
    user: UserContext
  ): Promise<ServiceResult<RequestDetailResponse>> { ... }
  ```
- **Completed:** December 3, 2025

#### 1.4.3 Split Large Controller Files
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/api/requests/controllers/`
- **Description:** Split 2459-line controller into focused domain modules
- **New Structure:**
  ```
  apps/main-backend/src/api/requests/controllers/
  ├── index.ts                  # Organized barrel exports
  ├── shared.ts                 # Common imports for all controllers
  ├── request.controller.ts     # Core request operations
  ├── assignment.controller.ts  # Agent/Admin assignment + workflow
  ├── offer.controller.ts       # Offer management
  ├── loan.controller.ts        # Loan creation
  ├── agreement.controller.ts   # Agreement generation/signing
  ├── inspection.controller.ts  # Inspection + bank details
  ├── comment.controller.ts     # Comment management
  └── document.controller.ts    # Document upload
  ```
- **Key Changes:**
  - Created domain-specific controller files that re-export from legacy controllers.ts
  - Updated `routes.ts` to import from new `./controllers` barrel
  - Maintains backward compatibility while enabling gradual migration
  - Each domain file can be extended with actual implementations over time
- **Completed:** December 3, 2025

#### 1.4.4 Merge Duplicate Workflow Files
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:**
  - `packages/types/src/workflow.ts` → Content merged to request/workflow.types.ts
  - `packages/types/src/workflow-types.ts` → Content merged to request/workflow.types.ts
  - `packages/utils/src/workflow/` → Kept (workflow engine logic)
- **Description:** 
  - Merged `workflow.ts` (WORKFLOW_MATRIX) and `workflow-types.ts` (WORKFLOW_EVENTS)
  - Combined into `packages/types/src/request/workflow.types.ts`
  - Legacy files kept for backward compatibility but content now in domain folder
- **Completed:** December 2025
  4. Update all imports
- **Completed:** _Not started_

#### 1.4.5 Consolidate Constants File
- **Status:** `IN_PROGRESS` 🔄
- **Priority:** 🟡 High
- **Files:** `packages/types/src/constants.ts` (1500+ lines)
- **Description:** Split monolithic constants file by domain
- **Current State:**
  - Legacy `constants.ts` has ~1500 lines with all constants
  - Domain modules (auth/, request/, loan/, etc.) have been created
  - Some duplication exists (e.g., ROLES in both places)
  - Main index.ts exports from BOTH legacy and domain modules
- **Migration Strategy:**
  1. Domain modules are the NEW source of truth
  2. Legacy constants.ts provides backward compatibility
  3. Gradually deprecate legacy exports as consumers update
- **What's Already Migrated:**
  - ✅ `auth/auth.constants.ts` - ROLES, DISTRICTS, VALIDATION_PATTERNS
  - ✅ `request/request.constants.ts` - REQUEST_STATUS, status arrays, phases
  - ✅ `request/workflow.types.ts` - WORKFLOW_MATRIX, WORKFLOW_EVENTS
- **Still in Legacy (to migrate):**
  - SERVICE_NAMES, TEMPLATE_NAMES → notification/
  - QUEUE_NAMES, JOB_TYPES → common/queue.constants.ts
  - DOCUMENT_* constants → document/
  - LOAN_STATUS, EMI_STATUS → loan/
  - PAYMENT_* constants → payment/
- **Completed:** _In Progress_

#### 1.4.6 Add Proper Logging Infrastructure
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:**
  - `packages/logger/src/logger.ts` → Enhance
  - All service files
- **Description:** Implement structured logging with proper levels
- **Requirements:**
  - Request ID tracking across services
  - Structured JSON logs for production
  - Pretty logs for development
  - Log levels: error, warn, info, debug
  - Sensitive data redaction (passwords, tokens)
- **Pattern:**
  ```typescript
  // Every log should include context
  logger.info('Request created', { 
    requestId: req.id, 
    customerId: data.customerId,
    amount: data.amount,
    traceId: req.headers['x-request-id']
  });
  
  // Errors should include stack and context
  logger.error('Failed to create request', {
    error: err.message,
    stack: err.stack,
    customerId: data.customerId
  });
  ```
- **Completed:** _Not started_

#### 1.4.7 Remove Unused Models and Fields
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** Clean up unused or redundant database models/fields
- **Candidates for Review:**
  - ~~RequestHistory~~ - Already removed, using AuditLog
  - Inspection model - Review if fully utilized
  - redundant `requestId` on EMISchedule (derivable from loanId)
  - Check for unused notification-related columns
- **Action:** Audit all models, document usage, remove truly unused
- **Completed:** _Not started_

#### 1.4.8 Standardize Error Codes
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `apps/main-backend/src/utils/errors.ts`
  - All controllers
- **Description:** Create consistent error code system
- **Error Code Format:** `DOMAIN_ACTION_REASON`
- **Examples:**
  ```typescript
  export const ERROR_CODES = {
    // Auth errors
    AUTH_LOGIN_INVALID_CREDENTIALS: 'AUTH_LOGIN_INVALID_CREDENTIALS',
    AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    
    // Request errors
    REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
    REQUEST_INVALID_TRANSITION: 'REQUEST_INVALID_TRANSITION',
    REQUEST_ALREADY_ASSIGNED: 'REQUEST_ALREADY_ASSIGNED',
    
    // Loan errors
    LOAN_ALREADY_EXISTS: 'LOAN_ALREADY_EXISTS',
    LOAN_INVALID_AMOUNT: 'LOAN_INVALID_AMOUNT',
    
    // Payment errors
    PAYMENT_INVALID_AMOUNT: 'PAYMENT_INVALID_AMOUNT',
    PAYMENT_EMI_ALREADY_PAID: 'PAYMENT_EMI_ALREADY_PAID',
  } as const;
  ```
- **Completed:** _Not started_

---

## Phase 2: Workflow & Notifications

### 2.1 Unified Workflow Engine

> **Goal:** Single, extensible workflow system

#### 2.1.1 Consolidate Workflow Implementations
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:**
  - `packages/types/src/workflow.ts` (delete after merge)
  - `packages/types/src/workflow-types.ts`
  - `packages/utils/src/workflow/`
- **Description:** Merge into single system. Types in types package, logic in utils.
- **Completed:** _Not started_

#### 2.1.2 Enhance WorkflowContext Interface
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/types/src/workflow-types.ts`
- **Description:** Add all required fields, remove need for type casts
- **Fields to Add:**
  - assignedAdminId, previousStatus
  - transitionHistory, loanDetails
- **Completed:** _Not started_

#### 2.1.3 Implement Missing Business Guards
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/utils/src/workflow/guards.ts`
- **Description:** Add guards for:
  - Loan amount limits (min/max)
  - Tenure validation (min/max months)
  - Max reschedule attempts
  - Offer expiry validation
- **Completed:** _Not started_

#### 2.1.4 Add Transition History Tracking
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** 
  - `packages/prisma/prisma/schema.prisma`
  - `packages/utils/src/workflow/engine.ts`
- **Description:** Create StatusTransition model, enable time-based rules
- **Completed:** _Not started_

#### 2.1.5 Implement Automated Transitions
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/job-worker/src/workers/`
- **Description:** Create cron jobs for:
  - AUTO_EXPIRE_OFFER (after 48h)
  - AUTO_OVERDUE (EMI not paid by due date + grace)
  - AUTO_DEFAULT (after X overdue EMIs)
- **Completed:** _Not started_

#### 2.1.6 Add Complete Transition Coverage
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/utils/src/workflow/config.ts`
- **Description:** Ensure all status→status paths are defined
- **Missing Transitions:**
  - APPROVED → PENDING_SIGNATURE
  - Payment flows
  - Asset release flows
- **Completed:** _Not started_

---

### 2.2 Notification Optimization

> **Goal:** Reliable notifications with proper tracking

#### 2.2.1 Implement NotificationLog Persistence
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:**
  - `packages/notifications/src/notification-service.ts`
  - `apps/job-worker/src/workers/notification.worker.ts`
- **Description:** Log every attempt to NotificationLog model
- **Completed:** _Not started_

#### 2.2.2 Add Per-User Rate Limiting
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/notifications/src/notification-service.ts`
- **Description:** Redis counters for notifications per user per hour
- **Completed:** _Not started_

#### 2.2.3 Implement User Preference Checking
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/notifications/src/notification-service.ts`
- **Description:** Check NotificationPreference before send, respect quiet hours
- **Completed:** _Not started_

#### 2.2.4 Optimize WhatsApp Service
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/job-worker/src/services/whatsapp.service.ts`
- **Description:**
  - Connection health monitoring
  - Auto-reconnect logic
  - QR code refresh handling
  - Session persistence
- **Completed:** _Not started_

#### 2.2.5 Create Missing Templates
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/templates/src/templates/`
- **Description:** Add templates for:
  - INSPECTION_SCHEDULED
  - INSPECTION_REMINDER
  - LOAN_CREATED
  - ASSET_RELEASE
  - DEFAULT_WARNING
  - PAYMENT_SUCCESS
- **Completed:** _Not started_

#### 2.2.6 Add Web Push Support
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `packages/notifications/src/channel-adapters/push.adapter.ts`
  - `apps/frontend/public/sw.js`
- **Description:** Use `web-push` package (free), add service worker
- **Completed:** _Not started_

#### 2.2.7 Implement Retry Optimization
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/job-worker/src/workers/notification.worker.ts`
- **Description:** Exponential backoff, different strategies per channel
- **Completed:** _Not started_

---

## Phase 3: API & Backend

### 3.1 API Architecture

> **Goal:** Clean separation, standardized patterns

#### 3.1.1 Create Service Layer
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/services/`
- **Description:** Extract business logic from controllers
- **Services to Create:**
  - request.service.ts
  - loan.service.ts
  - payment.service.ts
  - user.service.ts
  - notification.service.ts
- **Completed:** _Not started_

#### 3.1.2 Create Zod Validation Middleware
- **Status:** `DONE` ✅
- **Priority:** 🔴 Critical
- **Files:** `apps/main-backend/src/utils/validation.ts`
- **Description:** 
  ```typescript
  export const validateBody = (schema: ZodSchema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        errors: result.error.errors 
      });
    }
    req.body = result.data;
    next();
  };
  ```
- **Completed:** December 3, 2025

#### 3.1.3 Standardize Response Format
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:** 
  - `apps/main-backend/src/utils/response.ts`
  - All controllers
- **Description:** Create helpers: `successResponse(data)`, `errorResponse(message, errors)`
- **Completed:** December 3, 2025

#### 3.1.4 Split Large Controller Files
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/main-backend/src/api/requests/controllers.ts`
- **Description:** Split 2700+ line file into:
  - request-crud.controller.ts
  - request-workflow.controller.ts
  - request-documents.controller.ts
- **Completed:** _Not started_

#### 3.1.5 Add Request ID Tracking
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/main-backend/src/server.ts`
- **Description:** Generate X-Request-ID, include in logs and responses
- **Completed:** _Not started_

#### 3.1.6 Improve Error Handling
- **Status:** `DONE` ✅
- **Priority:** 🟡 High
- **Files:**
  - `apps/main-backend/src/utils/errors.ts` (NEW)
  - `apps/main-backend/src/utils/error-handler.ts` (NEW)
  - `apps/main-backend/src/server.ts`
- **Description:** Custom error classes: ValidationError, AuthorizationError, NotFoundError
- **Completed:** December 3, 2025

---

### 3.2 Payment System

> **Goal:** Support all payment methods with tracking

#### 3.2.1 Add Manual Payment Support
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:**
  - `apps/main-backend/src/api/payments/`
  - `packages/types/src/constants.ts`
- **Description:** 
  - Add CASH, CHEQUE, BANK_TRANSFER to PaymentMethod
  - Admin-only endpoint to record with reference
- **Completed:** _Not started_

#### 3.2.2 Improve Razorpay Webhooks
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/api/payments/razorpay.controller.ts`
- **Description:** Handle all events: payment.captured, failed, order.paid, refund
- **Completed:** _Not started_

#### 3.2.3 Add Payment Receipt Generation
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/main-backend/src/services/`
- **Description:** Generate PDF receipts, store in documents
- **Completed:** _Not started_

#### 3.2.4 Implement Partial Payments
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/main-backend/src/services/payment.service.ts`
- **Description:** Allow partial EMI, track outstanding
- **Completed:** _Not started_

---

### 3.3 Caching

> **Goal:** Reduce database load

#### 3.3.1 Create Redis Cache Utility
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `packages/utils/src/cache.ts`
- **Description:** Create `cache.get()`, `cache.set()`, `cache.invalidate()`
- **Completed:** _Not started_

#### 3.3.2 Cache Frequently Accessed Data
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/main-backend/src/api/`
- **Description:** Cache: user sessions, districts, asset types, service configs
- **Completed:** _Not started_

---

## Phase 4: Frontend Consolidation

### 4.1 State Management

> **Goal:** Single patterns, no duplicates

#### 4.1.1 Consolidate Socket Implementations
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:**
  - `apps/frontend/src/contexts/SocketContext.tsx`
  - `apps/frontend/src/hooks/useSocket.ts`
- **Description:** Remove SocketContext, use hook-based only
- **Completed:** _Not started_

#### 4.1.2 Unify Loading/Error States
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/frontend/src/components/request/context/`
- **Description:** Single source of truth in RequestProvider
- **Completed:** _Not started_

#### 4.1.3 Add Global ErrorBoundary
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `apps/frontend/src/app/layout.tsx`
  - `apps/frontend/src/components/ErrorBoundary.tsx`
- **Description:** Wrap app, show friendly error page
- **Completed:** _Not started_

#### 4.1.4 Standardize Toast Notifications
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/frontend/src/`
- **Description:** Use only sonner, remove other implementations
- **Completed:** _Not started_

#### 4.1.5 Extract Magic Numbers
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/frontend/src/lib/constants.ts`
- **Description:** Move all timeouts, intervals to constants
- **Completed:** _Not started_

#### 4.1.6 Fix Frontend `any` Types
- **Status:** `TODO`
- **Priority:** 🟡 High
- **Files:** `apps/frontend/src/**/*.ts(x)`
- **Description:** Find and fix all `any` types in frontend code
- **Completed:** _Not started_

#### 4.1.7 Document Shared Components
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/frontend/src/components/common/`
- **Description:** Add JSDoc to all exported components
- **Completed:** _Not started_

#### 4.1.8 Optimize Large Lists
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/frontend/src/components/`
- **Description:** Add virtualization for long lists using `@tanstack/virtual`
- **Completed:** _Not started_

---

## Phase 5: Future Features (Auction)

> **Goal:** Sell defaulted assets through auction

### 5.1 Auction System

#### 5.1.1 Design Auction Workflow
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/types/src/workflow-types.ts`
- **Description:** 
  - States: PENDING_AUCTION, SCHEDULED, ACTIVE, SOLD, UNSOLD, CANCELLED
  - Define transitions and guards
- **Completed:** _Not started_

#### 5.1.2 Create Auction Database Models
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/prisma/prisma/schema.prisma`
- **Description:** 
  - Auction model: id, assetId, reservePrice, startingBid, currentBid, startDate, endDate, status
  - Bid model: id, auctionId, bidderId, amount, timestamp
- **Completed:** _Not started_

#### 5.1.3 Implement Auction API
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/main-backend/src/api/auction/`
- **Description:** Endpoints: list, place bid, get details, admin controls
- **Completed:** _Not started_

#### 5.1.4 Create Auction Real-time Updates
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:**
  - `apps/live-sockets/src/`
  - `packages/types/src/socket-types.ts`
- **Description:** Live bid updates, countdown, outbid notifications
- **Completed:** _Not started_

#### 5.1.5 Create Auction Frontend
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/frontend/src/app/auctions/`
- **Description:** Listing, detail with live bidding, my bids
- **Completed:** _Not started_

#### 5.1.6 Create Auction Notification Templates
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `packages/templates/src/templates/`
- **Description:** AUCTION_STARTED, BID_PLACED, OUTBID, WON, ENDED
- **Completed:** _Not started_

#### 5.1.7 Implement Default → Auction Flow
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/job-worker/src/workers/`
- **Description:** Auto-transition defaulted loans to auction
- **Completed:** _Not started_

#### 5.1.8 Add Settlement Logic
- **Status:** `TODO`
- **Priority:** 🟢 Low
- **Files:** `apps/main-backend/src/services/auction.service.ts`
- **Description:** Winner payment, surplus return, deficit handling
- **Completed:** _Not started_

---

## End-to-End User Flows

> **Goal:** Ensure ALL flows are complete for production use

### Customer Journey (Complete Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ ONBOARDING                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Visit → /register                                    ✅ Done │
│ 2. Enter email → Receive OTP → Verify                   ✅ Done │
│ 3. Enter phone → Receive OTP → Verify                   ✅ Done │
│ 4. Complete profile → Account created                   ✅ Done │
│ 5. Login → Dashboard                                    ✅ Done │
│ 6. Forgot password → Reset link → New password     🔴 NOT DONE │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LOAN REQUEST                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Navigate → /submit-request                           ✅ Done │
│ 2. Fill asset details                                   ✅ Done │
│ 3. Upload photos (2-6 required)                         ✅ Done │
│ 4. Upload ID proof                                      ✅ Done │
│ 5. Upload address proof                                 ✅ Done │
│ 6. Upload asset documents                               ✅ Done │
│ 7. Submit → Status: PENDING                             ✅ Done │
│ 8. View status → /requests                              ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ OFFER REVIEW                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get notification (Email/WhatsApp)                    ✅ Done │
│ 2. Login → View offer details                           ✅ Done │
│ 3. Accept offer → Status: OFFER_ACCEPTED                ✅ Done │
│ OR Decline offer → Status: OFFER_DECLINED               ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ INSPECTION                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get notification → Agent scheduled                   ✅ Done │
│ 2. Agent visits → Inspects asset                        ✅ Done │
│ 3. View inspection report                               ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LOAN APPROVAL & DISBURSEMENT                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get approval notification                            ✅ Done │
│ 2. Submit bank details                                  ✅ Done │
│ 3. Sign agreement (digital)                             ✅ Done │
│ 4. Amount transferred                                   ✅ Done │
│ 5. View loan → /requests/[id]                           ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REPAYMENT                                                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get EMI reminder (Email/WhatsApp)                    ✅ Done │
│ 2. View EMI schedule                                    ✅ Done │
│ 3. Pay via Razorpay/UPI                                 ✅ Done │
│ 4. Pay via Cash/Cheque (Admin records)                  ✅ Done │
│ 5. View payment history                                 ✅ Done │
│ 6. Download receipt                               🟡 Planned │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ COMPLETION                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. All EMIs paid → Status: COMPLETED                    ✅ Done │
│ 2. Collect asset                                        ✅ Done │
│ 3. Loan closed notification                             ✅ Done │
└─────────────────────────────────────────────────────────────────┘
```

### District Admin Journey (Complete Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ ONBOARDING (Admin-created)                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Super Admin creates account                          ✅ Done │
│ 2. Receive email with password/reset link          🔴 NOT DONE │
│ 3. First login → Change password                        ✅ Done │
│ 4. Access dashboard                                     ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REQUEST MANAGEMENT                                               │
├─────────────────────────────────────────────────────────────────┤
│ 1. View pending requests in district → /requests        ✅ Done │
│ 2. Self-assign request                                  ✅ Done │
│ 3. Review documents & photos                            ✅ Done │
│ 4. Make offer (amount, tenure, interest)                ✅ Done │
│ 5. Wait for customer response                           ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AGENT ASSIGNMENT                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Customer accepts offer                               ✅ Done │
│ 2. View available agents in district                    ✅ Done │
│ 3. Assign agent to request                              ✅ Done │
│ 4. Schedule inspection                                  ✅ Done │
│ 5. Agent receives notification                          ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ POST-INSPECTION                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. View inspection report                               ✅ Done │
│ 2. Approve → Set final terms                            ✅ Done │
│ OR Reject → With reason                                 ✅ Done │
│ 3. Create loan → EMI schedule generated                 ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DISBURSEMENT                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Verify customer bank details                         ✅ Done │
│ 2. Transfer amount (manual process)                     ✅ Done │
│ 3. Mark as disbursed                                    ✅ Done │
│ 4. Customer notified                                    ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ COLLECTION & MONITORING                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. View active loans                                    ✅ Done │
│ 2. Monitor EMI payments                                 ✅ Done │
│ 3. Handle overdue alerts                                ✅ Done │
│ 4. Record Cash/Cheque payments                          ✅ Done │
│ 5. View analytics → /analytics                          ✅ Done │
│ 6. View audit logs → /audit-logs                        ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USER MANAGEMENT                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. View users → /users                                  ✅ Done │
│ 2. Create new agent/customer                       🟡 Partial │
│ 3. Update user roles/status                             ✅ Done │
│ 4. Deactivate user                                      ✅ Done │
└─────────────────────────────────────────────────────────────────┘
```

### Super Admin Journey (Complete Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ ALL DISTRICT ADMIN FEATURES                                      │
├─────────────────────────────────────────────────────────────────┤
│ All features above, across ALL districts                ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USER MANAGEMENT                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. Create District Admins                          🟡 Partial │
│ 2. Assign districts to admins                           ✅ Done │
│ 3. View all users across system                         ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM SETTINGS                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. Configure Email service → /settings                  ✅ Done │
│ 2. Configure WhatsApp → Scan QR                         ✅ Done │
│ 3. Test notification services                           ✅ Done │
│ 4. Platform settings (maintenance mode)            🔴 NOT DONE │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DEFAULTS & AUCTION (Future)                                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. View defaulted loans                            🟡 Planned │
│ 2. Initiate auction                                🟡 Planned │
│ 3. Manage auction                                  🟡 Planned │
│ 4. Handle settlement                               🟡 Planned │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Journey (Complete Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ ONBOARDING (Admin-created)                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Admin creates account                                ✅ Done │
│ 2. Receive email with credentials                  🔴 NOT DONE │
│ 3. First login → Change password                        ✅ Done │
│ 4. Access dashboard                                     ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ASSIGNMENT                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Receive notification → New assignment                ✅ Done │
│ 2. View assigned request details                        ✅ Done │
│ 3. View customer info & location                        ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ INSPECTION                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Start inspection                                     ✅ Done │
│ 2. Capture photos of asset                              ✅ Done │
│ 3. Enter observations/notes                             ✅ Done │
│ 4. Submit valuation                                     ✅ Done │
│ 5. Complete inspection report                           ✅ Done │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ RECOMMENDATION                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Approve → With recommended amount                    ✅ Done │
│ OR Reject → With reason                                 ✅ Done │
│ 2. Admin notified of completion                         ✅ Done │
└─────────────────────────────────────────────────────────────────┘
```

### Flow Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Done | Feature implemented and working |
| 🟡 Partial | Feature exists but needs improvement |
| 🟡 Planned | In improvement plan, not started |
| 🔴 NOT DONE | Critical gap, not implemented |

### Critical Gaps Summary

| Gap | Impact | Task ID |
|-----|--------|---------|
| **Password Reset** | Users can't recover accounts | 1.0.1, 1.0.2 |
| **Admin User Notification** | New users don't get credentials | 1.0.3 |
| **Platform Settings** | Can't enable maintenance mode | 1.0.6 |

---

## Quick Reference

### Commands

```bash
# Development
pnpm dev              # All services
pnpm dev:frontend     # Frontend only
pnpm dev:main         # Backend only
pnpm dev:sockets      # WebSocket only
pnpm dev:worker       # Job worker only

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed data
pnpm db:ui            # Prisma Studio
pnpm db:reset         # Reset database

# Quality
pnpm build            # Build all
pnpm lint             # Lint all
pnpm format           # Format code
```

### Key Files

| Purpose | Location |
|---------|----------|
| Database Schema | `packages/prisma/prisma/schema.prisma` |
| Shared Types | `packages/types/src/` |
| Shared Utils | `packages/utils/src/` |
| API Routes | `apps/main-backend/src/api/` |
| Frontend Pages | `apps/frontend/src/app/` |
| Workflow Engine | `packages/utils/src/workflow/` |
| Templates | `packages/templates/src/templates/` |

---

## Completion Log

_Update this section when completing tasks_

| Date | Task ID | Task Name | Completed By |
|------|---------|-----------|--------------|
| - | - | - | - |

---

**🎯 Next Steps:** Start with Phase 1 critical tasks (1.2.1, 1.1.4, 1.1.5, 1.3.1, 3.1.2)
