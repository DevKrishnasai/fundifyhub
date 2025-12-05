---
applyTo: '**'
---

# FundifyHub - AI Coding Assistant Instructions

These are **mandatory guidelines** for anyone (including AI agents) contributing to the fundifyhub monorepo. Follow them exactly — consistency and simplicity are priorities.

---

## 🏗️ Architecture Overview

FundifyHub is a **pawn/loan application** monorepo with a consolidated microservices architecture:

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **Frontend** | 3000 | Next.js 15 - Customer/Admin/Agent dashboards |
| **Main Backend** | 3001 | Express.js - REST API + WebSocket (consolidated) |
| **Job Worker** | - | BullMQ - Background jobs (emails, WhatsApp, cron) |

> **Note:** WebSocket is consolidated into Main Backend for cost-effective free-tier deployments.

### Shared Packages

| Package | Purpose |
|---------|---------|
| `@fundifyhub/types` | TypeScript types, constants, enums, Zod schemas |
| `@fundifyhub/utils` | Shared utilities, env validation, job queue client, workflow engine |
| `@fundifyhub/prisma` | Database schema and Prisma client |
| `@fundifyhub/logger` | Structured logging with service prefixes |
| `@fundifyhub/templates` | Email/WhatsApp message templates (React Email) |
| `@fundifyhub/notifications` | Multi-channel notification service |
| `@fundifyhub/providers` | External service providers (Razorpay, UploadThing, etc.) |

### Infrastructure

- **Database:** PostgreSQL (via Prisma ORM)
- **Cache/Queue:** Redis (BullMQ jobs, sessions, socket scaling)
- **Files:** UploadThing (document storage with signed URLs)
- **Payments:** Razorpay + Manual (Cash/Cheque/Bank Transfer)

---

## 🚀 Development Commands

```bash
# Full Stack Development
pnpm dev              # Start all services (frontend + backend + worker)
pnpm dev:frontend     # Frontend only (Next.js on port 3000)
pnpm dev:main         # Backend only (Express + WebSocket on port 3001)
pnpm dev:worker       # Job worker only (BullMQ processor)

# Database Operations
pnpm db:generate      # Generate Prisma client after schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:seed          # Seed sample data
pnpm db:ui            # Open Prisma Studio
pnpm db:reset         # Reset database (DESTRUCTIVE - dev only)

# Infrastructure
pnpm infra:up         # Start PostgreSQL + Redis containers
pnpm infra:down       # Stop containers
pnpm infra:logs       # View container logs

# Quality Checks
pnpm build            # TypeScript compilation check
pnpm lint             # ESLint check
pnpm format           # Prettier format
```

---

## 📁 Project Structure

```
fundifyhub/
├── apps/
│   ├── frontend/              # Next.js 15 App Router
│   │   ├── src/
│   │   │   ├── app/           # Pages (file-based routing)
│   │   │   ├── components/    # UI components (shadcn/ui based)
│   │   │   ├── contexts/      # React contexts (AuthContext, etc.)
│   │   │   ├── hooks/         # Custom hooks (useSocket, useRequest)
│   │   │   └── lib/           # Utilities, API client, URLs
│   │   └── package.json
│   │
│   ├── main-backend/          # Express.js API + WebSocket
│   │   ├── src/
│   │   │   ├── api/           # Route handlers by domain
│   │   │   │   ├── auth/      # Authentication (login, register, OTP, reset)
│   │   │   │   ├── admin/     # Admin endpoints (users, agents, settings)
│   │   │   │   ├── user/      # User profile, dashboard, requests
│   │   │   │   ├── requests/  # Loan request workflow
│   │   │   │   ├── payments/  # Razorpay + manual payments
│   │   │   │   └── documents/ # File upload/download
│   │   │   ├── socket/        # WebSocket handlers
│   │   │   │   ├── index.ts   # Socket.IO initialization
│   │   │   │   ├── handlers.ts # Event handlers
│   │   │   │   └── middleware.ts # Socket auth
│   │   │   ├── services/      # Business logic layer
│   │   │   ├── utils/         # Helpers, middleware, RBAC
│   │   │   └── server.ts      # Express + Socket.IO setup
│   │   └── package.json
│   │
│   └── job-worker/            # BullMQ background jobs
│       ├── src/
│       │   ├── workers/       # Job processors (notification, emi-reminder)
│       │   └── services/      # External integrations (WhatsApp, Email)
│       └── package.json
│
├── packages/
│   ├── types/                 # Shared TypeScript definitions
│   │   └── src/
│   │       ├── constants.ts   # ALL enums and constants (single source)
│   │       ├── types.ts       # Core interfaces
│   │       ├── auth-schemas.ts # Zod validation schemas
│   │       ├── workflow-types.ts # FSM state definitions
│   │       └── socket-types.ts # Socket event types
│   │
│   ├── utils/                 # Shared utilities
│   │   └── src/
│   │       ├── workflow/      # Workflow engine (FSM)
│   │       │   ├── engine.ts  # Transition logic
│   │       │   ├── config.ts  # State machine config
│   │       │   └── guards.ts  # Permission guards
│   │       ├── env-validation.ts # Zod env schemas
│   │       ├── enqueue.ts     # Job queue client
│   │       └── emi.ts         # EMI calculation utilities
│   │
│   ├── prisma/                # Database
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema (source of truth)
│   │   │   ├── seed.ts        # Seed data
│   │   │   └── migrations/    # Migration history
│   │   └── src/
│   │       └── client.ts      # Prisma client export
│   │
│   ├── templates/             # Email/WhatsApp templates (React Email)
│   ├── notifications/         # Multi-channel notification service
│   └── logger/                # Structured logging
│
├── infra/
│   └── docker-compose.yml     # PostgreSQL + Redis
│
├── .github/
│   └── copilot-instructions.md # This file
│
└── ARCHITECTURE_IMPROVEMENT_PLAN.md # Task tracker
```

---

## ⚠️ CRITICAL CODING RULES

### 1. Zero `any` Types (MANDATORY)

```typescript
// ❌ NEVER DO THIS
const data: any = response.data;
function process(input: any) { }
(error as any).message

// ✅ ALWAYS DO THIS
const data: UserType = response.data;
function process(input: unknown): ProcessedData {
  if (!isValidInput(input)) throw new Error('Invalid input');
  return processValidInput(input);
}

// ✅ Use type guards for unknown
function isUserType(obj: unknown): obj is UserType {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

// ✅ For error handling
if (error instanceof Error) {
  logger.error(error.message);
}
```

### 2. Import from Shared Packages (MANDATORY)

```typescript
// ❌ NEVER duplicate types/constants locally
const ROLES = { ADMIN: 'ADMIN', USER: 'USER' };
interface User { id: string; name: string; }

// ✅ ALWAYS import from shared packages
import { 
  ROLES, 
  REQUEST_STATUS, 
  LOAN_STATUS,
  UserType,
  RequestType 
} from '@fundifyhub/types';

import { prisma } from '@fundifyhub/prisma';
import { logger } from '@fundifyhub/logger';
import { enqueue } from '@fundifyhub/utils';
```

### 3. API Response Format (MANDATORY)

```typescript
// ✅ Standard response structure - ALWAYS use this
interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

// ✅ Controller pattern
export async function getUserController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ 
      where: { id },
      select: { id: true, email: true, firstName: true, roles: true }
    });
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'User retrieved', 
      data: user 
    });
  } catch (error) {
    logger.error('getUserController error:', error as Error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve user' 
    });
  }
}
```

### 4. Zod Validation (MANDATORY for all inputs)

```typescript
// ✅ Define schemas in @fundifyhub/types/src/auth-schemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  roles: z.array(z.enum(['CUSTOMER', 'AGENT', 'DISTRICT_ADMIN', 'SUPER_ADMIN'])),
});

export type CreateUserPayload = z.infer<typeof createUserSchema>;

// ✅ Use validation middleware in routes
import { validateBody } from '../utils/validation';
import { createUserSchema } from '@fundifyhub/types';

router.post('/users', 
  authMiddleware,
  requireRoles([ROLES.SUPER_ADMIN]),
  validateBody(createUserSchema), 
  createUserController
);
```

### 5. Database Operations (MANDATORY patterns)

```typescript
// ✅ Always use Prisma from shared package
import { prisma } from '@fundifyhub/prisma';

// ✅ Use transactions for multi-table operations
const result = await prisma.$transaction(async (tx) => {
  const request = await tx.request.update({ 
    where: { id }, 
    data: { currentStatus: newStatus } 
  });
  
  const loan = await tx.loan.create({ 
    data: { 
      requestId: id,
      approvedAmount,
      tenureMonths,
      interestRate,
      status: LOAN_STATUS.ACTIVE
    } 
  });
  
  // Generate EMI schedule
  await tx.eMISchedule.createMany({
    data: emiScheduleData
  });
  
  return { request, loan };
});

// ✅ Use includes to avoid N+1 queries
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    requests: { 
      include: { loan: true },
      orderBy: { createdAt: 'desc' }
    },
    _count: { select: { requests: true } },
  },
});

// ✅ Use select for partial data (better performance)
const users = await prisma.user.findMany({
  where: { roles: { has: ROLES.CUSTOMER } },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    // Don't select password!
  }
});
```

### 6. Error Handling (MANDATORY)

```typescript
// ✅ Custom error classes in @fundifyhub/utils
export class ValidationError extends Error {
  constructor(
    public errors: Array<{ field: string; message: string }>
  ) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ✅ Proper error handling in controllers
try {
  await processRequest(data);
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: error.errors 
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({ 
      success: false, 
      message: error.message 
    });
  }
  
  if (error instanceof UnauthorizedError) {
    return res.status(403).json({ 
      success: false, 
      message: error.message 
    });
  }
  
  // Log unexpected errors with context
  logger.error('Unexpected error:', { 
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context: { userId: req.user?.id, requestId: req.params.id }
  });
  
  return res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
}
```

### 7. Workflow State Transitions (MANDATORY for status changes)

```typescript
// ✅ ALWAYS use workflow engine for status changes
import { 
  executeTransition, 
  canTransition, 
  getAvailableActions 
} from '@fundifyhub/utils/workflow';
import { REQUEST_STATUS, WORKFLOW_EVENTS } from '@fundifyhub/types';

// Check if transition is allowed BEFORE attempting
const checkResult = canTransition({
  currentStatus: request.currentStatus as REQUEST_STATUS,
  event: WORKFLOW_EVENTS.APPROVE,
  context: { 
    userId: req.user.id, 
    userRoles: req.user.roles,
    requestOwnerId: request.customerId,
    requestDistrict: request.district,
    userDistricts: req.user.districts,
  }
});

if (!checkResult.allowed) {
  return res.status(403).json({ 
    success: false, 
    message: checkResult.reason || 'Transition not allowed'
  });
}

// Execute transition
const newStatus = executeTransition(
  request.currentStatus as REQUEST_STATUS, 
  WORKFLOW_EVENTS.APPROVE
);

// Update database
await prisma.request.update({ 
  where: { id }, 
  data: { currentStatus: newStatus } 
});

// ❌ NEVER do direct status updates without workflow engine
await prisma.request.update({ 
  where: { id }, 
  data: { currentStatus: 'APPROVED' } // BAD!
});
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure

```typescript
interface JWTPayload {
  id: string;           // User ID (UUID)
  email: string;        // User email
  roles: string[];      // ['CUSTOMER'] or ['DISTRICT_ADMIN', 'CUSTOMER']
  districts: string[];  // ['Chennai', 'Coimbatore'] - for district admins
  iat: number;          // Issued at
  exp: number;          // Expiry
}
```

### Role Hierarchy

```
SUPER_ADMIN     → Full system access, all districts
DISTRICT_ADMIN  → District-scoped access, manage requests in their districts
AGENT           → Inspection tasks only, assigned requests
CUSTOMER        → Own data only, submit requests, make payments
```

### Authorization Patterns

```typescript
// ✅ Use RBAC middleware
import { requireRoles, requireAnyRole, hasDistrictAccess } from '../utils/rbac';

// Exact role required
router.get('/admin/settings', 
  authMiddleware,
  requireRoles([ROLES.SUPER_ADMIN]), 
  getSettingsController
);

// Any of these roles
router.get('/admin/requests', 
  authMiddleware,
  requireAnyRole([ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN]), 
  listRequestsController
);

// ✅ District-scoped queries
async function getRequests(req: Request, res: Response) {
  const user = req.user!;
  
  // Build where clause based on role
  let where: Prisma.RequestWhereInput = {};
  
  if (hasRole(user, ROLES.SUPER_ADMIN)) {
    // Super admin sees all
    where = {};
  } else if (hasRole(user, ROLES.DISTRICT_ADMIN)) {
    // District admin sees their districts
    where = { district: { in: user.districts } };
  } else if (hasRole(user, ROLES.AGENT)) {
    // Agent sees only assigned requests
    where = { assignedAgentId: user.id };
  } else {
    // Customer sees only their requests
    where = { customerId: user.id };
  }
  
  const requests = await prisma.request.findMany({ where });
}
```

---

## 📡 WebSocket Events (Consolidated in Main Backend)

### Event Types (Define in @fundifyhub/types/src/socket-types.ts)

```typescript
// Server → Client events
export interface ServerToClientEvents {
  'request:updated': (data: RequestUpdatePayload) => void;
  'request:statusChanged': (data: StatusChangePayload) => void;
  'notification:new': (data: InAppNotification) => void;
  'emi:reminder': (data: EMIReminderPayload) => void;
  'payment:received': (data: PaymentReceivedPayload) => void;
}

// Client → Server events
export interface ClientToServerEvents {
  'join:request': (requestId: string) => void;
  'leave:request': (requestId: string) => void;
  'join:user': (userId: string) => void;
}

// Payload types
export interface RequestUpdatePayload {
  requestId: string;
  status: string;
  updatedAt: string;
  updatedBy?: string;
}
```

### Emitting from Controllers

```typescript
// ✅ Import socket instance getter
import { getIO } from '../socket';

// After database update, emit to relevant rooms
await prisma.request.update({ 
  where: { id }, 
  data: { currentStatus: newStatus } 
});

// Emit to all users viewing this request
const io = getIO();
io.to(`request:${id}`).emit('request:statusChanged', {
  requestId: id,
  status: newStatus,
  updatedAt: new Date().toISOString(),
  updatedBy: req.user.id
});

// Also notify the customer specifically
io.to(`user:${request.customerId}`).emit('notification:new', {
  type: 'STATUS_CHANGE',
  title: 'Request Updated',
  message: `Your request ${request.requestNumber} status changed to ${newStatus}`,
  requestId: id
});
```

---

## 📧 Notifications (Queue-Based)

### Multi-Channel Pattern

```typescript
import { enqueue } from '@fundifyhub/utils';

// ✅ Queue notifications - NEVER send synchronously in request handlers
await enqueue('notification', {
  templateName: 'emiReminder',
  channels: ['email', 'whatsapp', 'inApp'],
  recipient: {
    userId: user.id,
    email: user.email,
    phone: user.phoneNumber,
    name: `${user.firstName} ${user.lastName}`,
  },
  variables: {
    userName: user.firstName,
    emiAmount: formatCurrency(emi.emiAmount),
    dueDate: formatDate(emi.dueDate),
    loanNumber: loan.loanNumber,
    requestNumber: request.requestNumber,
  },
});

// ❌ NEVER do this - blocks the request
await emailService.send(user.email, 'EMI Reminder', htmlBody);
await whatsappService.send(user.phone, message);
```

---

## 🧪 Pre-Commit Checklist

Before marking any task complete, verify:

- [ ] `pnpm build` passes (zero TypeScript errors)
- [ ] `pnpm lint` passes (zero ESLint errors)
- [ ] No `any` types introduced anywhere
- [ ] All new types added to `@fundifyhub/types`
- [ ] API responses follow standard format
- [ ] Database queries use Prisma (no raw SQL)
- [ ] Status changes use workflow engine
- [ ] Notifications are queued, not sent synchronously
- [ ] Sensitive data (passwords, tokens) not logged
- [ ] Error handling is comprehensive
- [ ] Input validation uses Zod schemas

---

---

## 🔧 Engineering Standards & Best Practices

These are additional, mandatory engineering standards to ensure code quality, scalability, maintainability, and auditability across all services (frontend, main-backend, job-worker, and packages).

- **Centralized Types & Constants:** All enums, types, Zod schemas, and constants MUST live in `@fundifyhub/types`. No duplication or local hardcoded constants.
- **No Hardcoding:** Configuration values, feature flags, and secrets MUST come from environment variables validated by `@fundifyhub/utils/env-validation.ts`. Do not embed URLs, credentials, or magic numbers in code.
- **Logging:** Use a single logger factory in `@fundifyhub/logger` that exports a service-scoped logger (e.g., `getLogger('main-backend')`). Each application must:
  - Initialize its logger once (in its `src/server.ts` or app entrypoint) and export it for reuse.
  - Create child loggers per module/request with contextual fields (`requestId`, `userId`, `service`).
  - Write structured JSON logs to stdout and also to a rotating file per application (e.g., `logs/main-backend.log`). Use `pino` + `pino.destination` or an equivalent structured logger.
- **Audit Trail:** All state-changing API endpoints MUST emit audit events persisted to an `audit_logs` table (or dedicated audit store). Audit entries include: `actorId`, `actorRole`, `action`, `resourceType`, `resourceId`, `before`, `after`, `ip`, `userAgent`, `timestamp`.
- **Comments & Docs:** Use JSDoc for public functions and modules. Remove legacy or inaccurate inline comments; replace them with concise JSDoc above the function or a short comment block at the top of the file describing intent.
- **Code Structure & Restructuring:** Prefer small files and single-responsibility modules. When adding new features, prefer adding to shared packages (`@fundifyhub/utils`, `@fundifyhub/types`, `@fundifyhub/logger`) first.
- **Remove Dead Code:** We do not maintain backward compatibility for this migration. Remove old, unused files and exports. If uncertain, create a short migration/cleanup PR with a changelog entry.
- **Performance & Optimizations:**
  - Use cursor-based pagination for large lists.
  - Use `select` and `include` in Prisma to fetch only necessary fields.
  - Add DB indexes for frequently filtered columns (districtId, stateId, requestStatus, createdAt).
  - Cache read-heavy endpoints with Redis where appropriate and add proper invalidation.
  - Batch work into background jobs (BullMQ) — never perform long-running IO in request handlers.
- **WebSocket Scaling:** Use `socket.io-redis` adapter (or `@socket.io/redis-adapter`) and `ioredis` for pub/sub across nodes.
- **Frontend Data Fetching:** Use `@tanstack/react-query` (React Query) for caching, background refetch, pagination, and optimistic updates.
- **Dependencies:** Prefer battle-tested libraries: `pino` (logging), `ioredis`, `bullmq`, `@socket.io/redis-adapter`, `@tanstack/react-query`, `clsx`, `date-fns` or `dayjs`.
- **Security:** Sanitize user input, rate-limit endpoints, validate auth tokens, rotate secrets, and avoid logging PII. Follow OWASP basics for API endpoints.
- **Testing & CI:** All changes must include unit tests and integration tests where applicable. Add job entries to CI to run `pnpm build`, `pnpm lint`, `pnpm test`.
- **Observability:** Add metrics (Prometheus-friendly) for key operations: request latency, job queue lengths, failed jobs, socket connections, and auction/bid activity.

**Recommended Install Commands** (run in the monorepo root):

```powershell
pnpm -w add pino pino-pretty pino-multi-stream ioredis bullmq @socket.io/redis-adapter @tanstack/react-query
```

Add these only when implementing the related feature and update `package.json` in the specific package/app.

---

## 📋 Development Workflow

1. **Before coding:**
   - Check `ARCHITECTURE_IMPROVEMENT_PLAN.md` for current task
   - Review existing patterns in similar features
   - Identify shared code to reuse

2. **During coding:**
   - Follow these guidelines exactly
   - Keep functions small (max ~50 lines)
   - Add JSDoc only for complex public functions

3. **After coding:**
   - Run `pnpm build` and `pnpm lint`
   - Test manually
   - Update task status in `ARCHITECTURE_IMPROVEMENT_PLAN.md`

---

## 📁 File & Folder Naming Conventions (MANDATORY)

### Package Structure Standards

All packages MUST follow this structure:

```
packages/<package-name>/
├── package.json            # Package manifest
├── tsconfig.json           # TS config with references
├── src/                    # Source files ONLY
│   ├── index.ts            # Main barrel export
│   └── <domain>/           # Domain-specific folders
│       ├── index.ts        # Domain barrel export
│       └── <name>.ts       # Implementation files
└── dist/                   # Compiled output (auto-generated)
```

### File Naming Rules

| Type | Convention | Example |
|------|------------|---------|
| **Types/Interfaces** | `<domain>.types.ts` | `payment.types.ts`, `auth.types.ts` |
| **Constants/Enums** | `<domain>.constants.ts` | `request.constants.ts`, `loan.constants.ts` |
| **Schemas (Zod)** | `<domain>.schemas.ts` | `auth.schemas.ts`, `payment.schemas.ts` |
| **Barrel exports** | `index.ts` | Each folder has an `index.ts` |
| **Provider impl** | `<provider-name>.ts` | `razorpay.ts`, `uploadthing.ts` |
| **Services** | `<name>.service.ts` or `<name>-service.ts` | `email.service.ts` |
| **Controllers** | `<name>.controller.ts` or `controllers.ts` | `auth.controller.ts` |

### Folder Naming Rules

- Use **kebab-case** for multi-word folders: `channel-adapters/`, `job-worker/`
- Use **singular** for domain folders: `payment/`, `request/`, `auth/`
- Use **plural** for collection folders: `payments/`, `notifications/`, `providers/`
- Group by domain, not by type: `payments/razorpay.ts` NOT `providers/razorpay-payment.ts`

### Provider Package Structure (`@fundifyhub/providers`)

```
packages/providers/
├── src/
│   ├── index.ts              # Main barrel export
│   ├── payments/             # Payment providers
│   │   ├── index.ts
│   │   ├── razorpay.ts       # RazorpayProvider
│   │   └── manual.ts         # ManualPaymentProvider
│   ├── storage/              # Storage providers
│   │   ├── index.ts
│   │   └── uploadthing.ts    # UploadThingProvider
│   └── notifications/        # Notification channels
│       ├── index.ts
│       ├── email.ts
│       ├── whatsapp.ts
│       └── in-app.ts
└── dist/                     # Compiled (NEVER commit)
```

### Types Package Structure (`@fundifyhub/types`)

```
packages/types/
├── src/
│   ├── index.ts              # Main barrel export
│   ├── constants.ts          # Legacy (being phased out)
│   ├── types.ts              # Legacy core types
│   │
│   ├── auth/                 # Auth domain
│   │   ├── index.ts
│   │   ├── auth.constants.ts
│   │   ├── auth.types.ts
│   │   └── auth.schemas.ts
│   │
│   ├── payment/              # Payment domain
│   │   ├── index.ts
│   │   ├── payment.constants.ts
│   │   └── payment.types.ts
│   │
│   ├── providers/            # Provider interfaces
│   │   ├── index.ts
│   │   ├── payment-provider.types.ts
│   │   └── storage-provider.types.ts
│   │
│   └── <domain>/             # Other domains follow same pattern
└── dist/
```

### Build Output Rules

- **NEVER commit compiled files** (`.js`, `.d.ts`, `.js.map`, `.d.ts.map`)
- All compiled output MUST go to `dist/` folder
- Source files MUST stay in `src/` folder only
- Each package's `tsconfig.json` MUST have:
  ```json
  {
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "src"
    }
  }
  ```

### Import/Export Standards

```typescript
// ✅ CORRECT: Import from package
import { PaymentProviderType, IPaymentProvider } from '@fundifyhub/types';
import { RazorpayProvider } from '@fundifyhub/providers';

// ✅ CORRECT: Barrel exports in index.ts
export * from './payments';
export * from './storage';
export type { RazorpayProviderConfig } from './payments/razorpay';

// ❌ WRONG: Deep imports
import { PaymentProviderType } from '@fundifyhub/types/src/providers/payment-provider.types';
```

---

## 🚫 Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|----------|-------|
| Use `any` type | Use proper types or `unknown` with guards |
| Create local constants | Import from `@fundifyhub/types` |
| Raw SQL queries | Use Prisma client |
| Send notifications sync | Queue with BullMQ via `enqueue()` |
| Skip input validation | Use Zod schemas |
| Log passwords/tokens | Log only non-sensitive context |
| Direct status updates | Use workflow engine |
| Create new patterns | Follow existing structure |
| Skip error handling | Wrap in try/catch with logging |
| Multiple DB queries | Use includes/transactions |

---

## 📚 Quick Reference

| Purpose | Location |
|---------|----------|
| Database Schema | `packages/prisma/prisma/schema.prisma` |
| All Constants/Enums | `packages/types/src/constants.ts` |
| Core Types | `packages/types/src/types.ts` |
| Zod Schemas | `packages/types/src/auth-schemas.ts` |
| Workflow Engine | `packages/utils/src/workflow/` |
| Socket Types | `packages/types/src/socket-types.ts` |
| **Provider Types** | `packages/types/src/providers/` |
| **Provider Impls** | `packages/providers/src/` |
| API Endpoints | `apps/frontend/src/lib/urls.ts` |
| Server Setup | `apps/main-backend/src/server.ts` |
| **TODO Tracker** | `ROADMAP.md` |

---

## 🎯 The Goal

> **Production-quality code that fits seamlessly into the fundifyhub ecosystem.**

When in doubt:
1. Check existing patterns
2. Import from shared packages
3. Follow the structure
4. Keep it simple
