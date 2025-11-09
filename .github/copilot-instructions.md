---
applyTo: '**'
---

# FundifyHub - AI Coding Assistant Instructions

These are **mandatory guidelines** for anyone (including AI agents) contributing to the fundifyhub monorepo. Follow them exactly — consistency and simplicity are priorities.

## Architecture Overview

FundifyHub is a financial services monorepo with microservices architecture:

- **Frontend** (Next.js 15, Port 3000): Customer/admin/agent dashboards with real-time updates  
- **Main Backend** (Express.js, Port 3001): REST API with authentication, loan processing, document management  
- **Live Sockets** (WebSocket, Port 3002): Real-time communication for live dashboard updates  
- **Job Worker** (BullMQ): Background processing for emails, WhatsApp notifications, and service controls

**Shared Packages:**
- `@fundifyhub/types`: Centralized TypeScript types, constants, enums
- `@fundifyhub/utils`: Shared utilities, environment validation, job queuing client
- `@fundifyhub/prisma`: Database schema and client
- `@fundifyhub/logger`: Structured logging with service-specific prefixes
- `@fundifyhub/templates`: Email/WhatsApp message templates

**Infrastructure:** PostgreSQL + Redis, orchestrated with Docker Compose and Turbo.

## Critical Development Workflows

### Starting Development
```bash
# Full stack (all services)
pnpm dev

# Individual services
pnpm dev:frontend  # Next.js dashboard
pnpm dev:main      # Express API
pnpm dev:sockets   # WebSocket server
pnpm dev:worker    # Job processor
````

### Database Operations

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations
pnpm db:seed       # Load sample financial data
pnpm db:ui         # Open Prisma Studio
pnpm db:reset      # Reset database
```

### Infrastructure Management

```bash
pnpm infra:up      # Start PostgreSQL + Redis containers
pnpm infra:down    # Stop containers
pnpm infra:logs    # View container logs
```

## Development Flow

1. **Before starting any task:**

   * Create a clear **TODO list** (your execution plan)
   * Share it for review/approval before coding
2. **After getting feedback:**

   * Adjust the plan if needed
   * Then implement step by step
3. **After implementation:**

   * Double-check your work against the task requirements
   * Verify lint, typecheck, and test results
   * Ensure your code integrates smoothly into the existing structure

## Project-Specific Patterns

### TypeScript & Type Safety

* **Zero `any` types** — every variable/function must be properly typed
* Use shared types from `@fundifyhub/types` for enums, constants, and interfaces
* Environment variables validated with Zod schemas in each service

### Code Organization

* **Shared code belongs in `packages/`** — never duplicate logic
* **Reusables go together:**

  * All constants → in the shared constants file
  * All reusable types → in the shared types file
  * All helpers/utilities → in the utils file
* Constants → `@fundifyhub/types/src/constants.ts`
* Types → `@fundifyhub/types/src/types.ts`
* Utilities → `@fundifyhub/utils/`
* Templates → `@fundifyhub/templates/`

### API Communication

* Frontend uses centralized `BACKEND_API_CONFIG` from `apps/frontend/src/lib/urls.ts`
* Axios client configured for cookies: `apps/frontend/src/lib/api-client.ts`
* All API endpoints prefixed with `/api/v1`

### Authentication & Security

* JWT-based auth with refresh tokens
* Role-based access: CUSTOMER, AGENT, DISTRICT_ADMIN, SUPER_ADMIN
* Cookie-based session management

### File Uploads

* UploadThing integration for secure file storage
* Documents categorized by type: ASSET_PHOTO, ID_PROOF, EMI_RECEIPT, etc.
* Signed URLs for secure access

### Job Queuing

* BullMQ with Redis for background jobs
* Email and WhatsApp notification queues
* Service control jobs for managing external integrations

### Database Schema Patterns

* Complex financial workflow: Request → Loan → EMI Schedule → Payments
* Asset-based lending with inspection workflow
* Multi-role user system with district-based assignments
* Document management with verification workflow

## Key Files to Reference

**Configuration:**

* `packages/types/src/constants.ts` — All enums, status values, options
* `packages/types/src/types.ts` — Core interfaces and type definitions
* `apps/frontend/src/lib/urls.ts` — Centralized API endpoints
* `packages/prisma/prisma/schema.prisma` — Database schema

**Examples:**

* `apps/main-backend/src/server.ts` — Express server setup with validation
* `apps/frontend/src/lib/api-client.ts` — API client pattern
* `packages/utils/src/env-validation.ts` — Environment validation with Zod
* `packages/utils/src/enqueue.ts` — Job queuing client usage

## Research & Web Search

* You **may use web search** to find **latest fixes, security advisories, and package versions** when needed.
* Prefer **official sources** (project docs, release notes, CVEs, vendor blogs).
* If a decision is influenced by web findings, **include key links in the PR description** and note the exact version/date.
* Do **not** change major dependencies or architectures without explicit approval.

## Development Best Practices

### Before Coding

* Fully **understand the codebase** before starting
* Review existing patterns in similar features and **follow the same patterns**
* Check shared packages for reusable code
* Validate environment setup
* Never introduce new patterns or folder structures unless explicitly approved

### Code Quality

* **Strict TypeScript:** absolutely no `any`
* **Clean code only:**

  * No unnecessary comments, logs, or debug code
  * Keep functions small and single-responsibility
  * Write readable and maintainable code — aim for clarity, not cleverness
* **Follow all production-grade best practices** — security, validation, performance, and scalability
* JSDoc for complex functions only
* Single responsibility functions
* Clean imports and consistent naming
* **Double-check everything** before marking a task complete

### Documentation

* **JSDoc:** Add clear JSDoc only where explanation is needed (functions, utilities, complex logic)
* Do **not** generate or create markdown files (`.md`) summarizing your work unless explicitly asked

### Testing & Validation

* Run `pnpm build` to validate TypeScript compilation
* Test database operations with `pnpm db:status`
* Verify API endpoints return expected data structures

### Integration Points

* **Database**: Always use Prisma client from `@fundifyhub/prisma`
* **Queue**: Use enqueue client from `@fundifyhub/utils`
* **Logging**: Use logger from `@fundifyhub/logger`
* **Types**: Import from `@fundifyhub/types`

## Common Pitfalls

* Don’t create new shared code outside `packages/` — reuse existing utilities
* Don’t bypass environment validation — all services require proper env setup
* Don’t use raw database queries — always use Prisma
* Don’t create new API patterns — follow existing REST conventions
* Don’t skip TypeScript types — strict typing is mandatory
* **Do not duplicate existing logic or files** — reuse what’s already available
* Keep imports consistent and clean

## Code Review Expectations

* Your code should be production-grade, properly typed, and easy to read
* Reviewers should find no inconsistencies in naming, structure, or type safety
* Make sure your PRs include meaningful commits and a clear summary
* **Follow the current monorepo structure** strictly

## Simplicity & Execution

* **Don’t overcook.** Keep the solution simple, effective, and aligned with the existing style
* Prioritize working, maintainable code over over-engineering
* Always test your implementation locally before pushing changes

## Loan Processing Workflow

1. **Customer Request**: Asset details, amount requested, district
2. **Admin Review**: Offer terms (amount, tenure, interest rate)
3. **Customer Response**: Accept/reject offer
4. **Agent Assignment**: For physical inspection
5. **Inspection**: Asset verification and valuation
6. **Loan Approval**: Final terms set, EMI schedule generated
7. **Disbursement**: Amount transferred to customer
8. **EMI Collection**: Monthly payments tracked with overdue handling

This workflow drives the complex state management and database relationships throughout the application.

---

✅ **Summary:**

* Understand → Plan (TODOs) → Validate → Code → Double-check → Submit
* Keep it simple, typed, reusable, and consistent
* Follow the existing structure and coding style exactly

> The goal: production-quality code that fits seamlessly into the fundifyhub ecosystem