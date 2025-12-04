# TODO: FundifyHub Platform Improvement Plan

> **Status:** 🟢 Phase 1-6 Complete | Phase 7 Next | React Query Migration Complete  
> **Created:** December 4, 2025  
> **Last Updated:** December 4, 2025  
> **Primary Tracker for ALL platform improvements**  
> **Update this file as tasks progress**

---

## 🔄 HANDOFF SUMMARY (For Next Agent)

### Current State
- **Build Status:** ✅ PASSING (`pnpm build` succeeds)
- **Completed Phases:** 1-6 (Database, Types, Backend, Frontend, Assets, Auctions)
- **Next Phase:** 7 (Platform Hardening)

### Phase 6 Auction System - What Was Done

**Backend (100% complete):**
- `apps/main-backend/src/api/auctions/controllers.ts` - ~1100 lines with all auction logic
- `apps/main-backend/src/api/auctions/routes.ts` - API routes with auth middleware
- Socket.IO events for real-time bid updates

**Frontend (70% complete):**
- `apps/frontend/src/hooks/queries/useAuctions.ts` - All React Query hooks
- `apps/frontend/src/app/auctions/page.tsx` - Auction listing page with stats, filters, tables

**Schema/Types:**
- Added `FORFEITED`, `AUCTIONED` to `AssetStatus` enum (Prisma + constants)
- Added `CANCELLED` to `BidStatus` enum (Prisma + constants)
- Exported `AUCTION_STATUS`, `BID_STATUS` from `@fundifyhub/types`

### What's Left in Phase 6

1. **Auction Detail Page** - `/auctions/[id]/page.tsx` with bid form, asset info, countdown
2. **Socket Integration** - Connect frontend to Socket.IO for live bid updates
3. **Sidebar Navigation** - Add Auctions link to nav (Package or Gavel icon)
4. **My Bids Page** - Show user's bidding history
5. **Admin Create Modal** - UI to create auction from defaulted loan

### Key Patterns to Follow

**API Pattern:**
```typescript
// Use getWithResult, postWithResult, putWithResult - NOT api.get<ApiResponse<>>
const result = await getWithResult<AuctionType[]>(API_URLS.AUCTIONS.LIST);
if (!result.ok) throw new Error(result.error.message);
return result.data;
```

**Toast API:**
```typescript
// Simple string, NOT object with title/description
toast("Success message");
toastError("Error message");
```

**Type Annotations:**
```typescript
// Always add explicit types on .map() and .reduce() callbacks
auctions.map((auction: AuctionListing) => ...)
```

**Import Paths:**
```typescript
// authMiddleware is in utils/jwt, NOT utils/middleware
import { authMiddleware } from '../../utils/jwt';
```

---

## 📋 Executive Summary

This is the **single source of truth** for all FundifyHub platform improvements. It consolidates:

- Geography hierarchy migration (Country → State → District)
- Platform hardening (logging, auditing, observability)
- Code quality improvements (no `any`, centralized types, best practices)
- New features (Asset tracking, Auction system)
- Performance optimizations and scalability
- **Frontend updates** (React Query, new pages, geography selectors)
- **Fresh development** - no migrations, no backward compatibility needed

### ⚠️ Important Constraints

| Constraint | Decision |
|------------|----------|
| **Budget** | Open source & free packages ONLY |
| **Payments** | Razorpay + Manual Cash (abstracted for easy swap) |
| **Notifications** | WhatsApp (whatsapp-web.js) + Email (nodemailer) + In-App Push |
| **Storage** | UploadThing now (abstracted for S3 migration later) |
| **Testing** | SKIP for now - do last |
| **Legacy Code** | ❌ REMOVED - No legacy patterns, no backward compatibility |
| **State Management** | ✅ React Query for ALL server state (data fetching) |

### Phases Overview

| Phase | Priority | Focus Area | Status |
|-------|----------|------------|--------|
| 1 | 🔴 CRITICAL | Database Schema (Fresh) | ✅ Complete |
| 2 | 🔴 CRITICAL | Types & Constants Centralization | ✅ Complete |
| 3 | 🔴 CRITICAL | Backend Services & RBAC | ✅ Complete |
| 4 | 🟡 HIGH | Frontend Updates | ✅ Complete |
| 5 | 🟡 HIGH | Asset & Warehouse Operations | ✅ Complete |
| 6 | 🟢 MEDIUM | Auction System | ✅ Complete |
| 7 | 🟡 HIGH | Platform Hardening | Not Started |
| 8 | 🟡 HIGH | Payment System (Abstracted) | Not Started |
| 9 | 🟡 HIGH | Notification Channels (WhatsApp, Email, Push) | Not Started |
| 10 | 🟡 HIGH | Notification Templates & Frontend | Not Started |
| 11 | 🟡 HIGH | Storage System (Abstracted) | Not Started |
| 12 | 🟡 HIGH | Document Generation (PDFs) | Not Started |
| 13 | 🟡 HIGH | Job Workers & Cron | Not Started |
| 14 | 🟢 MEDIUM | DevOps & Deployment | Not Started |
| 15 | 🟢 MEDIUM | Analytics & Reporting | Not Started |
| 16 | 🔵 LAST | Testing & QA | Not Started |

### Key Decisions (Finalized)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Role Model** | **Multiple `roles[]` array per user** | Users can have multiple roles (e.g., CUSTOMER + AGENT) |
| **Geography** | Country → State → District hierarchy | Proper normalization, scalable |
| **State Admin Access** | Auto-access all districts in assigned states | Cascade permissions |
| **Customer District** | Single `homeDistrictId` FK | Customers belong to one district |
| **Admin/Agent Assignment** | Many-to-many via assignment tables | Flexible multi-district support |
| **Backward Compatibility** | NOT required | Fresh development, no old code |
| **Logging** | Winston with rotating files | Already setup, works well |
| **State Management** | React Query for server state | Caching, optimistic updates |
| **Payments** | Provider-agnostic with Razorpay adapter | Easy to swap providers |
| **Notifications** | Channel-based with adapters | WhatsApp, Email, In-App - extensible |
| **Storage** | Provider-agnostic with UploadThing adapter | Easy S3/other migration |

---

## 🎯 Role Hierarchy (Finalized)

```
SUPER_ADMIN (1 only)
├── Full system access, all countries/states/districts
├── Manages: Countries, States, Districts, Warehouses
├── Assigns: State Admins
└── No assignment table needed (implicit full access)

STATE_ADMIN (multiple per state)
├── Access: All districts within assigned states
├── Manages: District Admins, Agents, Requests in their states
├── Assignment: UserStateAssignment (many-to-many)
└── Auto-inherits access to all districts in their states

DISTRICT_ADMIN (multiple per district)
├── Access: Only assigned districts
├── Manages: Agents, Requests, Payments in their districts
├── Assignment: UserDistrictAssignment (many-to-many)
└── Can be assigned to multiple districts

AGENT (multiple per district)
├── Access: Only assigned districts (inspection tasks)
├── Manages: Assigned inspections, asset pickups/returns
├── Assignment: UserDistrictAssignment (many-to-many)
└── Can be assigned to districts across different states

CUSTOMER
├── Access: Own data only
├── Location: Single homeDistrictId (from registration address)
└── No assignment table (uses FK directly)
```

---

## 📦 Recommended Packages (Free & Open Source Only)

> **Rule:** All packages MUST be free and open source. No paid services.

### Run this to install all packages:

```powershell
# ============================================
# CORE PACKAGES (Run in monorepo root)
# ============================================

# Redis + Socket.IO scaling (already partially installed)
pnpm add -w ioredis @socket.io/redis-adapter

# BullMQ for job queues (already installed)
# bullmq - already there

# Cron scheduling (free)
pnpm add -w croner

# ============================================
# FRONTEND PACKAGES
# ============================================

# React Query for data fetching
pnpm add --filter frontend @tanstack/react-query @tanstack/react-query-devtools

# ============================================
# NOTIFICATION PACKAGES (apps/job-worker)
# ============================================

# WhatsApp - whatsapp-web.js (FREE, open source)
pnpm add --filter job-worker whatsapp-web.js qrcode-terminal

# Email - nodemailer (FREE, already installed)
# nodemailer - already there

# In-App Push - web-push (FREE, open source)
pnpm add -w web-push

# ============================================
# PAYMENT PACKAGES (apps/main-backend)
# ============================================

# Razorpay (FREE SDK, pay-per-transaction)
pnpm add --filter main-backend razorpay

# ============================================
# STORAGE PACKAGES
# ============================================

# UploadThing (FREE tier available) - already configured
# If migrating to S3 later:
# pnpm add -w @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# ============================================
# PDF & DOCUMENT GENERATION (FREE)
# ============================================

# PDFKit (FREE) - already installed
# pdfkit - already there

# PDF manipulation (FREE)
pnpm add -w pdf-lib

# Excel/CSV export (FREE)
pnpm add -w exceljs

# Compression (FREE)
pnpm add -w archiver jszip

# ============================================
# SECURITY & VALIDATION (FREE)
# ============================================

# Rate limiting (FREE)
pnpm add -w express-rate-limit

# Security headers (FREE) - helmet already installed
# helmet - already there

# Input sanitization (FREE)
pnpm add -w xss-clean hpp isomorphic-dompurify

# ============================================
# API DOCUMENTATION (FREE)
# ============================================

pnpm add -w swagger-jsdoc swagger-ui-express
pnpm add -w -D @types/swagger-jsdoc @types/swagger-ui-express

# ============================================
# UTILITIES (FREE)
# ============================================

pnpm add -w date-fns nanoid slugify

# Image processing (FREE)
pnpm add -w sharp

# ============================================
# LOGGING (FREE) - winston already installed
# ============================================
# winston, winston-daily-rotate-file - already there

# ============================================
# METRICS (FREE, for later)
# ============================================
# pnpm add -w prom-client  # Prometheus metrics (add when needed)
```

### Package Summary

| Category | Package | License | Cost |
|----------|---------|---------|------|
| WhatsApp | whatsapp-web.js | MIT | FREE |
| Email | nodemailer | MIT | FREE |
| Push | web-push | MIT | FREE |
| Payments | razorpay | MIT | FREE SDK |
| Storage | uploadthing | MIT | FREE tier |
| PDF | pdfkit, pdf-lib | MIT | FREE |
| Excel | exceljs | MIT | FREE |
| Queue | bullmq | MIT | FREE |
| Cache | ioredis | MIT | FREE |
| Logging | winston | MIT | FREE |

---

## 🗂️ Phase 1: Database Schema Migration

> **Priority:** 🔴 CRITICAL  
> **Goal:** Proper relational geography model with assignments

### 1.1 Geography Models

- [ ] **1.1.1** Add `Country` model
  ```prisma
  model Country {
    id        String   @id @default(uuid())
    name      String   @unique  // "India"
    code      String   @unique  // "IN"
    isActive  Boolean  @default(true)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    states    State[]
  }
  ```

- [ ] **1.1.2** Add `State` model
  ```prisma
  model State {
    id          String   @id @default(uuid())
    name        String   // "Tamil Nadu"
    code        String   // "TN"
    countryId   String
    isActive    Boolean  @default(true)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    country     Country  @relation(fields: [countryId], references: [id])
    districts   District[]
    stateAdmins UserStateAssignment[]
    @@unique([countryId, code])
    @@unique([countryId, name])
  }
  ```

- [ ] **1.1.3** Add `District` model
  ```prisma
  model District {
    id              String   @id @default(uuid())
    name            String   // "Chennai"
    code            String   // "CHN"
    stateId         String
    isActive        Boolean  @default(true)
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
    state           State    @relation(fields: [stateId], references: [id])
    warehouses      Warehouse[]
    districtAdmins  UserDistrictAssignment[]
    customers       User[]   @relation("CustomerHomeDistrict")
    requests        Request[]
    @@unique([stateId, code])
    @@unique([stateId, name])
  }
  ```

- [ ] **1.1.4** Add `Warehouse` model (with geolocation for operational efficiency)
  ```prisma
  model Warehouse {
    id          String   @id @default(uuid())
    name        String   // "Chennai Central Warehouse"
    code        String   @unique // "WH-CHN-01"
    districtId  String
    address     String?
    // Geolocation for distance calculations, route optimization
    latitude    Float?   
    longitude   Float?
    capacity    Int?     // Max items
    isActive    Boolean  @default(true)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    district    District @relation(fields: [districtId], references: [id])
    assets      Asset[]
  }
  ```

### 1.2 Assignment Models

- [ ] **1.2.1** Add `UserStateAssignment` model (for STATE_ADMIN)
  ```prisma
  model UserStateAssignment {
    id         String   @id @default(uuid())
    userId     String
    stateId    String
    assignedAt DateTime @default(now())
    assignedBy String   // Who assigned this
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    state      State    @relation(fields: [stateId], references: [id], onDelete: Cascade)
    @@unique([userId, stateId])
  }
  ```

- [ ] **1.2.2** Add `UserDistrictAssignment` model (for DISTRICT_ADMIN, AGENT)
  ```prisma
  model UserDistrictAssignment {
    id         String   @id @default(uuid())
    userId     String
    districtId String
    assignedAt DateTime @default(now())
    assignedBy String   // Who assigned this
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    district   District @relation(fields: [districtId], references: [id], onDelete: Cascade)
    @@unique([userId, districtId])
  }
  ```

### 1.3 User Model Updates

- [ ] **1.3.1** Change `roles: String[]` to single `role: UserRole` enum
  ```prisma
  enum UserRole {
    SUPER_ADMIN
    STATE_ADMIN
    DISTRICT_ADMIN
    AGENT
    CUSTOMER
  }
  ```

- [ ] **1.3.2** Add `homeDistrictId` for customers
- [ ] **1.3.3** Add `accountStatus` enum
  ```prisma
  enum AccountStatus {
    PENDING_VERIFICATION
    ACTIVE
    SUSPENDED
    DEACTIVATED
  }
  ```

- [ ] **1.3.4** Add relations to assignment tables
- [ ] **1.3.5** Remove old `district: String[]` field after migration

### 1.4 Asset & Auction Models

- [ ] **1.4.1** Add `Asset` model with tracking fields
  ```prisma
  enum AssetStatus {
    IN_CUSTODY       // With customer (pledged but not collected)
    IN_TRANSIT       // Being moved between locations
    IN_WAREHOUSE     // Stored in warehouse
    UNDER_AUCTION    // Listed for auction
    SOLD             // Auctioned and sold
    RETURNED         // Returned to customer (loan repaid)
    LOST             // Lost/damaged
  }

  model Asset {
    id              String      @id @default(uuid())
    assetNumber     String      @unique // "AST-2024-00001"
    requestId       String
    loanId          String?
    itemCategory    String
    itemDescription String
    itemWeight      Float?
    purity          String?     // For gold: "22K", "24K"
    estimatedValue  Float
    approvedValue   Float?
    // Depreciation tracking for accurate auction pricing
    depreciationRate Float?     // Annual depreciation % (e.g., 10.0 = 10%)
    lastValuationDate DateTime? // When last valued
    currentMarketValue Float?   // Depreciated value for auctions
    condition       AssetCondition @default(GOOD)
    status          AssetStatus @default(IN_CUSTODY)
    currentWarehouseId String?
    collectedAt     DateTime?
    collectedBy     String?     // Agent who collected
    createdAt       DateTime    @default(now())
    updatedAt       DateTime    @updatedAt
    request         Request     @relation(fields: [requestId], references: [id])
    loan            Loan?       @relation(fields: [loanId], references: [id])
    warehouse       Warehouse?  @relation(fields: [currentWarehouseId], references: [id])
    movements       AssetMovement[]
    auction         AuctionListing?
  }
  
  enum AssetCondition {
    EXCELLENT
    GOOD
    FAIR
    POOR
    DAMAGED
  }
  ```

- [ ] **1.4.2** Add `AssetMovement` model for chain-of-custody
  ```prisma
  model AssetMovement {
    id              String      @id @default(uuid())
    assetId         String
    fromStatus      AssetStatus
    toStatus        AssetStatus
    fromWarehouseId String?
    toWarehouseId   String?
    movedBy         String      // User who initiated movement
    movedAt         DateTime    @default(now())
    notes           String?
    expectedArrival DateTime?
    actualArrival   DateTime?
    asset           Asset       @relation(fields: [assetId], references: [id])
  }
  ```

- [ ] **1.4.3** Add `AuctionListing` model
  ```prisma
  enum AuctionStatus {
    DRAFT            // Being prepared
    SCHEDULED        // Approved, waiting for start
    ACTIVE           // Open for bidding
    ENDED            // Bidding closed, processing winner
    SOLD             // Winner confirmed, payment received
    CANCELLED        // Auction cancelled
    NO_BIDS          // Ended with no bids
  }

  model AuctionListing {
    id              String        @id @default(uuid())
    auctionNumber   String        @unique // "AUC-2024-00001"
    assetId         String        @unique
    loanId          String
    title           String
    description     String?
    reservePrice    Float         // Minimum acceptable price
    startingBid     Float
    currentBid      Float?
    bidIncrement    Float         @default(100)
    startTime       DateTime
    endTime         DateTime
    status          AuctionStatus @default(DRAFT)
    winnerId        String?
    winningBid      Float?
    createdBy       String
    createdAt       DateTime      @default(now())
    updatedAt       DateTime      @updatedAt
    asset           Asset         @relation(fields: [assetId], references: [id])
    loan            Loan          @relation(fields: [loanId], references: [id])
    winner          User?         @relation("AuctionWinner", fields: [winnerId], references: [id])
    bids            AuctionBid[]
  }
  ```

- [ ] **1.4.4** Add `AuctionBid` model
  ```prisma
  model AuctionBid {
    id          String         @id @default(uuid())
    auctionId   String
    bidderId    String
    amount      Float
    bidTime     DateTime       @default(now())
    isWinning   Boolean        @default(false)
    auction     AuctionListing @relation(fields: [auctionId], references: [id])
    bidder      User           @relation(fields: [bidderId], references: [id])
    @@index([auctionId, amount])
  }
  ```

### 1.5 Request Model Update

- [ ] **1.5.1** Replace `district: String` with `districtId: String` FK
- [ ] **1.5.2** Add `assets: Asset[]` relation
- [ ] **1.5.3** Add `previousStatus` field (CRITICAL for workflow validation)
  ```prisma
  model Request {
    // ... existing fields
    currentStatus   RequestStatus
    previousStatus  RequestStatus?  // Track last status for rollback/audit
    statusChangedAt DateTime?       // When status last changed
    statusChangedBy String?         // Who changed status (userId)
  }
  ```

### 1.6 Soft Delete Pattern (Safety Net)

> **Why:** Never permanently delete data - always soft delete for audit trail and recovery

- [ ] **1.6.1** Add soft delete fields to critical models
  ```prisma
  // Add to User, Request, Loan, Asset, Payment models
  deletedAt   DateTime?  // Null = active, set = soft deleted
  deletedBy   String?    // Who deleted it
  ```

- [ ] **1.6.2** Create Prisma middleware for automatic filtering
  ```typescript
  // packages/prisma/src/middleware/soft-delete.ts
  prisma.$use(async (params, next) => {
    // Automatically filter out soft-deleted records
    if (params.action === 'findMany' || params.action === 'findFirst') {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }
    
    // Convert delete to soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }
    
    return next(params);
  });
  ```

- [ ] **1.6.3** Add `includeDeleted` option for admin queries
- [ ] **1.6.4** Add restore functionality for accidentally deleted records

### 1.7 Migration Execution

- [ ] **1.7.1** Create Prisma migration
- [ ] **1.7.2** Test migration locally
- [ ] **1.7.3** Seed geography data (Countries, States, Districts)
- [ ] **1.7.4** Verify all relations work correctly

---

## 🗂️ Phase 2: Types & Constants Centralization

> **Priority:** 🔴 CRITICAL  
> **Goal:** Single source of truth for all types, zero `any`

### 2.1 New Types

- [ ] **2.1.1** Add geography types (Country, State, District, Warehouse)
- [ ] **2.1.2** Add `UserRole` enum to replace `ROLES` object
- [ ] **2.1.3** Add `AccountStatus` enum
- [ ] **2.1.4** Add `AssetStatus`, `AuctionStatus` enums
- [ ] **2.1.5** Add assignment types (UserStateAssignment, UserDistrictAssignment)

### 2.2 Zod Schemas

- [ ] **2.2.1** Add schemas for geography CRUD
- [ ] **2.2.2** Add schemas for assignment operations
- [ ] **2.2.3** Add schemas for asset operations
- [ ] **2.2.4** Add schemas for auction operations

### 2.3 Constants Cleanup

- [ ] **2.3.1** Move all constants to domain folders in `packages/types/src/`
- [ ] **2.3.2** Remove duplicate constants from applications
- [ ] **2.3.3** Update all imports to use shared packages
- [ ] **2.3.4** Delete unused constants

### 2.4 Type Safety

- [ ] **2.4.1** Eliminate remaining `any` types in backend (currently ~17)
- [ ] **2.4.2** Eliminate `any` types in frontend
- [ ] **2.4.3** Add type guards for all `unknown` usages
- [ ] **2.4.4** Enable strict TypeScript checks

---

## 🗂️ Phase 3: Backend Services & RBAC

> **Priority:** 🔴 CRITICAL  
> **Goal:** Proper authorization with geography filtering

### 3.1 Authorization Helpers

Location: `apps/main-backend/src/utils/rbac/`

- [ ] **3.1.1** Create `getUserAccessibleDistrictIds(user)` function
  ```typescript
  export async function getUserAccessibleDistrictIds(user: AuthUser): Promise<string[]> {
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        const allDistricts = await prisma.district.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        return allDistricts.map(d => d.id);

      case UserRole.STATE_ADMIN:
        const stateAssignments = await prisma.userStateAssignment.findMany({
          where: { userId: user.id },
          include: { 
            state: { 
              include: { districts: { where: { isActive: true }, select: { id: true } } } 
            } 
          }
        });
        return stateAssignments.flatMap(sa => sa.state.districts.map(d => d.id));

      case UserRole.DISTRICT_ADMIN:
      case UserRole.AGENT:
        const districtAssignments = await prisma.userDistrictAssignment.findMany({
          where: { userId: user.id },
          select: { districtId: true }
        });
        return districtAssignments.map(da => da.districtId);

      case UserRole.CUSTOMER:
        return user.homeDistrictId ? [user.homeDistrictId] : [];

      default:
        return [];
    }
  }
  ```

- [ ] **3.1.2** Create `hasDistrictAccess(user, districtId)` function
- [ ] **3.1.3** Create `hasStateAccess(user, stateId)` function
- [ ] **3.1.4** Create `buildGeographyFilter(user)` for Prisma queries
- [ ] **3.1.5** Update RBAC middleware for new role model (single `role` instead of `roles[]`)
- [ ] **3.1.6** Update `requireRoles` middleware to work with single role
- [ ] **3.1.7** Remove `hasRole` checks for array-based roles

### 3.2 Geography Service

Location: `apps/main-backend/src/api/geography/`

- [ ] **3.2.1** Create `geographyService` with CRUD for Country/State/District/Warehouse
- [ ] **3.2.2** Create routes file with proper RBAC
- [ ] **3.2.3** Create controllers for each entity
- [ ] **3.2.4** Add validation schemas in `@fundifyhub/types`

### 3.3 Assignment Service

Location: `apps/main-backend/src/api/assignments/`

- [ ] **3.3.1** Create state assignment endpoints
  - `POST /assignments/users/:userId/states` - Assign state
  - `DELETE /assignments/users/:userId/states/:stateId` - Remove assignment
  - `GET /assignments/states/:stateId/admins` - List state admins
- [ ] **3.3.2** Create district assignment endpoints
  - `POST /assignments/users/:userId/districts` - Assign district
  - `DELETE /assignments/users/:userId/districts/:districtId` - Remove assignment
  - `GET /assignments/districts/:districtId/admins` - List district admins/agents
- [ ] **3.3.3** Create `GET /assignments/users/:userId` - Get user's all assignments

### 3.4 Controller Updates (Existing Code Migration)

- [ ] **3.4.1** Update `apps/main-backend/src/api/auth/controllers.ts`
  - Change `roles: string[]` to single `role: UserRole`
  - Update JWT payload structure
  - Update registration to set `homeDistrictId`
- [ ] **3.4.2** Update `apps/main-backend/src/api/admin/controllers.ts`
  - Replace string district filters with FK-based queries
  - Use `getUserAccessibleDistrictIds()` for filtering
- [ ] **3.4.3** Update `apps/main-backend/src/api/requests/controllers.ts`
  - Replace `district: string` with `districtId` FK
  - Update request creation to use new geography
  - Filter requests by accessible districts
- [ ] **3.4.4** Update `apps/main-backend/src/api/user/controllers.ts`
  - Return single `role` instead of `roles[]`
  - Include geography info in profile
- [ ] **3.4.5** Update `apps/main-backend/src/api/admin/users/controllers.ts`
  - Support new role assignment (single role)
  - Add state/district assignment integration

### 3.5 Asset Service

Location: `apps/main-backend/src/api/assets/`

- [ ] **3.5.1** Create Asset CRUD endpoints
- [ ] **3.5.2** Create Asset status workflow using workflow engine
- [ ] **3.5.3** Create movement/transfer endpoints
- [ ] **3.5.4** Create warehouse inventory endpoints

### 3.6 Auction Service

Location: `apps/main-backend/src/api/auctions/`

- [ ] **3.6.1** Create auction listing endpoints
- [ ] **3.6.2** Create bidding endpoints with validation
- [ ] **3.6.3** Create auction lifecycle management
- [ ] **3.6.4** Add Socket.IO events for real-time bids

### 3.7 Audit System

- [ ] **3.7.1** Create `AuditLog` table schema (if not exists)
  ```prisma
  model AuditLog {
    id           String   @id @default(uuid())
    actorId      String
    actorRole    String
    action       String
    resourceType String
    resourceId   String
    before       Json?
    after        Json?
    ip           String?
    userAgent    String?
    timestamp    DateTime @default(now())
    @@index([resourceType, resourceId])
    @@index([actorId])
    @@index([timestamp])
  }
  ```
- [ ] **3.7.2** Create audit middleware for write operations
- [ ] **3.7.3** Add retention policy for old audit logs

### 3.8 Database Indexes

- [ ] **3.8.1** Add index on `Request.districtId`
- [ ] **3.8.2** Add index on `User.homeDistrictId`
- [ ] **3.8.3** Add composite indexes for common query patterns
- [ ] **3.8.4** Analyze slow queries and add indexes

---

## 🗂️ Phase 4: Frontend Updates

> **Priority:** 🟡 HIGH  
> **Goal:** Admin UIs for geography, React Query integration, new feature pages

### 4.1 React Query Setup (Foundation)

- [x] **4.1.1** Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
- [x] **4.1.2** Create `QueryClientProvider` wrapper in layout
- [x] **4.1.3** Create `src/hooks/queries/` folder for query hooks
- [x] **4.1.4** Created comprehensive React Query hooks:
  - `useRequests.ts` - Requests, UserRequests, AssignedRequests, RequestDetail
  - `useUsers.ts` - Users CRUD, user mutations
  - `useDashboard.ts` - Dashboard stats for all roles
  - `useNotifications.ts` - Notifications with mutations
  - `useAuditLogs.ts` - Audit logs with filtering
  - `useAnalytics.ts` - Analytics data
  - `useAssets.ts` - Assets with movements
  - `useGeography.ts` - Countries, States, Districts, Warehouses
- [x] **4.1.5** Migrated pages to React Query:
  - `/requests/page.tsx` ✅
  - `/dashboard/page.tsx` ✅
  - `/users/page.tsx` ✅
- [x] **4.1.6** Deleted legacy hooks:
  - `useDashboardStats.ts` ❌ DELETED
- [x] **4.1.7** Created `useDebounce.ts` hook for search inputs
- [x] **4.1.8** Add global error handler for API failures

### 4.2 API URL Updates (`src/lib/urls.ts`)

- [ ] **4.2.1** Add Geography endpoints
  ```typescript
  GEOGRAPHY: {
    COUNTRIES: '/api/v1/geography/countries',
    COUNTRY_BY_ID: (id: string) => `/api/v1/geography/countries/${id}`,
    STATES: '/api/v1/geography/states',
    STATE_BY_ID: (id: string) => `/api/v1/geography/states/${id}`,
    STATES_BY_COUNTRY: (countryId: string) => `/api/v1/geography/countries/${countryId}/states`,
    DISTRICTS: '/api/v1/geography/districts',
    DISTRICT_BY_ID: (id: string) => `/api/v1/geography/districts/${id}`,
    DISTRICTS_BY_STATE: (stateId: string) => `/api/v1/geography/states/${stateId}/districts`,
    WAREHOUSES: '/api/v1/geography/warehouses',
    WAREHOUSE_BY_ID: (id: string) => `/api/v1/geography/warehouses/${id}`,
    WAREHOUSES_BY_DISTRICT: (districtId: string) => `/api/v1/geography/districts/${districtId}/warehouses`,
  },
  ```
- [ ] **4.2.2** Add Assignment endpoints
  ```typescript
  ASSIGNMENTS: {
    STATE_ADMINS: '/api/v1/assignments/state-admins',
    ASSIGN_STATE: (userId: string) => `/api/v1/assignments/users/${userId}/states`,
    DISTRICT_ADMINS: '/api/v1/assignments/district-admins',
    ASSIGN_DISTRICT: (userId: string) => `/api/v1/assignments/users/${userId}/districts`,
    USER_ASSIGNMENTS: (userId: string) => `/api/v1/assignments/users/${userId}`,
  },
  ```
- [ ] **4.2.3** Add Asset endpoints
  ```typescript
  ASSETS: {
    LIST: '/api/v1/assets',
    GET_BY_ID: (id: string) => `/api/v1/assets/${id}`,
    BY_REQUEST: (requestId: string) => `/api/v1/requests/${requestId}/assets`,
    MOVEMENTS: (assetId: string) => `/api/v1/assets/${assetId}/movements`,
    TRANSFER: (assetId: string) => `/api/v1/assets/${assetId}/transfer`,
  },
  ```
- [ ] **4.2.4** Add Auction endpoints
  ```typescript
  AUCTIONS: {
    LIST: '/api/v1/auctions',
    GET_BY_ID: (id: string) => `/api/v1/auctions/${id}`,
    CREATE: '/api/v1/auctions',
    PLACE_BID: (auctionId: string) => `/api/v1/auctions/${auctionId}/bids`,
    MY_BIDS: '/api/v1/auctions/my-bids',
    MY_WINS: '/api/v1/auctions/my-wins',
  },
  ```

### 4.3 Geography Admin Pages (Super Admin Only)

Location: `apps/frontend/src/app/admin/geography/`

- [ ] **4.3.1** Country management page (`countries/page.tsx`)
  - List all countries with search/filter
  - Add/Edit/Deactivate country
  - View states in country
- [ ] **4.3.2** State management page (`states/page.tsx`)
  - Filter by country
  - Add/Edit/Deactivate state
  - View districts in state
  - Assign State Admins button
- [ ] **4.3.3** District management page (`districts/page.tsx`)
  - Filter by country → state
  - Add/Edit/Deactivate district
  - View warehouses in district
  - Assign District Admins/Agents buttons
- [ ] **4.3.4** Warehouse management page (`warehouses/page.tsx`)
  - Filter by district
  - Add/Edit warehouse
  - View current inventory count
  - Capacity management

### 4.4 Assignment UIs

Location: `apps/frontend/src/app/admin/assignments/`

- [ ] **4.4.1** State Admin assignment page
  - Select user (search by email/name)
  - Select states to assign
  - Show current assignments
  - Remove assignment
- [ ] **4.4.2** District Admin assignment page
  - Select user
  - Select districts (filter by state)
  - Show current assignments
- [ ] **4.4.3** Agent assignment page
  - Select agent user
  - Select districts
  - Show inspection capacity
- [ ] **4.4.4** Update User Profile in Settings (`settings/page.tsx`)
  - Show assigned states (for STATE_ADMIN)
  - Show assigned districts (for DISTRICT_ADMIN, AGENT)
  - Show home district (for CUSTOMER)

### 4.5 Registration Flow Updates

Location: `apps/frontend/src/app/register/`

- [ ] **4.5.1** Add cascading geography selectors
  ```tsx
  // Components needed
  <CountrySelect value={countryId} onChange={setCountryId} />
  <StateSelect countryId={countryId} value={stateId} onChange={setStateId} />
  <DistrictSelect stateId={stateId} value={districtId} onChange={setDistrictId} />
  ```
- [ ] **4.5.2** Update registration schema to include `homeDistrictId`
- [ ] **4.5.3** Pre-populate country (default: India)
- [ ] **4.5.4** Update AuthContext to use new user model (single `role`)

### 4.6 Submit Request Flow Updates

Location: `apps/frontend/src/app/submit-request/`

- [ ] **4.6.1** Replace free-text district with geography selector
- [ ] **4.6.2** Auto-fill based on user's `homeDistrictId`
- [ ] **4.6.3** Update form schema

### 4.7 Asset Management Pages

Location: `apps/frontend/src/app/assets/`

- [ ] **4.7.1** Asset list page (filterable by status, district, warehouse)
- [ ] **4.7.2** Asset detail page
  - Current location
  - Movement history timeline
  - Associated loan/request info
- [ ] **4.7.3** Asset transfer modal
  - Select destination warehouse
  - Add notes
  - Expected arrival date
- [ ] **4.7.4** Warehouse inventory dashboard

### 4.8 Auction Pages

Location: `apps/frontend/src/app/auctions/`

- [ ] **4.8.1** Public auction listing page
  - Active auctions with search/filter
  - Grid/List view toggle
  - Real-time bid updates
- [ ] **4.8.2** Auction detail page
  - Asset photos/details
  - Current bid + bid history
  - Place bid form
  - Countdown timer
  - Real-time updates via Socket
- [ ] **4.8.3** My Bids page (for logged-in users)
  - Active bids
  - Won auctions
  - Lost auctions
- [ ] **4.8.4** Admin auction management
  - Create auction from defaulted loan
  - Approve/Schedule auctions
  - Cancel auction
  - Mark as sold

### 4.9 Dashboard Updates

- [ ] **4.9.1** Super Admin dashboard
  - Country/State/District counts
  - Users by role breakdown
  - System-wide loan stats
- [ ] **4.9.2** State Admin dashboard
  - Filter stats by assigned states
  - Districts overview in their states
- [ ] **4.9.3** District Admin dashboard
  - Filter stats by assigned districts
  - Warehouse inventory summary
- [ ] **4.9.4** Customer dashboard
  - Show home district info
  - Active auctions preview

### 4.10 New Query Hooks

Location: `apps/frontend/src/hooks/queries/`

- [x] **4.10.1** `useCountries`, `useStates`, `useDistricts`, `useWarehouses` ✅ (useGeography.ts)
- [x] **4.10.2** `useUserAssignments` ✅ (useGeography.ts)
- [x] **4.10.3** `useAssets`, `useAssetMovements` ✅ (useAssets.ts)
- [ ] **4.10.4** `useAuctions`, `useAuctionBids` (Phase 6 - Auction System)
- [x] **4.10.5** `useGeographyDropdowns` (cascading selects helper) ✅ (useGeography.ts)

### 4.11 Socket Events for Real-time

Location: `apps/frontend/src/contexts/SocketContext.tsx`

- [ ] **4.11.1** Add auction socket events
  ```typescript
  // New events to handle
  'auction:bid' - New bid placed
  'auction:ended' - Auction ended
  'auction:won' - User won auction
  'auction:outbid' - User was outbid
  ```
- [ ] **4.11.2** Add asset movement events
- [ ] **4.11.3** Update `@fundifyhub/types/socket-types.ts` with new events

### 4.12 UI Components

Location: `apps/frontend/src/components/`

- [ ] **4.12.1** `GeographySelector` - Cascading country/state/district dropdowns
- [ ] **4.12.2** `WarehouseSelector` - Select warehouse with capacity info
- [ ] **4.12.3** `AssetCard` - Display asset info with status badge
- [ ] **4.12.4** `AuctionCard` - Display auction with timer, current bid
- [ ] **4.12.5** `BidHistory` - Scrollable bid list with timestamps
- [ ] **4.12.6** `MovementTimeline` - Asset chain-of-custody visualization
- [ ] **4.12.7** `RoleBadge` - Display user role with appropriate styling

### 4.13 Navigation Updates

Location: `apps/frontend/src/components/layout/`

- [ ] **4.13.1** Add sidebar links for new sections (based on role)
  - Geography (Super Admin only)
  - Assets (Admin roles)
  - Warehouses (Admin roles)
  - Auctions (all users, different views)
- [ ] **4.13.2** Update breadcrumbs for new routes
- [ ] **4.13.3** Mobile navigation updates

### 4.14 UX Improvements

- [ ] **4.14.1** Add loading skeletons for all new pages
- [ ] **4.14.2** Add error boundaries per section
- [ ] **4.14.3** Implement lazy loading for heavy components
- [ ] **4.14.4** Add server-side filters for large lists
- [ ] **4.14.5** Add toast notifications for async operations
- [ ] **4.14.6** Add confirmation dialogs for destructive actions

### 4.15 React Query Standardization (COMPLETED ✅)

> **Status:** ✅ Complete - All legacy data fetching patterns removed

**Completed Tasks:**
- [x] Created 8 React Query hook files in `hooks/queries/`
- [x] Migrated `/requests/page.tsx` to use `useRequests`, `useUserRequests`, `useAssignedRequests`
- [x] Migrated `/dashboard/page.tsx` to use `useUserDashboardStats`
- [x] Migrated `/users/page.tsx` to use `useUsers`, `useCreateUser`, `useUpdateUser`, `useDeleteUser`
- [x] Migrated `/notifications/page.tsx` to use `useNotifications`, `useMarkNotificationRead`, etc.
- [x] Migrated `/audit-logs/page.tsx` to use `useAuditLogs`, `useAuditLogStats`
- [x] Migrated `/analytics/page.tsx` to use `useAnalyticsSummary`, `useDistrictBreakdown`
- [x] Created `useDebounce` hook for search input debouncing
- [x] Updated `hooks/index.ts` to export all React Query hooks via `export * from './queries'`

**Deleted Legacy Files:**
- [x] `useDashboardStats.ts` - Replaced by `hooks/queries/useDashboard.ts`

**React Query Hooks Created:**
| Hook File | Exports |
|-----------|---------|
| `useRequests.ts` | `useRequests`, `useUserRequests`, `useAssignedRequests`, `useRequestDetail` |
| `useUsers.ts` | `useUsers`, `useUser`, `useCreateUser`, `useUpdateUser`, `useDeleteUser` |
| `useDashboard.ts` | `useUserDashboardStats`, `useAdminDashboardStats`, `useDistrictDashboardStats` |
| `useNotifications.ts` | `useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`, `useDeleteNotification` |
| `useAuditLogs.ts` | `useAuditLogs`, `useAuditLog`, `useAuditLogStats`, `useEntityAuditLogs` |
| `useAnalytics.ts` | `useAnalyticsSummary`, `useAnalyticsTrends`, `useDistrictBreakdown`, `useAnalyticsDashboard` |
| `useAssets.ts` | `useAssets`, `useAsset`, `useAssetMovements`, `useCreateAsset`, `useUpdateAssetStatus` |
| `useGeography.ts` | `useCountries`, `useStates`, `useDistricts`, `useWarehouses`, cascading selects |

**All Pages Now Using React Query:** ✅
- `/dashboard` ✅
- `/requests` ✅
- `/users` ✅
- `/notifications` ✅
- `/audit-logs` ✅
- `/analytics` ✅
- `/assets` ✅
- `/geography` ✅

---

## 🗂️ Phase 5: Asset & Warehouse Operations

> **Priority:** 🟡 HIGH  
> **Goal:** Physical asset tracking and warehouse management
> **Status:** ✅ COMPLETE

### 5.1 Asset APIs

- [x] **5.1.1** Asset CRUD endpoints (controllers.ts, routes.ts)
- [x] **5.1.2** Asset movement/transfer endpoints (createAssetMovement, getAssetMovements)
- [x] **5.1.3** Asset status workflow (updateAssetStatus with validation)

### 5.2 Warehouse APIs

- [x] **5.2.1** Warehouse inventory endpoints (getWarehouseInventory in controllers)
- [x] **5.2.2** Warehouse capacity management (updateWarehouseCapacity, getWarehouseCapacitySummary)

### 5.3 Frontend

- [x] **5.3.1** Asset React Query hooks (useAssets, useAsset, useAssetMovements, etc.)
- [x] **5.3.2** Asset list page (`/assets/page.tsx` with filters, search, pagination)
- [x] **5.3.3** Asset detail page (`/assets/[id]/page.tsx` with movement history)
- [x] **5.3.4** Navigation updated (Assets nav item, Package icon)
- [x] **5.3.5** Warehouse inventory view (`/warehouses/page.tsx` with capacity metrics, inventory dialog)

### 5.4 Integration

- [x] **5.4.1** Link assets to loan requests (getAssetByRequestId endpoint)
- [ ] **5.4.2** Integrate with auction creation on default (deferred to Phase 6)

---

## 🗂️ Phase 6: Auction System

> **Priority:** 🟢 MEDIUM  
> **Goal:** Sell defaulted assets through auctions
> **Status:** ✅ COMPLETE

### 6.1 Auction APIs ✅

- [x] **6.1.1** Auction listing creation (from defaulted loans) - `createAuction` controller
- [x] **6.1.2** Bidding endpoints - `placeBid`, `buyNow` controllers
- [x] **6.1.3** Auction lifecycle management - `cancelAuction`, `endExpiredAuctions` controllers

**Files Created:**
- `apps/main-backend/src/api/auctions/controllers.ts` (~1100 lines) - Full auction backend logic
- `apps/main-backend/src/api/auctions/routes.ts` - All auction API routes

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auctions` | List all auctions (with filters) |
| GET | `/api/v1/auctions/active` | Get active auctions |
| GET | `/api/v1/auctions/:id` | Get auction by ID |
| POST | `/api/v1/auctions` | Create auction (Admin) |
| POST | `/api/v1/auctions/:id/bids` | Place bid |
| POST | `/api/v1/auctions/:id/buy-now` | Buy now (if enabled) |
| PUT | `/api/v1/auctions/:id/cancel` | Cancel auction (Admin) |
| GET | `/api/v1/auctions/:id/bids` | Get bids for auction |
| GET | `/api/v1/auctions/my-bids` | Get user's bids |
| POST | `/api/v1/auctions/end-expired` | End expired auctions (Admin/Cron) |

### 6.2 Real-time ✅

- [x] **6.2.1** Socket events for bids - `auction:bid` event on bid placement
- [x] **6.2.2** Socket events for auction status changes - `auction:ended` event
- [ ] **6.2.3** Use Redis adapter for horizontal scaling (deferred to Phase 7)

**Socket Events Emitted:**
- `auction:bid` - New bid placed (broadcasts to `auction:{id}` room)
- `auction:ended` - Auction ended (broadcasts to `auction:{id}` room)

### 6.3 Frontend ✅

- [x] **6.3.1** Auction listing page - `/auctions/page.tsx`
- [x] **6.3.2** React Query hooks - `useAuctions.ts`
- [ ] **6.3.3** Bidding UI with real-time updates (partial - page exists, real-time needs Socket connection)
- [ ] **6.3.4** Auction detail page with live bidding (not yet created)

**Files Created:**
- `apps/frontend/src/hooks/queries/useAuctions.ts` - React Query hooks for auctions
- `apps/frontend/src/app/auctions/page.tsx` - Auction listing/management page

**React Query Hooks:**
| Hook | Description |
|------|-------------|
| `useAuctions(filters)` | List auctions with filters |
| `useActiveAuctions()` | Get active auctions |
| `useAuction(id)` | Get single auction |
| `useAuctionBids(auctionId)` | Get bids for auction |
| `useMyBids()` | Get current user's bids |
| `useCreateAuction()` | Create auction mutation |
| `usePlaceBid()` | Place bid mutation |
| `useBuyNow()` | Buy now mutation |
| `useCancelAuction()` | Cancel auction mutation |
| `useEndExpiredAuctions()` | End expired auctions mutation |

### 6.4 Notifications (Deferred to Phase 9-10)

- [ ] **6.4.1** Auction started notification
- [ ] **6.4.2** Outbid notification
- [ ] **6.4.3** Winner notification
- [ ] **6.4.4** Handover/delivery workflow

### 6.5 Schema Updates ✅

**Prisma enum additions:**
- `AssetStatus`: Added `FORFEITED`, `AUCTIONED`
- `BidStatus`: Added `CANCELLED`

**Constants updated in `@fundifyhub/types`:**
- `ASSET_STATUS`: Added `FORFEITED`, `AUCTIONED`
- `BID_STATUS`: Added `CANCELLED`
- Exported: `AUCTION_STATUS`, `BID_STATUS`, `AUCTION_STATUS_LABELS`, `BID_STATUS_LABELS`

### 6.6 Remaining Work (for next agent)

**High Priority:**
1. **Auction Detail Page** (`/auctions/[id]/page.tsx`) - Show auction details, asset info, bid history, place bid form
2. **Real-time Socket Integration** - Connect to Socket.IO for live bid updates
3. **Navigation** - Add Auctions link to sidebar navigation

**Medium Priority:**
4. **My Bids Page** (`/auctions/my-bids/page.tsx`) - Show user's bidding history
5. **Admin Auction Creation Modal** - UI to create auction from defaulted loans
6. **Countdown Timer Component** - Show time remaining on auctions

**Low Priority:**
7. **Outbid Notifications** - Real-time "you've been outbid" alerts
8. **Winner Flow** - Post-auction winner confirmation and payment

---

## 🗂️ Phase 7: Platform Hardening

> **Priority:** 🟡 HIGH  
> **Goal:** Production-ready with observability, security, and performance

### 7.1 Enhanced Logging

Location: `packages/logger/`

- [ ] **7.1.1** Upgrade to Pino for performance
  ```typescript
  import pino from 'pino';
  import { multistream } from 'pino-multi-stream';
  import { createStream } from 'rotating-file-stream';
  
  export function getLogger(serviceName: string) {
    const fileStream = createStream(`${serviceName}.log`, {
      path: 'logs',
      size: '10M',
      interval: '1d',
      compress: 'gzip',
    });
    
    return pino({
      name: serviceName,
      level: process.env.LOG_LEVEL || 'info',
    }, multistream([
      { stream: process.stdout },
      { stream: fileStream }
    ]));
  }
  ```
- [ ] **7.1.2** Add request ID correlation across services
- [ ] **7.1.3** Add user context (userId, role) to logs
- [ ] **7.1.4** Create child loggers per module
- [ ] **7.1.5** Mask sensitive data (PII, tokens, passwords)
- [ ] **7.1.6** Structured error logging with stack traces
- [ ] **7.1.7** Log rotation with compression
- [ ] **7.1.8** Separate error log files

### 7.2 Health Checks & Metrics

Location: `apps/main-backend/src/api/health/`

- [ ] **7.2.1** Basic health endpoint (`/health`)
  ```json
  { "status": "healthy", "timestamp": "..." }
  ```
- [ ] **7.2.2** Detailed health endpoint (`/health/detailed`)
  - Database connection
  - Redis connection
  - Queue status
  - Disk space
  - Memory usage
- [ ] **7.2.3** Readiness probe (`/health/ready`)
- [ ] **7.2.4** Liveness probe (`/health/live`)
- [ ] **7.2.5** Prometheus metrics endpoint (`/metrics`)
  - HTTP request duration histogram
  - Request count by status code
  - Active connections gauge
  - Queue job counts
  - Database query times

### 7.3 Rate Limiting (Enhanced)

Location: `apps/main-backend/src/utils/rate-limit.ts`

- [ ] **7.3.1** Sliding window rate limiter (already exists)
- [ ] **7.3.2** Per-endpoint rate limits
  ```typescript
  const RATE_LIMITS = {
    '/api/v1/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
    '/api/v1/auth/send-otp': { windowMs: 60 * 1000, max: 3 },
    '/api/v1/payments/*': { windowMs: 60 * 1000, max: 10 },
    'default': { windowMs: 60 * 1000, max: 100 },
  };
  ```
- [ ] **7.3.3** IP-based + User-based limiting
- [ ] **7.3.4** Bypass for admin IPs (whitelist)
- [ ] **7.3.5** Rate limit headers in response
- [ ] **7.3.6** Custom error messages per limit

### 7.4 Caching Strategy

Location: `apps/main-backend/src/utils/cache.ts`

- [ ] **7.4.1** Cache layer (already exists, enhance)
- [ ] **7.4.2** Define TTL per resource type
  ```typescript
  const CACHE_TTL = {
    USER_PROFILE: 300,      // 5 minutes
    DASHBOARD_STATS: 60,    // 1 minute
    GEOGRAPHY_DATA: 3600,   // 1 hour
    SERVICE_CONFIG: 300,    // 5 minutes
  };
  ```
- [ ] **7.4.3** Cache invalidation on writes
- [ ] **7.4.4** Cache warming for hot data
- [ ] **7.4.5** Distributed cache with Redis
- [ ] **7.4.6** Cache miss logging for optimization

### 7.5 Security Hardening

- [ ] **7.5.1** Input sanitization middleware
  ```typescript
  import xss from 'xss-clean';
  import hpp from 'hpp';
  
  app.use(xss());
  app.use(hpp());
  ```
- [ ] **7.5.2** SQL injection prevention (Prisma handles)
- [ ] **7.5.3** CORS configuration (already exists)
- [ ] **7.5.4** Helmet security headers (already exists, verify)
- [ ] **7.5.5** Content Security Policy
- [ ] **7.5.6** CSRF protection for state-changing operations
- [ ] **7.5.7** Password hashing with bcrypt (already exists)
- [ ] **7.5.8** JWT token rotation
- [ ] **7.5.9** Session invalidation on password change
- [ ] **7.5.10** Secure cookie settings
- [ ] **7.5.11** API key authentication for webhooks
- [ ] **7.5.12** Request size limits (already exists)

### 7.6 Performance Optimization

- [ ] **7.6.1** Database indexes (analyze slow queries)
  ```sql
  -- Common query patterns to index
  CREATE INDEX idx_requests_district_status ON requests(district_id, current_status);
  CREATE INDEX idx_emi_schedule_due_status ON emi_schedules(due_date, status);
  CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  ```
- [ ] **7.6.2** Query optimization with `select` and `include`
- [ ] **7.6.3** Cursor-based pagination for large lists
- [ ] **7.6.4** Batch database operations
- [ ] **7.6.5** Connection pooling configuration
- [ ] **7.6.6** Gzip compression for responses
- [ ] **7.6.7** Static asset caching headers
- [ ] **7.6.8** Database query logging (slow query detection)

### 7.7 API Documentation

Location: `apps/main-backend/src/docs/`

- [ ] **7.7.1** Setup Swagger/OpenAPI
- [ ] **7.7.2** Document all endpoints
- [ ] **7.7.3** Request/Response examples
- [ ] **7.7.4** Authentication documentation
- [ ] **7.7.5** Error codes documentation
- [ ] **7.7.6** Serve Swagger UI at `/api/docs`

### 7.8 Error Handling

- [ ] **7.8.1** Global error handler (already exists, enhance)
- [ ] **7.8.2** Custom error classes
  ```typescript
  export class ValidationError extends Error { ... }
  export class NotFoundError extends Error { ... }
  export class UnauthorizedError extends Error { ... }
  export class ForbiddenError extends Error { ... }
  export class ConflictError extends Error { ... }
  export class RateLimitError extends Error { ... }
  ```
- [ ] **7.8.3** Consistent error response format
- [ ] **7.8.4** Error tracking service (Sentry/Bugsnag)
- [ ] **7.8.5** Client-friendly error messages
- [ ] **7.8.6** Stack traces only in development

### 7.9 Data Integrity

- [ ] **7.9.1** Database transactions for multi-table operations
- [ ] **7.9.2** Optimistic locking for concurrent updates
- [ ] **7.9.3** Soft deletes instead of hard deletes
- [ ] **7.9.4** Data validation at database level (constraints)
- [ ] **7.9.5** Referential integrity checks

### 7.10 Audit Trail Enhancement

- [ ] **7.10.1** Audit all state-changing operations
- [ ] **7.10.2** Store before/after snapshots
- [ ] **7.10.3** Track IP address and user agent
- [ ] **7.10.4** Retention policy (archive old logs)
- [ ] **7.10.5** Audit log export functionality
- [ ] **7.10.6** Tamper-proof audit storage (optional)

---

## 🗂️ Phase 8: Payment System (Provider-Agnostic)

> **Priority:** 🟡 HIGH  
> **Goal:** Abstracted payment system that allows easy provider swaps

### 8.1 Payment Provider Abstraction

Location: `packages/payments/` (new package)

- [ ] **8.1.1** Create `@fundifyhub/payments` package
- [ ] **8.1.2** Define provider-agnostic interfaces
  ```typescript
  // packages/payments/src/types.ts
  export interface PaymentProvider {
    name: string;
    createOrder(params: CreateOrderParams): Promise<OrderResult>;
    verifyPayment(params: VerifyParams): Promise<VerificationResult>;
    refund(params: RefundParams): Promise<RefundResult>;
    getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  }
  
  export interface CreateOrderParams {
    amount: number;        // In paise/cents
    currency: string;      // 'INR'
    customerId: string;
    requestId: string;
    description: string;
    metadata?: Record<string, string>;
  }
  
  export interface OrderResult {
    orderId: string;       // Provider's order ID
    amount: number;
    currency: string;
    status: 'created' | 'failed';
    providerData?: unknown; // Raw provider response
  }
  
  export enum PaymentMethod {
    RAZORPAY = 'RAZORPAY',
    MANUAL_CASH = 'MANUAL_CASH',
    MANUAL_CHEQUE = 'MANUAL_CHEQUE',
    MANUAL_BANK_TRANSFER = 'MANUAL_BANK_TRANSFER',
    // Future providers
    // STRIPE = 'STRIPE',
    // PAYTM = 'PAYTM',
    // PHONEPE = 'PHONEPE',
  }
  ```
- [ ] **8.1.3** Create base adapter class
- [ ] **8.1.4** Export factory function

### 8.2 Razorpay Adapter

Location: `packages/payments/src/adapters/razorpay.ts`

- [ ] **8.2.1** Create Razorpay adapter implementing `PaymentProvider`
  ```typescript
  import Razorpay from 'razorpay';
  import crypto from 'crypto';
  
  export class RazorpayAdapter implements PaymentProvider {
    name = 'razorpay';
    private client: Razorpay;
    
    constructor(keyId: string, keySecret: string) {
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    
    async createOrder(params: CreateOrderParams): Promise<OrderResult> {
      const order = await this.client.orders.create({
        amount: params.amount,
        currency: params.currency,
        receipt: params.requestId,
        notes: params.metadata,
      });
      return { orderId: order.id, amount: order.amount, currency: order.currency, status: 'created' };
    }
    
    async verifyPayment(params: VerifyParams): Promise<VerificationResult> {
      const signature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${params.orderId}|${params.paymentId}`)
        .digest('hex');
      return { verified: signature === params.signature };
    }
  }
  ```
- [ ] **8.2.2** Handle webhook events
- [ ] **8.2.3** Implement refund logic
- [ ] **8.2.4** Add retry logic for network failures

### 8.3 Manual Payment Adapter

Location: `packages/payments/src/adapters/manual.ts`

- [ ] **8.3.1** Create Manual adapter for Cash/Cheque/Bank Transfer
  ```typescript
  export class ManualPaymentAdapter implements PaymentProvider {
    name = 'manual';
    
    async createOrder(params: CreateOrderParams): Promise<OrderResult> {
      // Generate internal order ID
      const orderId = `MANUAL_${nanoid(12)}`;
      return { orderId, amount: params.amount, currency: params.currency, status: 'created' };
    }
    
    async verifyPayment(params: VerifyParams): Promise<VerificationResult> {
      // Manual payments are verified by admin confirmation
      // This is a no-op - verification happens via admin action
      return { verified: true, requiresAdminApproval: true };
    }
  }
  ```
- [ ] **8.3.2** Admin approval workflow for manual payments
- [ ] **8.3.3** Receipt number/reference tracking
- [ ] **8.3.4** Document upload for cheque images

### 8.4 Payment Service

Location: `apps/main-backend/src/services/payment-service.ts`

- [ ] **8.4.1** Create payment service that uses adapters
  ```typescript
  import { getPaymentProvider } from '@fundifyhub/payments';
  
  export class PaymentService {
    async createPaymentOrder(
      method: PaymentMethod,
      params: CreateOrderParams
    ): Promise<OrderResult> {
      const provider = getPaymentProvider(method);
      const order = await provider.createOrder(params);
      
      // Store in database
      await prisma.payment.create({
        data: {
          orderId: order.orderId,
          method,
          amount: params.amount,
          customerId: params.customerId,
          requestId: params.requestId,
          status: 'PENDING',
        }
      });
      
      return order;
    }
  }
  ```
- [ ] **8.4.2** Payment verification endpoint
- [ ] **8.4.3** Payment history retrieval
- [ ] **8.4.4** Reconciliation helpers

### 8.5 Payment API Routes

Location: `apps/main-backend/src/api/payments/`

- [ ] **8.5.1** `POST /api/v1/payments/create-order` - Create payment order
- [ ] **8.5.2** `POST /api/v1/payments/verify` - Verify payment
- [ ] **8.5.3** `POST /api/v1/payments/webhook/razorpay` - Razorpay webhooks
- [ ] **8.5.4** `POST /api/v1/payments/manual/record` - Record manual payment
- [ ] **8.5.5** `POST /api/v1/payments/manual/approve` - Admin approve manual payment
- [ ] **8.5.6** `GET /api/v1/payments/:id` - Get payment details
- [ ] **8.5.7** `GET /api/v1/payments/request/:requestId` - Get payments for request

### 8.6 Future Provider Migration

> When switching to another provider (e.g., Stripe, PayTM):

- [ ] **8.6.1** Create new adapter implementing `PaymentProvider`
- [ ] **8.6.2** Add to `PaymentMethod` enum
- [ ] **8.6.3** Register in factory
- [ ] **8.6.4** Update environment variables
- [ ] **8.6.5** No other code changes needed!

---

## 🗂️ Phase 9: Notification Channels (Extensible)

> **Priority:** 🟡 HIGH  
> **Goal:** Channel-based notification system with easy extensibility
> **Current Channels:** WhatsApp (whatsapp-web.js), Email (nodemailer), In-App Push

### 9.1 Notification Provider Abstraction

Location: `packages/notifications/` (enhance existing)

- [ ] **9.1.1** Define channel-agnostic interfaces
  ```typescript
  // packages/notifications/src/types.ts
  export interface NotificationChannel {
    name: string;
    isEnabled(): boolean;
    send(notification: ChannelNotification): Promise<SendResult>;
    getStatus(notificationId: string): Promise<DeliveryStatus>;
  }
  
  export interface ChannelNotification {
    recipientId: string;
    recipientContact: string;  // email, phone, userId
    templateName: string;
    variables: Record<string, string>;
    priority: 'high' | 'normal' | 'low';
  }
  
  export enum NotificationChannelType {
    EMAIL = 'EMAIL',
    WHATSAPP = 'WHATSAPP',
    IN_APP = 'IN_APP',
    // Future channels
    // SMS = 'SMS',
    // TELEGRAM = 'TELEGRAM',
  }
  ```
- [ ] **9.1.2** Create base adapter class
- [ ] **9.1.3** Channel registry factory

### 9.2 WhatsApp Channel (whatsapp-web.js)

Location: `packages/notifications/src/channels/whatsapp.ts`

- [ ] **9.2.1** Create WhatsApp adapter
  ```typescript
  import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
  import qrcode from 'qrcode-terminal';
  
  export class WhatsAppChannel implements NotificationChannel {
    name = 'whatsapp';
    private client: Client;
    private isReady = false;
    
    async initialize() {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
        puppeteer: { headless: true }
      });
      
      this.client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        logger.info('Scan QR code to authenticate WhatsApp');
      });
      
      this.client.on('ready', () => {
        this.isReady = true;
        logger.info('WhatsApp client ready');
      });
      
      await this.client.initialize();
    }
    
    async send(notification: ChannelNotification): Promise<SendResult> {
      const phone = notification.recipientContact.replace(/\D/g, '');
      const chatId = `${phone}@c.us`;
      const message = await this.renderTemplate(notification);
      await this.client.sendMessage(chatId, message);
      return { success: true, messageId: nanoid() };
    }
  }
  ```
- [ ] **9.2.2** QR code authentication flow
- [ ] **9.2.3** Session persistence
- [ ] **9.2.4** Message templates for WhatsApp
- [ ] **9.2.5** Media message support (images, PDFs)
- [ ] **9.2.6** Delivery status tracking
- [ ] **9.2.7** Rate limiting (avoid ban)
- [ ] **9.2.8** Reconnection logic

### 9.3 Email Channel (nodemailer)

Location: `packages/notifications/src/channels/email.ts`

- [ ] **9.3.1** Create Email adapter (already exists, enhance)
  ```typescript
  import nodemailer from 'nodemailer';
  import { render } from '@react-email/render';
  
  export class EmailChannel implements NotificationChannel {
    name = 'email';
    private transporter: nodemailer.Transporter;
    
    constructor() {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: true,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
      });
    }
    
    async send(notification: ChannelNotification): Promise<SendResult> {
      const template = getEmailTemplate(notification.templateName);
      const html = await render(template(notification.variables));
      
      const result = await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: notification.recipientContact,
        subject: getSubject(notification.templateName, notification.variables),
        html
      });
      
      return { success: true, messageId: result.messageId };
    }
  }
  ```
- [ ] **9.3.2** React Email templates (already exist, enhance)
- [ ] **9.3.3** Email queue with retry
- [ ] **9.3.4** Bounce handling
- [ ] **9.3.5** Unsubscribe link support

### 9.4 In-App Push Channel (web-push)

Location: `packages/notifications/src/channels/in-app.ts`

- [ ] **9.4.1** Create In-App + Web Push adapter
  ```typescript
  import webpush from 'web-push';
  
  export class InAppChannel implements NotificationChannel {
    name = 'in_app';
    
    constructor() {
      webpush.setVapidDetails(
        'mailto:' + env.CONTACT_EMAIL,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
      );
    }
    
    async send(notification: ChannelNotification): Promise<SendResult> {
      // 1. Store in database for in-app notification center
      const dbNotification = await prisma.notification.create({
        data: {
          userId: notification.recipientId,
          type: notification.templateName,
          title: getTitle(notification),
          body: getBody(notification),
          data: notification.variables,
          read: false
        }
      });
      
      // 2. Send push to browser if subscribed
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: notification.recipientId }
      });
      
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({
            title: getTitle(notification),
            body: getBody(notification),
            icon: '/icon-192.png',
            data: { notificationId: dbNotification.id }
          }));
        } catch (error) {
          // Remove invalid subscription
          if ((error as WebPushError).statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        }
      }
      
      // 3. Emit Socket.IO event for real-time update
      getIO().to(`user:${notification.recipientId}`).emit('notification:new', dbNotification);
      
      return { success: true, messageId: dbNotification.id };
    }
  }
  ```
- [ ] **9.4.2** VAPID key generation script
- [ ] **9.4.3** Service worker for push notifications
- [ ] **9.4.4** Push subscription API endpoints
- [ ] **9.4.5** Real-time Socket.IO integration
- [ ] **9.4.6** Notification bell component in frontend
- [ ] **9.4.7** Mark as read/unread API

---

## 🗂️ Phase 10: Notification Templates & Frontend

> **Priority:** 🟡 HIGH  
> **Goal:** Complete notification templates and frontend components

### 10.1 Notification Templates

Location: `packages/templates/src/`

- [ ] **10.1.1** Define template registry
  ```typescript
  export const NOTIFICATION_TEMPLATES = {
    EMI_REMINDER: {
      email: EmiReminderEmail,
      whatsapp: emiReminderWhatsApp,
      inApp: { title: 'EMI Reminder', body: 'Your EMI of {amount} is due on {date}' }
    },
    PAYMENT_RECEIVED: { ... },
    LOAN_APPROVED: { ... },
    // ... more templates
  } as const;
  ```
- [ ] **10.1.2** Email templates (React Email)
- [ ] **10.1.3** WhatsApp text templates
- [ ] **10.1.4** In-app notification templates
- [ ] **10.1.5** Variable substitution utility

### 10.2 Notification Service

Location: `packages/notifications/src/notification-service.ts`

- [ ] **10.2.1** Multi-channel dispatch
  ```typescript
  export class NotificationService {
    private channels: Map<string, NotificationChannel>;
    
    async send(params: SendNotificationParams): Promise<void> {
      const { userId, templateName, variables, channels } = params;
      
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { email: true, phoneNumber: true, notificationPreferences: true }
      });
      
      // Respect user preferences
      const enabledChannels = channels.filter(ch => 
        user.notificationPreferences?.[ch] !== false
      );
      
      // Queue notifications for each channel
      for (const channelName of enabledChannels) {
        await enqueue(QUEUE_NAMES.NOTIFICATION, {
          channel: channelName,
          recipientId: userId,
          recipientContact: channelName === 'email' ? user.email : user.phoneNumber,
          templateName,
          variables
        });
      }
    }
  }
  ```
- [ ] **10.2.2** User preference checking
- [ ] **10.2.3** Quiet hours support
- [ ] **10.2.4** Deduplication

### 10.3 Notification Center (Frontend)

Location: `apps/frontend/src/components/notifications/`

- [ ] **10.3.1** Notification bell icon with badge
- [ ] **10.3.2** Dropdown with recent notifications
- [ ] **10.3.3** Mark as read on click
- [ ] **10.3.4** Mark all as read button
- [ ] **10.3.5** Full notification history page
- [ ] **10.3.6** Filter by type/status
- [ ] **10.3.7** Real-time updates via Socket.IO
- [ ] **10.3.8** Push permission request UI

### 10.4 Future Channels (Extensibility)

> To add a new channel (e.g., SMS, Telegram):

- [ ] **10.4.1** Create adapter implementing `NotificationChannel`
- [ ] **10.4.2** Add to `NotificationChannelType` enum
- [ ] **10.4.3** Register in channel factory
- [ ] **10.4.4** Add templates for new channel
- [ ] **10.4.5** No other code changes needed!

---

## 🗂️ Phase 11: Storage System (Provider-Agnostic)

> **Priority:** 🟡 HIGH  
> **Goal:** Abstracted storage system for easy provider migration
> **Current Provider:** UploadThing (free tier)

### 11.1 Storage Provider Abstraction

Location: `packages/storage/` (new package)

- [ ] **11.1.1** Create `@fundifyhub/storage` package
- [ ] **11.1.2** Define provider-agnostic interfaces
  ```typescript
  // packages/storage/src/types.ts
  export interface StorageProvider {
    name: string;
    upload(params: UploadParams): Promise<UploadResult>;
    delete(fileKey: string): Promise<void>;
    getSignedUrl(fileKey: string, expiresIn?: number): Promise<string>;
    getPublicUrl(fileKey: string): string;
    listFiles(prefix: string): Promise<FileInfo[]>;
  }
  
  export interface UploadParams {
    file: Buffer | Readable;
    fileName: string;
    mimeType: string;
    folder?: string;          // 'documents', 'images', 'signatures'
    metadata?: Record<string, string>;
    isPublic?: boolean;
  }
  
  export interface UploadResult {
    fileKey: string;          // Unique identifier
    url: string;              // Access URL
    size: number;
    mimeType: string;
  }
  
  export enum StorageFolder {
    DOCUMENTS = 'documents',
    IMAGES = 'images',
    SIGNATURES = 'signatures',
    ASSETS = 'assets',
    RECEIPTS = 'receipts',
    TEMP = 'temp',
  }
  ```
- [ ] **11.1.3** Create base adapter class
- [ ] **11.1.4** Factory function for provider selection

### 11.2 UploadThing Adapter

Location: `packages/storage/src/adapters/uploadthing.ts`

- [ ] **11.2.1** Create UploadThing adapter (already exists, refactor)
  ```typescript
  import { createUploadthing, type FileRouter } from 'uploadthing/server';
  import { UTApi } from 'uploadthing/server';
  
  export class UploadThingAdapter implements StorageProvider {
    name = 'uploadthing';
    private utapi = new UTApi();
    
    async upload(params: UploadParams): Promise<UploadResult> {
      const response = await this.utapi.uploadFiles(
        new File([params.file], params.fileName, { type: params.mimeType })
      );
      return {
        fileKey: response.data.key,
        url: response.data.url,
        size: response.data.size,
        mimeType: params.mimeType
      };
    }
    
    async delete(fileKey: string): Promise<void> {
      await this.utapi.deleteFiles(fileKey);
    }
    
    async getSignedUrl(fileKey: string): Promise<string> {
      const urls = await this.utapi.getSignedURL(fileKey);
      return urls.url;
    }
  }
  ```
- [ ] **11.2.2** File router configuration
- [ ] **11.2.3** Upload progress tracking
- [ ] **11.2.4** File type validation

### 11.3 Local Storage Adapter (Development)

Location: `packages/storage/src/adapters/local.ts`

- [ ] **11.3.1** Create local filesystem adapter for development
  ```typescript
  import fs from 'fs/promises';
  import path from 'path';
  
  export class LocalStorageAdapter implements StorageProvider {
    name = 'local';
    private baseDir: string;
    
    constructor(baseDir = './uploads') {
      this.baseDir = baseDir;
    }
    
    async upload(params: UploadParams): Promise<UploadResult> {
      const folder = params.folder || 'general';
      const fileKey = `${folder}/${nanoid()}_${params.fileName}`;
      const filePath = path.join(this.baseDir, fileKey);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, params.file);
      
      return {
        fileKey,
        url: `/uploads/${fileKey}`,
        size: Buffer.byteLength(params.file),
        mimeType: params.mimeType
      };
    }
  }
  ```
- [ ] **11.3.2** Serve static files in development
- [ ] **11.3.3** Cleanup old temp files

### 11.4 Future S3 Adapter (Ready for Migration)

Location: `packages/storage/src/adapters/s3.ts`

> When migrating to S3:

- [ ] **11.4.1** Create S3 adapter
  ```typescript
  import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  
  export class S3StorageAdapter implements StorageProvider {
    name = 's3';
    private client: S3Client;
    private bucket: string;
    
    constructor() {
      this.client = new S3Client({ region: env.AWS_REGION });
      this.bucket = env.S3_BUCKET;
    }
    
    async upload(params: UploadParams): Promise<UploadResult> {
      const key = `${params.folder || 'general'}/${nanoid()}_${params.fileName}`;
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.file,
        ContentType: params.mimeType,
        Metadata: params.metadata
      }));
      
      return {
        fileKey: key,
        url: `https://${this.bucket}.s3.amazonaws.com/${key}`,
        size: Buffer.byteLength(params.file),
        mimeType: params.mimeType
      };
    }
  }
  ```
- [ ] **11.4.2** Signed URL generation
- [ ] **11.4.3** Multipart upload for large files
- [ ] **11.4.4** Lifecycle policies for temp files

### 11.5 Storage Service

Location: `apps/main-backend/src/services/storage-service.ts`

- [ ] **11.5.1** Create storage service using adapter
  ```typescript
  import { getStorageProvider } from '@fundifyhub/storage';
  
  export class StorageService {
    private provider = getStorageProvider(env.STORAGE_PROVIDER || 'uploadthing');
    
    async uploadDocument(file: Buffer, fileName: string, requestId: string): Promise<string> {
      const result = await this.provider.upload({
        file,
        fileName,
        mimeType: getMimeType(fileName),
        folder: StorageFolder.DOCUMENTS,
        metadata: { requestId }
      });
      
      // Store reference in database
      await prisma.document.create({
        data: {
          fileKey: result.fileKey,
          fileName,
          mimeType: result.mimeType,
          size: result.size,
          requestId
        }
      });
      
      return result.url;
    }
  }
  ```
- [ ] **11.5.2** Document management methods
- [ ] **11.5.3** Image optimization before upload
- [ ] **11.5.4** Virus scanning (optional)

### 11.6 Storage API Routes

Location: `apps/main-backend/src/api/documents/`

- [ ] **11.6.1** `POST /api/v1/documents/upload` - Upload document
- [ ] **11.6.2** `GET /api/v1/documents/:id/download` - Get signed download URL
- [ ] **11.6.3** `DELETE /api/v1/documents/:id` - Delete document
- [ ] **11.6.4** `GET /api/v1/documents/request/:requestId` - List documents for request

### 11.7 Provider Migration Steps

> When switching storage providers:

- [ ] **11.7.1** Create new adapter implementing `StorageProvider`
- [ ] **11.7.2** Add environment variable `STORAGE_PROVIDER=s3`
- [ ] **11.7.3** Add required credentials to env
- [ ] **11.7.4** Optional: Migration script for existing files
- [ ] **11.7.5** No application code changes needed!

---

## 🗂️ Phase 12: Document Generation

> **Priority:** 🟡 HIGH  
> **Goal:** Professional PDF documents and exports

### 12.1 PDF Generation

Location: `packages/documents/` (new package)

- [ ] **12.1.1** Create `@fundifyhub/documents` package
- [ ] **12.1.2** Loan Agreement PDF (already exists, enhance)
- [ ] **12.1.3** EMI Receipt PDF
- [ ] **12.1.4** Payment Receipt PDF
- [ ] **12.1.5** Loan Closure Certificate
- [ ] **12.1.6** Asset Pledge Certificate
- [ ] **12.1.7** Auction Catalog PDF
- [ ] **12.1.8** NOC (No Objection Certificate)
- [ ] **12.1.9** Statement of Account
- [ ] **12.1.10** Monthly/Yearly Statements

### 12.2 Digital Signatures

- [ ] **12.2.1** Customer signature capture (already exists in frontend)
- [ ] **12.2.2** Embed signature in PDFs using pdf-lib (FREE)
- [ ] **12.2.3** Admin/Company signature stamp
- [ ] **12.2.4** Timestamp on signatures
- [ ] **12.2.5** Store signed documents securely

### 12.3 Document Templates

- [ ] **12.3.1** Create template engine for documents
- [ ] **12.3.2** Configurable company letterhead
- [ ] **12.3.3** Multi-language support (Hindi, English)
- [ ] **12.3.4** Terms & conditions templates

### 12.4 Export Features

- [ ] **12.4.1** Export requests to Excel (exceljs - FREE)
- [ ] **12.4.2** Export user list
- [ ] **12.4.3** Export payment history
- [ ] **12.4.4** Export audit logs
- [ ] **12.4.5** Bulk download as ZIP (archiver - FREE)

---

## 🗂️ Phase 13: Job Workers & Background Processing

> **Priority:** 🟡 HIGH  
> **Goal:** Robust background job system with proper scheduling, retries, and monitoring

### 13.1 Worker Infrastructure

Location: `apps/job-worker/src/`

- [ ] **13.1.1** Create base worker class with standard error handling
- [ ] **13.1.2** Add dead letter queue (DLQ) for failed jobs
- [ ] **13.1.3** Add job progress tracking and reporting
- [ ] **13.1.4** Implement graceful shutdown with job completion
- [ ] **13.1.5** Add worker health check endpoint

### 13.2 New Workers

- [ ] **13.2.1** **Report Generation Worker**
  - Generate daily/weekly/monthly reports
  - Export to PDF/Excel
  - Email to admins
  
- [ ] **13.2.2** **Loan Default Worker**
  - Check for defaulted loans (3+ overdue EMIs)
  - Update loan status to DEFAULTED
  - Trigger asset seizure workflow
  - Send notifications

- [ ] **13.2.3** **Auction Worker**
  - Start scheduled auctions at startTime
  - End auctions at endTime
  - Process winning bids
  - Notify winners and losers

- [ ] **13.2.4** **Cleanup Worker**
  - Delete expired OTPs
  - Archive old audit logs
  - Clean orphaned uploads
  - Purge old sessions
  - Clean notification logs (>90 days)

- [ ] **13.2.5** **Document Processing Worker**
  - Generate PDFs (agreements, receipts)
  - Compress/optimize images

### 13.3 Cron Schedules

Location: `apps/job-worker/src/cron/`

- [ ] **13.3.1** Create cron scheduler service (croner - FREE)
- [ ] **13.3.2** EMI reminder: Daily at 9 AM (3 days before due)
- [ ] **13.3.3** Overdue check: Every 6 hours
- [ ] **13.3.4** Default check: Daily at midnight
- [ ] **13.3.5** Cleanup jobs: Daily at 3 AM

### 13.4 Job Queues

- [ ] **13.4.1** Create queue constants in `@fundifyhub/types`
- [ ] **13.4.2** Add priority levels per queue
- [ ] **13.4.3** Configure retry strategies per job type
- [ ] **13.4.4** Add job deduplication with idempotency keys

### 13.5 Job Monitoring

- [ ] **13.5.1** Add BullMQ Board UI (bull-board - FREE)
- [ ] **13.5.2** Create job metrics endpoint
- [ ] **13.5.3** Alert on failed jobs via email

---

## 🗂️ Phase 14: DevOps & Deployment

> **Priority:** 🟢 MEDIUM  
> **Goal:** Production-ready deployment pipeline (FREE tools only)

### 14.1 CI/CD Pipeline

Location: `.github/workflows/`

- [ ] **14.1.1** Build workflow (GitHub Actions - FREE)
  - Lint check
  - TypeScript build
  - Build Docker images
  
- [ ] **14.1.2** Deploy workflow
  - Staging auto-deploy on PR merge
  - Production manual approval
  - Health checks

- [ ] **14.1.3** PR checks
  - Lint
  - Build
  - Security scan (npm audit)

### 14.2 Docker Setup

- [ ] **14.2.1** Multi-stage Dockerfile for each app
- [ ] **14.2.2** Docker Compose for local development
- [ ] **14.2.3** Docker Compose for production
- [ ] **14.2.4** Health checks in containers

### 14.3 Environment Management

- [ ] **14.3.1** Create `.env.example` files
- [ ] **14.3.2** Document all environment variables
- [ ] **14.3.3** Per-environment configs

### 14.4 Database Operations

- [ ] **14.4.1** Automated backup script (pg_dump)
- [ ] **14.4.2** Point-in-time recovery documentation

### 14.5 Monitoring (FREE Options)

- [ ] **14.5.1** Health check endpoints
- [ ] **14.5.2** Uptime monitoring (UptimeRobot - FREE tier)
- [ ] **14.5.3** Error alerting via email

---

## 🗂️ Phase 15: Analytics & Reporting

> **Priority:** 🟢 MEDIUM  
> **Goal:** Dashboard analytics and reports

### 15.1 Dashboard Analytics

Location: `apps/frontend/src/app/analytics/`

- [ ] **15.1.1** Real-time metrics dashboard
- [ ] **15.1.2** Loan volume trends
- [ ] **15.1.3** Revenue analytics
- [ ] **15.1.4** Default rate analysis
- [ ] **15.1.5** Geography-wise breakdown
- [ ] **15.1.6** Agent performance metrics

### 15.2 Backend Analytics API

Location: `apps/main-backend/src/api/analytics/`

- [ ] **15.2.1** Pre-aggregated metrics table
- [ ] **15.2.2** Daily/Weekly/Monthly summaries
- [ ] **15.2.3** Custom date range queries

### 15.3 Reports

- [ ] **15.3.1** Daily summary report (auto-email)
- [ ] **15.3.2** Weekly performance report
- [ ] **15.3.3** Monthly MIS report
- [ ] **15.3.4** Audit trail reports

### 15.4 Data Visualization

- [ ] **15.4.1** Integrate recharts (FREE)
- [ ] **15.4.2** Interactive charts
- [ ] **15.4.3** Export charts as images

---

## 🗂️ Phase 16: Testing & Quality Assurance (DO LAST)

> **Priority:** 🔵 LAST  
> **Goal:** Add tests after all features are complete

### 16.1 Testing Infrastructure

- [ ] **16.1.1** Install Vitest as test runner (FREE)
- [ ] **16.1.2** Configure test environment
- [ ] **16.1.3** Create test utilities package
- [ ] **16.1.4** Setup test database

### 16.2 Unit Tests

- [ ] **16.2.1** Test workflow engine transitions
- [ ] **16.2.2** Test EMI calculation utilities
- [ ] **16.2.3** Test validation schemas
- [ ] **16.2.4** Test RBAC helpers

### 16.3 Integration Tests

- [ ] **16.3.1** Auth flow
- [ ] **16.3.2** Request lifecycle
- [ ] **16.3.3** Payment flow

### 16.4 E2E Tests

- [ ] **16.4.1** Setup Playwright (FREE)
- [ ] **16.4.2** Critical user flows

---

## 📝 Coding Standards (Mandatory)

### Zero `any` Types

```typescript
// ❌ NEVER
const data: any = response;
function process(input: any) {}

// ✅ ALWAYS
const data: UserType = response;
function process(input: unknown): ProcessedData {
  if (!isValidInput(input)) throw new Error('Invalid input');
  return processValidInput(input);
}
```

### Import from Shared Packages

```typescript
// ❌ NEVER duplicate locally
const ROLES = { ADMIN: 'ADMIN' };

// ✅ ALWAYS import
import { UserRole, REQUEST_STATUS } from '@fundifyhub/types';
import { prisma } from '@fundifyhub/prisma';
import { logger } from '@fundifyhub/logger';
```

### No Hardcoding

```typescript
// ❌ NEVER
const API_URL = 'http://localhost:3001';
const MAX_RETRIES = 3;

// ✅ ALWAYS
import { env } from '@fundifyhub/utils/env-validation';
import { CONFIG } from '@fundifyhub/types/constants';
```

### Standard API Response

```typescript
interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}
```

### Proper Error Handling

```typescript
try {
  await operation();
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ success: false, errors: error.errors });
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json({ success: false, message: error.message });
  }
  logger.error('Unexpected error', { error, context });
  return res.status(500).json({ success: false, message: 'Internal error' });
}
```

### JSDoc for Public Functions

```typescript
/**
 * Get all district IDs a user has access to based on their role.
 * @param user - The authenticated user context
 * @returns Array of district IDs the user can access
 */
export async function getUserAccessibleDistrictIds(user: AuthUser): Promise<string[]> {
  // ...
}
```

---

## 🔗 Quick Reference

| Purpose | Location |
|---------|----------|
| Prisma Schema | `packages/prisma/prisma/schema.prisma` |
| Types/Constants | `packages/types/src/` |
| Logger | `packages/logger/src/` |
| Utils | `packages/utils/src/` |
| Backend API | `apps/main-backend/src/api/` |
| Frontend Pages | `apps/frontend/src/app/` |
| Copilot Instructions | `.github/copilot-instructions.md` |

---

## ✅ Acceptance Criteria

Before marking any phase complete:

- [ ] `pnpm build` passes (zero TypeScript errors)
- [ ] `pnpm lint` passes (zero ESLint errors)
- [ ] No `any` types introduced
- [ ] All new types in `@fundifyhub/types`
- [ ] API responses follow standard format
- [ ] Database queries use Prisma (no raw SQL)
- [ ] Sensitive data not logged
- [ ] Input validation uses Zod

---

## 📋 Agent Instructions

When working on tasks:

1. **Update this file** when starting/completing tasks
2. **Follow coding standards** in `.github/copilot-instructions.md`
3. **Add shared logic** to `packages/*` first
4. **Use `@fundifyhub/logger`** for all logging
5. **Run `pnpm build`** before marking complete
6. **Remove old code** - no backward compatibility needed

---

*End of TODO file - Update inline as progress is made*
