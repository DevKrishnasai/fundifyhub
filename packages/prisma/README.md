# @fundifyhub/prisma

Prisma ORM setup and database client for FundifyHub applications. This package provides the database schema, migrations, and a configured Prisma client.

## Features

- 📊 **PostgreSQL** - Full PostgreSQL support
- 🔄 **Migrations** - Version-controlled schema changes
- 🌱 **Seeding** - Sample data for development
- 🎯 **Type-Safe** - Generated TypeScript types
- 🔍 **Studio** - Visual database browser

## Installation

```bash
pnpm add @fundifyhub/prisma
```

## Quick Start

```typescript
import { prisma } from '@fundifyhub/prisma';

// Query users
const users = await prisma.user.findMany({
  where: { role: 'CUSTOMER' },
  include: { requests: true },
});

// Create a request
const request = await prisma.request.create({
  data: {
    requestNumber: 'REQ-2025-001234',
    stage: 'REVIEW',
    subStatus: 'PENDING',
    customerId: 'user_123',
    assetType: 'LAPTOP',
    assetDescription: 'MacBook Pro 16"',
    estimatedValue: 150000,
    requestedAmount: 75000,
    districtId: 'district_123',
  },
});
```

## Database Commands

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Reset database (DESTRUCTIVE - dev only)
pnpm db:reset

# Seed sample data
pnpm db:seed

# Open Prisma Studio
pnpm db:ui
```

## Schema Overview

### Core Models

```prisma
// User account
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phoneNumber   String?   @unique
  password      String
  role          UserRole
  firstName     String
  lastName      String
  isActive      Boolean   @default(true)
  isVerified    Boolean   @default(false)
  
  // Relations
  requests      Request[] @relation("CustomerRequests")
  managedRequests Request[] @relation("AssignedAdmin")
  inspections   Request[] @relation("AssignedAgent")
}

// Loan request
model Request {
  id              String        @id @default(uuid())
  requestNumber   String        @unique
  stage           RequestStage  @default(REVIEW)
  subStatus       String?
  
  // Asset details
  assetType       String
  assetDescription String
  estimatedValue  Float
  requestedAmount Float
  
  // Relations
  customer        User          @relation("CustomerRequests")
  assignedAdmin   User?         @relation("AssignedAdmin")
  assignedAgent   User?         @relation("AssignedAgent")
  loan            Loan?
  documents       Document[]
  offers          Offer[]
}

// Active loan
model Loan {
  id              String      @id @default(uuid())
  loanNumber      String      @unique
  status          LoanStatus  @default(ACTIVE)
  approvedAmount  Float
  interestRate    Float
  tenureMonths    Int
  
  // Relations
  request         Request     @relation
  emiSchedules    EMISchedule[]
  payments        Payment[]
}
```

### Enums

```prisma
enum UserRole {
  CUSTOMER
  AGENT
  DISTRICT_ADMIN
  STATE_ADMIN
  SUPER_ADMIN
}

enum RequestStage {
  DRAFT
  REVIEW
  OFFER
  INSPECTION
  DOCUMENTATION
  DISBURSEMENT
  ACTIVE
  COMPLETED
  REJECTED
  CANCELLED
}

enum LoanStatus {
  ACTIVE
  COMPLETED
  DEFAULTED
}

enum EMIStatus {
  PENDING
  PAID
  OVERDUE
  DEFAULTED
}
```

## Common Patterns

### Include Related Data

```typescript
// Get request with all relations
const request = await prisma.request.findUnique({
  where: { id: 'request_123' },
  include: {
    customer: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    assignedAdmin: true,
    assignedAgent: true,
    loan: {
      include: {
        emiSchedules: {
          orderBy: { dueDate: 'asc' },
        },
      },
    },
    documents: true,
    offers: {
      orderBy: { createdAt: 'desc' },
      take: 1, // Latest offer only
    },
  },
});
```

### Transactions

```typescript
// Create loan and EMI schedule atomically
const result = await prisma.$transaction(async (tx) => {
  const loan = await tx.loan.create({
    data: {
      loanNumber: 'LOAN-2025-001234',
      requestId: 'request_123',
      approvedAmount: 75000,
      interestRate: 12,
      tenureMonths: 12,
      status: 'ACTIVE',
    },
  });

  // Generate EMI schedule
  const emiSchedules = generateEMISchedule({
    principal: 75000,
    annualRate: 12,
    tenureMonths: 12,
    startDate: new Date(),
  });

  await tx.eMISchedule.createMany({
    data: emiSchedules.map((emi, index) => ({
      loanId: loan.id,
      emiNumber: index + 1,
      dueDate: emi.dueDate,
      emiAmount: emi.emiAmount,
      principalAmount: emi.principal,
      interestAmount: emi.interest,
      status: 'PENDING',
    })),
  });

  return loan;
});
```

### Pagination

```typescript
// Paginated request list
const [requests, total] = await prisma.$transaction([
  prisma.request.findMany({
    where: { stage: 'REVIEW' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.request.count({
    where: { stage: 'REVIEW' },
  }),
]);

const totalPages = Math.ceil(total / pageSize);
```

### Aggregations

```typescript
// Dashboard stats
const stats = await prisma.request.groupBy({
  by: ['stage'],
  _count: { id: true },
  where: {
    createdAt: { gte: startOfMonth },
  },
});

// Total loan amount by status
const loanStats = await prisma.loan.aggregate({
  _sum: { approvedAmount: true },
  _count: { id: true },
  where: { status: 'ACTIVE' },
});
```

## Migrations

### Create a Migration

```bash
# After modifying schema.prisma
pnpm db:migrate --name add_new_field
```

### Migration Best Practices

1. **Always review generated SQL** before running in production
2. **Test migrations** on a copy of production data
3. **Backup database** before running migrations
4. **Use transactions** for multi-step migrations

## Seeding

The seed script creates sample data for development:

```bash
pnpm db:seed
```

Default seed data includes:
- 1 Super Admin (admin@fundifyhub.com)
- 2 District Admins
- 3 Agents
- 10 Customers
- 20 Sample Requests
- 5 Active Loans with EMI schedules

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/fundifyhub?schema=public"

# Optional for connection pooling (production)
DIRECT_URL="postgresql://user:password@localhost:5432/fundifyhub?schema=public"
```

## Prisma Studio

Visual database browser for development:

```bash
pnpm db:ui
```

Opens at http://localhost:5555

## License

MIT
