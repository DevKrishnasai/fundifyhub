# Contributing to FundifyHub

This document provides guidelines for coding agents and developers working on this monorepo.

## Monorepo Structure

This is a pnpm workspace monorepo with Turborepo for build orchestration.

```
fundifyhub-2.0/
├── apps/                    # Application packages
│   ├── frontend/           # Next.js 15 frontend application
│   ├── main-backend/       # Express.js main API server
│   ├── live-sockets/       # WebSocket server for real-time features
│   └── job-worker/         # Background job processor (BullMQ, email, WhatsApp)
├── packages/               # Shared libraries
│   ├── types/             # TypeScript types, interfaces, and constants
│   ├── utils/             # Shared utility functions
│   ├── logger/            # Logging utility
│   ├── prisma/            # Database schema and Prisma client
│   └── templates/         # Email and message templates
└── infra/                 # Infrastructure configuration (Docker Compose)
```

## Core Principles

### 1. Package Organization

#### `@fundifyhub/types` - Types & Constants
- **All TypeScript types, interfaces, and enums** must be defined here
- **All constants** (service names, queue names, template names, etc.) must be defined here
- Export everything through `src/index.ts`
- No business logic—only type definitions

**Example:**
```typescript
// packages/types/src/constants.ts
export const SERVICE_NAMES = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp'
} as const;

// packages/types/src/types.ts
export interface UserType {
  id: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
}
```

#### `@fundifyhub/utils` - Reusable Utilities
- **Reusable functions** used by multiple apps/packages
- Business logic that doesn't belong to a specific app
- Examples: queue client factory, validation helpers, environment validators

**When to use:**
- Function is used by 2+ apps or packages
- Logic is domain-agnostic or cross-cutting

**Example:**
```typescript
// packages/utils/src/enqueue.ts
import { Queue } from 'bullmq';
import { QUEUE_NAMES, TEMPLATE_NAMES } from '@fundifyhub/types';

export function createEnqueueClient(connection: { host: string; port: number }) {
  // Implementation
}
```

#### `@fundifyhub/logger` - Logging
- Simple console-based logger with color-coded output
- Used across all apps for consistent logging
- No external dependencies

#### `@fundifyhub/prisma` - Database
- Prisma schema definition (`packages/prisma/prisma/schema.prisma`)
- Generated Prisma client (exported from `src/client.ts`)
- Database migrations
- Seed scripts (`packages/prisma/prisma/seed.ts`)

**Important:** Always run `pnpm db:generate` after schema changes before building other packages. The prisma package build script automatically runs `prisma generate` before compiling TypeScript.

#### `@fundifyhub/templates` - Templates
- Email templates (React Email components)
- WhatsApp message templates
- Template registry with metadata (supported services, defaults)

### 2. Dependency Rules

#### Allowed Dependencies
```
apps/* → packages/*  ✅ (Apps can depend on any package)
packages/utils → packages/types, packages/templates, packages/logger  ✅
packages/prisma → packages/logger, packages/utils  ✅
packages/templates → packages/types  ✅
packages/logger → (no internal dependencies)  ✅
packages/types → (no internal dependencies)  ✅
```

#### Forbidden Dependencies
```
packages/* → apps/*  ❌ (Packages must never depend on apps)
packages/types → packages/utils  ❌ (Types must be dependency-free)
```

### 3. TypeScript Configuration

All packages use TypeScript with project references for fast, incremental builds.

#### Build Commands
- Use `tsc -b --force` in all package build scripts
- This ensures TypeScript project references work correctly and outputs are always generated

#### tsconfig.json Structure
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,      // Required for project references
    "declaration": true,    // Generate .d.ts files
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../types" }  // Reference dependencies
  ]
}
```

### 4. Import Guidelines

#### Use Workspace Protocol
```json
// In package.json
{
  "dependencies": {
    "@fundifyhub/types": "workspace:*",
    "@fundifyhub/utils": "workspace:*"
  }
}
```

#### Import from Package Names
```typescript
// ✅ Correct
import { UserType, SERVICE_NAMES } from '@fundifyhub/types';
import { createEnqueueClient } from '@fundifyhub/utils';
import { logger } from '@fundifyhub/logger';

// ❌ Wrong - Don't use relative paths across packages
import { UserType } from '../../../packages/types/src/types';
```

### 5. Building & Development

#### Commands
```bash
# Development
pnpm dev                    # Run all apps in dev mode
pnpm dev:frontend          # Run only frontend
pnpm dev:main              # Run only main-backend
pnpm dev:sockets           # Run only live-sockets
pnpm dev:worker            # Run only job-worker

# Building
pnpm build                 # Build all packages and apps
pnpm --filter frontend build    # Build specific package

# Database
pnpm db:generate           # Generate Prisma client (run after schema changes)
pnpm db:migrate            # Run migrations
pnpm db:seed               # Seed database
pnpm db:ui                 # Open Prisma Studio

# Cleaning
pnpm clean                 # Clean all build artifacts and node_modules

# Other
pnpm lint                  # Lint all packages
pnpm format                # Format code with Prettier
```

#### Build Order
Turborepo automatically handles build order based on dependencies:
1. `@fundifyhub/types` (no dependencies)
2. `@fundifyhub/logger` (no dependencies)
3. `@fundifyhub/templates` (depends on types)
4. `@fundifyhub/utils` (depends on types, templates)
5. `@fundifyhub/prisma` (depends on logger, utils, generates Prisma client)
6. Apps (depend on various packages)

**Important:** If you encounter `TS6305` errors about missing output files, it means a dependency wasn't built first. Run `pnpm build` to rebuild everything.

### 6. Code Style

#### File Naming
- Use kebab-case for files: `email-service.ts`, `user-menu.tsx`
- Use PascalCase for React components: `UserMenu.tsx`, `ProtectedRoute.tsx`
- Use camelCase for utility functions: `createEnqueueClient.ts`

#### Naming Conventions
```typescript
// Constants - UPPER_SNAKE_CASE
export const QUEUE_NAMES = { ... };
export const SERVICE_NAMES = { ... };

// Types - PascalCase with Type suffix
export interface UserType { ... }
export type TemplatePayloadMapType = { ... };

// Functions - camelCase
export function createEnqueueClient() { ... }

// Components - PascalCase
export function UserMenu() { ... }
```

#### Exports
```typescript
// ✅ Named exports (preferred for tree-shaking)
export function myFunction() { ... }
export const myConstant = ...;

// ✅ Default export for React components and registries
export default UserMenu;
export default TEMPLATE_REGISTRY;
```

### 7. Adding New Features

#### Adding a New Type
1. Define it in `packages/types/src/types.ts`
2. Export it from `packages/types/src/index.ts`
3. Rebuild types: `pnpm --filter @fundifyhub/types build`

#### Adding a New Constant
1. Add to `packages/types/src/constants.ts`
2. Export it from `packages/types/src/index.ts`
3. Rebuild types: `pnpm --filter @fundifyhub/types build`

#### Adding a New Utility Function
1. Create file in `packages/utils/src/`
2. Import required types from `@fundifyhub/types`
3. Export from `packages/utils/src/index.ts`
4. Rebuild: `pnpm --filter @fundifyhub/utils build`

#### Adding a New Template
1. Create template files in `packages/templates/src/templates/<name>/`
2. Define email component (React Email) and/or WhatsApp template
3. Create `index.ts` with template definition
4. Register in `packages/templates/src/index.ts`
5. Add template name to `TEMPLATE_NAMES` in `@fundifyhub/types`

#### Adding Database Changes
1. Modify `packages/prisma/prisma/schema.prisma`
2. Generate migration: `pnpm db:migrate`
3. Generate Prisma client: `pnpm db:generate`
4. Update seed script if needed: `packages/prisma/prisma/seed.ts`

### 8. Environment Variables

All apps share a single `.env` file at the repository root. Common variables:

```bash
# Application
NODE_ENV=development
LOG_LEVEL=info

# Database (main-backend, job-worker, prisma)
DATABASE_URL="postgresql://user:pass@localhost:5432/fundifyhub"
SEED_USER_PASSWORD="Password123!"

# Redis (main-backend, job-worker, live-sockets)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL="redis://localhost:6379"

# JWT (main-backend, frontend)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Backend Services
API_PORT=3001
API_HOST=localhost
FRONTEND_URL="http://localhost:3000"
WS_PORT=3002

# Frontend (Next.js Public Variables)
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3002"
```

Place a `.env` file at the repository root (copy from `.env.example`). Apps use `dotenv` to load environment variables from the root.

### 9. Testing

Currently, the monorepo does not have a formal test setup. When adding tests:

1. Use the same test runner across all packages (recommended: Vitest)
2. Add test scripts to package.json: `"test": "vitest"`
3. Add to turbo.json: `"test": { "cache": false }`
4. Place tests alongside source files: `src/utils.test.ts`

### 10. Common Patterns

#### Queue Job Creation
```typescript
import { createEnqueueClient } from '@fundifyhub/utils';
import { TEMPLATE_NAMES } from '@fundifyhub/types';

const enqueue = createEnqueueClient({ host: 'localhost', port: 6379 });

await enqueue.addAJob(TEMPLATE_NAMES.WELCOME, {
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com'
});
```

#### Logging
```typescript
import { logger } from '@fundifyhub/logger';

logger.info('User created', { userId: user.id });
logger.error('Failed to send email', { error: err.message });
logger.warn('Rate limit approaching', { requests: 90 });
```

#### Database Access
```typescript
import { prisma } from '@fundifyhub/prisma';

const user = await prisma.user.findUnique({ where: { id } });
```

### 11. Error Handling

- Use try-catch blocks for async operations
- Log errors with `logger.error()` before throwing/returning
- Return structured error responses in APIs:
```typescript
return res.status(400).json({ 
  success: false, 
  message: 'Validation failed',
  errors: validationErrors 
});
```

### 12. Commit Guidelines

Follow conventional commits:
```
feat(frontend): add user profile page
fix(job-worker): handle email send failures gracefully
refactor(utils): extract queue creation to separate function
docs(readme): update setup instructions
chore(deps): update dependencies
```

Scope can be: `frontend`, `main-backend`, `live-sockets`, `job-worker`, `types`, `utils`, `logger`, `prisma`, `templates`, `infra`

## Troubleshooting

### Build Failures

**TS6305: Output file has not been built from source file**
- Cause: TypeScript project reference missing output files
- Fix: `pnpm build` (rebuilds everything in correct order)

**Module not found errors**
- Cause: Missing dependency or forgot to build
- Fix: `pnpm install` then `pnpm build`

**Prisma client errors**
- Cause: Prisma client not generated
- Fix: `pnpm db:generate`

### Clean Build

If build issues persist:
```bash
pnpm clean          # Remove all build artifacts
pnpm install        # Reinstall dependencies
pnpm db:generate    # Generate Prisma client
pnpm build          # Full rebuild
```

## Questions?

For questions or clarifications, refer to:
- This document
- Existing code examples in the monorepo
- Package README files (if available)
- Turborepo documentation: https://turbo.build/repo/docs
- pnpm workspaces: https://pnpm.io/workspaces
