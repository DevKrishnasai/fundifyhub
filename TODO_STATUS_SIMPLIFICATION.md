# 🔄 Request Status Simplification - Implementation Plan

**Goal:** Replace 28 complex statuses with 10 stages + sub-status pattern for better maintainability, scalability, and user experience.

---

## 📊 New Status Architecture

### Request Stages (10 total - Database Enum)

| Stage | Description | Primary Actor |
|-------|-------------|---------------|
| `DRAFT` | Request being created (future: multi-step form) | Customer |
| `REVIEW` | Admin reviewing request | Admin |
| `OFFER` | Offer negotiation phase | Customer/Admin |
| `INSPECTION` | Asset verification | Agent |
| `DOCUMENTATION` | Signatures & bank details | Customer |
| `DISBURSEMENT` | Money transfer | Admin |
| `ACTIVE` | Loan running, EMI payments | Customer |
| `COMPLETED` | Loan fully repaid ✓ | - |
| `REJECTED` | Request declined ✗ | - |
| `CANCELLED` | Request cancelled ✗ | - |

### Sub-Status Values (String field - flexible)

```typescript
type SubStatusMap = {
  DRAFT: 'IN_PROGRESS' | 'SUBMITTED';
  REVIEW: 'PENDING' | 'ASSIGNED' | 'IN_REVIEW' | 'INFO_REQUIRED' | 'INFO_RECEIVED';
  OFFER: 'PENDING' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVISED';
  INSPECTION: 'PENDING_ASSIGNMENT' | 'SCHEDULED' | 'RESCHEDULE_REQUESTED' | 
              'IN_PROGRESS' | 'COMPLETED' | 'CUSTOMER_UNAVAILABLE' | 
              'AGENT_UNAVAILABLE' | 'ASSET_ISSUE';
  DOCUMENTATION: 'PENDING_SIGNATURE' | 'SIGNED' | 'PENDING_BANK_DETAILS' | 
                 'BANK_DETAILS_SUBMITTED' | 'SIGNATURE_REFUSED';
  DISBURSEMENT: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  ACTIVE: 'CURRENT' | 'OVERDUE' | 'DEFAULTED';
  COMPLETED: null;
  REJECTED: null;
  CANCELLED: null;
};
```

### Action Flags (Denormalized for performance)

| Flag | Purpose |
|------|---------|
| `requiresCustomerAction` | Customer needs to do something |
| `requiresAdminAction` | Admin needs to do something |
| `requiresAgentAction` | Agent needs to do something |
| `isBlocked` | Request is blocked (needs resolution) |

### Failure Tracking

| Field | Purpose |
|-------|---------|
| `failureReason` | Human-readable failure message |
| `failureType` | Category: 'TRANSFER' | 'INSPECTION' | 'VERIFICATION' | 'DOCUMENTATION' |

---

## 🗂️ Implementation Phases

### Phase 1: Database Schema Changes ✅
- [x] Define new `RequestStage` enum in Prisma
- [x] Add new fields to Request model
- [x] Create migration (add columns, keep old for now)
- [x] Add indexes for new fields

### Phase 2: Types Package Update ✅
- [x] Create `REQUEST_STAGE` enum in constants.ts
- [x] Define `SubStatus` types for each stage
- [x] Create action flag types
- [x] Update `RequestType` interface
- [x] Create status display config (labels, colors, icons)
- [x] Remove legacy status constants (after migration)

### Phase 3: Workflow Engine Rewrite ✅
- [x] Simplify `WORKFLOW_EVENTS` (actions)
- [x] Rewrite `TRANSITIONS` config for stage-based flow
- [x] Update guards for new system
- [x] Create `ACTION_CONFIG` for new events
- [x] Test all transitions

### Phase 4: Backend Controllers Update 🔄 IN PROGRESS
- [x] Update Prisma seed file for new stage fields
- [x] Update job-worker emiStatusWorker.ts
- [ ] Update `src/api/requests/controllers.ts` (85 references)
- [ ] Update `src/api/user/controllers.ts` (20 references)
- [ ] Update `src/api/admin/controllers.ts` (8 references)
- [ ] Update `src/api/admin/analytics/controllers.ts` (6 references)
- [ ] Update `src/services/request.service.ts` (6 references)
- [ ] Update `src/utils/notifications.ts` (5 references)
- [ ] Update `src/api/assets/controllers.ts` (5 references)
- [ ] Update `src/socket/handlers.ts` (4 references)
- [ ] Update `src/utils/metrics.ts` (2 references)
- [ ] Update `src/api/documents/controllers.ts` (2 references)
- [ ] Update `src/api/payments/controllers.ts` (2 references)
- [ ] Update `src/api/payments/razorpay.ts` (2 references)
- [ ] Update `src/api/geography/controllers.ts` (1 reference)
- [ ] Update `src/api/notifications/controllers.ts` (1 reference)

### Phase 5: Frontend Updates 🔄 IN PROGRESS
- [ ] Fix WorkflowEngine import error in RequestActionContext.tsx
- [ ] Update `RequestDetailPage` for stages
- [ ] Simplify `StatusBadge` component
- [ ] Update progress bar (6 phases → stages)
- [ ] Update request list filters
- [ ] Update action buttons
- [ ] Update all modal components

### Phase 6: Testing & Cleanup
- [ ] Test complete flow for all roles
- [ ] Remove old `currentStatus` column (migration)
- [ ] Remove legacy constants
- [ ] Update API documentation

---

## 📝 Detailed Changes

### Schema Changes (schema.prisma)

```prisma
// NEW: Simplified stage enum (10 values)
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

model Request {
  // NEW: Stage-based status
  stage                   RequestStage @default(REVIEW)
  subStatus               String?      // Contextual detail
  
  // NEW: Action flags (denormalized for fast queries)
  requiresCustomerAction  Boolean @default(false)
  requiresAdminAction     Boolean @default(true)
  requiresAgentAction     Boolean @default(false)
  isBlocked               Boolean @default(false)
  
  // NEW: Failure tracking
  failureReason           String?
  failureType             String?
  
  // DEPRECATED: Will be removed after migration
  // currentStatus         RequestStatus @default(PENDING)
  
  @@index([stage])
  @@index([stage, subStatus])
  @@index([requiresCustomerAction])
  @@index([requiresAdminAction])
  @@index([requiresAgentAction])
}
```

### Types Package Changes

```typescript
// packages/types/src/constants.ts

export enum REQUEST_STAGE {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  OFFER = 'OFFER',
  INSPECTION = 'INSPECTION',
  DOCUMENTATION = 'DOCUMENTATION',
  DISBURSEMENT = 'DISBURSEMENT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// Sub-status values per stage
export const SUB_STATUS = {
  REVIEW: {
    PENDING: 'PENDING',
    ASSIGNED: 'ASSIGNED',
    IN_REVIEW: 'IN_REVIEW',
    INFO_REQUIRED: 'INFO_REQUIRED',
    INFO_RECEIVED: 'INFO_RECEIVED',
  },
  OFFER: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED',
    REVISED: 'REVISED',
  },
  INSPECTION: {
    PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT',
    SCHEDULED: 'SCHEDULED',
    RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CUSTOMER_UNAVAILABLE: 'CUSTOMER_UNAVAILABLE',
    AGENT_UNAVAILABLE: 'AGENT_UNAVAILABLE',
    ASSET_ISSUE: 'ASSET_ISSUE',
  },
  DOCUMENTATION: {
    PENDING_SIGNATURE: 'PENDING_SIGNATURE',
    SIGNED: 'SIGNED',
    PENDING_BANK_DETAILS: 'PENDING_BANK_DETAILS',
    BANK_DETAILS_SUBMITTED: 'BANK_DETAILS_SUBMITTED',
    SIGNATURE_REFUSED: 'SIGNATURE_REFUSED',
  },
  DISBURSEMENT: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
  ACTIVE: {
    CURRENT: 'CURRENT',
    OVERDUE: 'OVERDUE',
    DEFAULTED: 'DEFAULTED',
  },
} as const;
```

### Workflow Events (Simplified)

```typescript
export const WORKFLOW_EVENTS = {
  // Review Stage
  ASSIGN_TO_ME: 'ASSIGN_TO_ME',
  ASSIGN_ADMIN: 'ASSIGN_ADMIN',
  START_REVIEW: 'START_REVIEW',
  REQUEST_INFO: 'REQUEST_INFO',
  SUBMIT_INFO: 'SUBMIT_INFO',
  
  // Offer Stage
  MAKE_OFFER: 'MAKE_OFFER',
  REVISE_OFFER: 'REVISE_OFFER',
  ACCEPT_OFFER: 'ACCEPT_OFFER',
  DECLINE_OFFER: 'DECLINE_OFFER',
  
  // Inspection Stage
  ASSIGN_AGENT: 'ASSIGN_AGENT',
  REASSIGN_AGENT: 'REASSIGN_AGENT',
  START_INSPECTION: 'START_INSPECTION',
  COMPLETE_INSPECTION: 'COMPLETE_INSPECTION',
  REQUEST_RESCHEDULE: 'REQUEST_RESCHEDULE',
  APPROVE_RESCHEDULE: 'APPROVE_RESCHEDULE',
  REPORT_ISSUE: 'REPORT_ISSUE',
  APPROVE: 'APPROVE',
  
  // Documentation Stage
  SIGN_AGREEMENT: 'SIGN_AGREEMENT',
  REFUSE_SIGNATURE: 'REFUSE_SIGNATURE',
  SUBMIT_BANK_DETAILS: 'SUBMIT_BANK_DETAILS',
  
  // Disbursement Stage
  DISBURSE: 'DISBURSE',
  MARK_TRANSFER_FAILED: 'MARK_TRANSFER_FAILED',
  RETRY_TRANSFER: 'RETRY_TRANSFER',
  ACTIVATE_LOAN: 'ACTIVATE_LOAN',
  
  // Active Stage (System mostly)
  MARK_OVERDUE: 'MARK_OVERDUE',
  MARK_DEFAULTED: 'MARK_DEFAULTED',
  COMPLETE_LOAN: 'COMPLETE_LOAN',
  
  // Terminal Actions
  REJECT: 'REJECT',
  CANCEL: 'CANCEL',
  WITHDRAW: 'WITHDRAW',
  REOPEN: 'REOPEN',
} as const;
```

---

## 🔄 Migration Strategy

### Step 1: Add new columns (non-breaking)
```sql
ALTER TABLE requests ADD COLUMN stage VARCHAR(20) DEFAULT 'REVIEW';
ALTER TABLE requests ADD COLUMN sub_status VARCHAR(50);
ALTER TABLE requests ADD COLUMN requires_customer_action BOOLEAN DEFAULT false;
ALTER TABLE requests ADD COLUMN requires_admin_action BOOLEAN DEFAULT true;
ALTER TABLE requests ADD COLUMN requires_agent_action BOOLEAN DEFAULT false;
ALTER TABLE requests ADD COLUMN is_blocked BOOLEAN DEFAULT false;
ALTER TABLE requests ADD COLUMN failure_reason TEXT;
ALTER TABLE requests ADD COLUMN failure_type VARCHAR(30);
```

### Step 2: Populate new columns from old status
```typescript
const MIGRATION_MAP = {
  'PENDING': { stage: 'REVIEW', subStatus: 'PENDING', requiresAdminAction: true },
  'UNDER_REVIEW': { stage: 'REVIEW', subStatus: 'IN_REVIEW', requiresAdminAction: true },
  'MORE_INFO_REQUIRED': { stage: 'REVIEW', subStatus: 'INFO_REQUIRED', requiresCustomerAction: true },
  'OFFER_SENT': { stage: 'OFFER', subStatus: 'SENT', requiresCustomerAction: true },
  'OFFER_ACCEPTED': { stage: 'OFFER', subStatus: 'ACCEPTED', requiresAdminAction: true },
  'OFFER_DECLINED': { stage: 'OFFER', subStatus: 'DECLINED', requiresAdminAction: true },
  'OFFER_EXPIRED': { stage: 'OFFER', subStatus: 'EXPIRED', requiresAdminAction: true },
  'INSPECTION_SCHEDULED': { stage: 'INSPECTION', subStatus: 'SCHEDULED', requiresAgentAction: true },
  'INSPECTION_RESCHEDULE_REQUESTED': { stage: 'INSPECTION', subStatus: 'RESCHEDULE_REQUESTED', requiresAdminAction: true },
  'INSPECTION_IN_PROGRESS': { stage: 'INSPECTION', subStatus: 'IN_PROGRESS', requiresAgentAction: true },
  'INSPECTION_COMPLETED': { stage: 'INSPECTION', subStatus: 'COMPLETED', requiresAgentAction: true },
  'CUSTOMER_NOT_AVAILABLE': { stage: 'INSPECTION', subStatus: 'CUSTOMER_UNAVAILABLE', requiresAdminAction: true, isBlocked: true },
  'ASSET_MISMATCH': { stage: 'INSPECTION', subStatus: 'ASSET_ISSUE', requiresAdminAction: true, isBlocked: true },
  'AGENT_NOT_AVAILABLE': { stage: 'INSPECTION', subStatus: 'AGENT_UNAVAILABLE', requiresAdminAction: true },
  'APPROVED': { stage: 'DOCUMENTATION', subStatus: 'PENDING_SIGNATURE', requiresCustomerAction: true },
  'PENDING_SIGNATURE': { stage: 'DOCUMENTATION', subStatus: 'PENDING_SIGNATURE', requiresCustomerAction: true },
  'PENDING_BANK_DETAILS': { stage: 'DOCUMENTATION', subStatus: 'PENDING_BANK_DETAILS', requiresCustomerAction: true },
  'BANK_DETAILS_SUBMITTED': { stage: 'DISBURSEMENT', subStatus: 'PENDING', requiresAdminAction: true },
  'TRANSFER_FAILED': { stage: 'DISBURSEMENT', subStatus: 'FAILED', requiresCustomerAction: true, isBlocked: true },
  'AMOUNT_DISBURSED': { stage: 'DISBURSEMENT', subStatus: 'COMPLETED', requiresAdminAction: true },
  'ACTIVE': { stage: 'ACTIVE', subStatus: 'CURRENT' },
  'PAYMENT_OVERDUE': { stage: 'ACTIVE', subStatus: 'OVERDUE', requiresCustomerAction: true },
  'DEFAULTED': { stage: 'ACTIVE', subStatus: 'DEFAULTED', requiresAdminAction: true },
  'COMPLETED': { stage: 'COMPLETED', subStatus: null },
  'REJECTED': { stage: 'REJECTED', subStatus: null },
  'CANCELLED': { stage: 'CANCELLED', subStatus: null },
};
```

### Step 3: Update all code to use new fields

### Step 4: Remove old currentStatus column

---

## ✅ Checklist

### Database
- [ ] Add RequestStage enum to schema.prisma
- [ ] Add new columns to Request model
- [ ] Create and run migration
- [ ] Verify data migration script works

### Types Package (@fundifyhub/types)
- [ ] Add REQUEST_STAGE enum
- [ ] Add SUB_STATUS constants
- [ ] Add stage display config (labels, colors, icons)
- [ ] Update RequestType interface
- [ ] Add StageTransition types
- [ ] Remove old REQUEST_STATUS enum (after migration)

### Utils Package (@fundifyhub/utils)
- [ ] Rewrite workflow/config.ts for stages
- [ ] Update workflow/guards.ts
- [ ] Update workflow/engine.ts
- [ ] Simplify WORKFLOW_EVENTS
- [ ] Test all transitions

### Main Backend
- [ ] Update request controllers
- [ ] Update status change logic
- [ ] Update all queries
- [ ] Update socket emissions
- [ ] Update notification triggers

### Frontend
- [ ] Update StatusBadge component
- [ ] Update ProgressBar component
- [ ] Update RequestDetailPage
- [ ] Update request list page
- [ ] Update filters
- [ ] Update all modals
- [ ] Update dashboard stats

### Testing
- [ ] Customer complete flow
- [ ] Agent inspection flow
- [ ] Admin review flow
- [ ] Payment flow
- [ ] Edge cases (failures, reschedules)

---

## 📈 Benefits Summary

| Metric | Before (28 statuses) | After (10 stages) |
|--------|---------------------|-------------------|
| Status Values | 28 | 10 |
| Complexity | High | Low |
| UI Progress Bar | Complex mapping | Direct 1-7 |
| Adding Features | Schema migration | Just add subStatus |
| Query Performance | Slow (28 values) | Fast (indexed flags) |
| Customer UX | Confusing | Clear phases |
| Developer DX | Hard to maintain | Easy to understand |

---

## 🚀 Let's Go!

Starting implementation now. Each completed task will be marked with ✅.
