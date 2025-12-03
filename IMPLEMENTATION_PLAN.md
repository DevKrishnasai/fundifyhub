# FundifyHub Real-Time & Notifications Implementation Plan

> **📌 Note:** This document focuses specifically on real-time and notification features.  
> **For the complete architecture improvement plan, see:** [ARCHITECTURE_IMPROVEMENT_PLAN.md](./ARCHITECTURE_IMPROVEMENT_PLAN.md)

## Overview
This document outlines the implementation plan for making the application fully real-time with comprehensive notifications, audit logging, and enhanced user experience.

---

## 🎯 Phase 1: Real-Time Data Synchronization (Priority: HIGH)

### 1.1 Backend Socket Emissions - Request Actions
**Goal:** Emit socket events for ALL request state changes

#### Missing Socket Emissions to Add:
- [x] ✅ Already implemented: `assignAgentController`
- [x] ✅ Already implemented: `selfAssignAdminController` 
- [x] ✅ Already implemented: `assignAdminController`
- [ ] `createOfferController` - when admin creates/updates offer
- [ ] `confirmOfferController` - when customer accepts/rejects offer
- [ ] `updateBankDetailsController` - when bank details are updated
- [ ] `generateAgreementController` - when agreement is generated
- [ ] `signAgreementController` - when customer signs agreement
- [ ] `uploadSignedAgreementController` - when signed agreement is uploaded
- [ ] `completeInspectionController` - when agent completes inspection
- [ ] `createLoanController` - when loan is created and disbursed
- [ ] `addCommentController` - when comment is added (already partially implemented)
- [ ] `addDocumentController` - when document is uploaded (already partially implemented)

**Files to Update:**
- `apps/main-backend/src/api/requests/controllers.ts` - Add socket emissions to each controller
- `apps/main-backend/src/utils/socket-client.ts` - Ensure all event types are covered

### 1.2 Frontend Socket Listeners - Request Detail Page
**Goal:** Listen to socket events and update UI in real-time

#### Listeners to Implement:
- [ ] `request:updated` - Generic update handler for any field change
- [ ] `request:status_changed` - Status transitions (show banner/toast)
- [ ] `request:comment_added` - New comment added (append to list, scroll to bottom)
- [ ] `request:document_uploaded` - New document uploaded (refresh documents section)
- [ ] `request:offer_created` - New offer available (refresh offer section)
- [ ] `request:offer_confirmed` - Offer accepted/rejected (refresh status)
- [ ] `request:agent_assigned` - Agent assigned (refresh people sidebar)
- [ ] `request:admin_assigned` - Admin assigned (refresh people sidebar)
- [ ] `request:inspection_completed` - Inspection done (refresh inspection section)
- [ ] `request:loan_created` - Loan created (refresh loan section, show celebration)
- [ ] `request:bank_details_updated` - Bank details changed (refresh section)
- [ ] `request:agreement_generated` - Agreement ready (refresh signature section)

**Files to Create/Update:**
- `apps/frontend/src/components/request/hooks/useRequestRealtime.ts` - Custom hook for socket listeners
- `apps/frontend/src/components/request/RequestDetailPage.tsx` - Integrate real-time hook
- `apps/frontend/src/components/request/context/RequestContext.tsx` - Add socket-based refresh logic

### 1.3 Global Real-Time Updates
**Goal:** Update lists and dashboards in real-time

#### Components to Make Real-Time:
- [ ] **Request List Page** (`apps/frontend/src/app/requests/page.tsx`)
  - Listen to `request:status_changed` for any request in the list
  - Update status badge without refresh
  - Show live indicator when changes happen

- [ ] **Dashboard Page** (`apps/frontend/src/app/dashboard/page.tsx`)
  - Listen to role-based events (e.g., `admin:new_request`)
  - Update stats in real-time (active loans, pending requests, etc.)
  - Show notification toast for new requests

- [ ] **Admin Dashboard** (if different from customer dashboard)
  - Real-time request counts
  - Real-time payment notifications
  - Real-time overdue EMI alerts

**Files to Update:**
- `apps/frontend/src/app/requests/page.tsx`
- `apps/frontend/src/app/dashboard/page.tsx`
- `apps/frontend/src/hooks/useDashboardStats.ts` - Add socket listeners

---

## 🔔 Phase 2: Comprehensive Notification System (Priority: HIGH)

### 2.1 Backend Notification Triggers
**Goal:** Send notifications for ALL important actions

#### Notification Triggers to Implement:

**Request Lifecycle:**
- [ ] Request created (notify admins in district)
- [ ] Agent assigned (notify agent and customer)
- [ ] Admin assigned (notify admin and customer)
- [ ] Offer created (notify customer - HIGH PRIORITY with sound)
- [ ] Offer accepted (notify admin)
- [ ] Offer rejected (notify admin)
- [ ] Inspection scheduled (notify customer and agent)
- [ ] Inspection completed (notify customer and admin)
- [ ] Agreement generated (notify customer - HIGH PRIORITY)
- [ ] Agreement signed (notify admin)
- [ ] Loan approved (notify customer - HIGH PRIORITY with celebration)
- [ ] Loan disbursed (notify customer - HIGH PRIORITY with sound)
- [ ] Request rejected (notify customer - HIGH PRIORITY)
- [ ] Request cancelled (notify all parties)
- [ ] Bank details required (notify customer)
- [ ] Document required (notify customer)

**Loan & Payment:**
- [ ] EMI reminder (3 days before due date - notify customer)
- [ ] EMI due today (notify customer - HIGH PRIORITY with sound)
- [ ] EMI overdue (notify customer daily - HIGH PRIORITY with sound)
- [ ] Payment received (notify customer, update admin)
- [ ] Payment failed (notify customer - HIGH PRIORITY)
- [ ] Late fee applied (notify customer)
- [ ] Loan fully repaid (notify customer - celebration notification)

**Communication:**
- [ ] New comment on request (notify involved parties, exclude author)
- [ ] Internal comment added (notify admins/agents only)
- [ ] Document uploaded (notify relevant parties)
- [ ] Document verified (notify customer)
- [ ] Document rejected (notify customer with reason)

**Files to Update:**
- `apps/main-backend/src/utils/notifications.ts` - Add notification trigger functions
- `apps/main-backend/src/api/requests/controllers.ts` - Call notification functions after each action
- `packages/utils/src/enqueue.ts` - Add job types if needed

### 2.2 Frontend Notification UI Components

#### 2.2.1 Notification Badge (Header)
**Goal:** Show unread count in real-time

**Features:**
- [ ] Display unread count badge in header/navbar
- [ ] Update count via socket event `notification:count`
- [ ] Pulse animation when new notification arrives
- [ ] Click to open notification dropdown or navigate to notification center

**Files to Create/Update:**
- `apps/frontend/src/components/layout/NotificationBadge.tsx` - Badge component
- `apps/frontend/src/components/layout/AppLayout.tsx` - Integrate badge

#### 2.2.2 Banner Notifications (High Priority Actions)
**Goal:** Show prominent banner/toast for critical actions with sound

**Features:**
- [ ] Banner appears at top of screen for HIGH PRIORITY notifications
- [ ] Different styles: Success (green), Warning (yellow), Error (red), Info (blue)
- [ ] Sound alert (configurable in settings)
- [ ] Action buttons (e.g., "View Request", "Pay Now", "Dismiss")
- [ ] Auto-dismiss after 10 seconds (unless pinned)
- [ ] Can be dismissed manually

**Sound Alerts for:**
- Offer created
- Agreement ready
- Loan approved
- Loan disbursed
- EMI due today
- EMI overdue
- Payment failed

**Files to Create:**
- `apps/frontend/src/components/notifications/BannerNotification.tsx` - Banner component
- `apps/frontend/src/components/notifications/NotificationSound.tsx` - Sound player
- `apps/frontend/src/hooks/useNotificationSound.ts` - Hook for playing sounds
- `public/sounds/notification.mp3` - Default notification sound
- `public/sounds/success.mp3` - Success sound
- `public/sounds/warning.mp3` - Warning sound

#### 2.2.3 Notification Center Page
**Goal:** Comprehensive notification management page

**Features:**
- [ ] **List View:** All notifications with pagination
- [ ] **Filters:** 
  - All / Unread / Read
  - By type: Request, Loan, Payment, System
  - Date range picker
- [ ] **Actions:**
  - Mark individual notification as read
  - Mark all as read
  - Delete individual notification
  - Delete all notifications (with confirmation)
- [ ] **Display:**
  - Icon based on notification type
  - Timestamp (relative: "5 minutes ago" or absolute)
  - Preview of notification content
  - Action button to navigate to related entity
  - Visual distinction for unread (bold, different background)
- [ ] **Infinite Scroll or Pagination:** Load more as user scrolls

**API Endpoints Needed:**
- ✅ Already exists: `GET /api/v1/notifications` - List notifications
- ✅ Already exists: `GET /api/v1/notifications/unread-count` - Get count
- ✅ Already exists: `POST /api/v1/notifications/:id/read` - Mark as read
- ✅ Already exists: `POST /api/v1/notifications/read-all` - Mark all as read
- ✅ Already exists: `DELETE /api/v1/notifications/:id` - Delete notification
- [ ] TO ADD: `DELETE /api/v1/notifications/all` - Delete all notifications (with confirmation)

**Files to Create:**
- `apps/frontend/src/app/notifications/page.tsx` - Main notification center page (already exists, needs enhancement)
- `apps/frontend/src/components/notifications/NotificationList.tsx` - List component
- `apps/frontend/src/components/notifications/NotificationItem.tsx` - Individual notification
- `apps/frontend/src/components/notifications/NotificationFilters.tsx` - Filter controls
- `apps/frontend/src/hooks/useNotifications.ts` - Hook for notification data

**Files to Update:**
- `apps/main-backend/src/api/notifications/controllers.ts` - Add delete all endpoint
- `apps/main-backend/src/api/notifications/routes.ts` - Add route

### 2.3 Real-Time Notification Delivery
**Goal:** Instant notification updates via WebSocket

**Socket Events:**
- [x] ✅ Already handled in `SocketContext`: `notification:new` - New notification arrives
- [ ] `notification:count` - Unread count updated
- [ ] `notification:marked_read` - Notification marked as read (sync across tabs)
- [ ] `notification:deleted` - Notification deleted (sync across tabs)

**Files to Update:**
- `apps/live-sockets/src/index.ts` - Emit count updates when notifications change
- `apps/frontend/src/contexts/SocketContext.tsx` - Add count update listener
- `apps/frontend/src/hooks/useNotifications.ts` - Subscribe to socket events

---

## 📋 Phase 3: Comprehensive Audit Logging (Priority: MEDIUM)

### 3.1 Audit Log Coverage
**Goal:** Log ALL actions performed on requests

#### Actions to Audit:

**Request Management:**
- [x] ✅ Already logged: Request created
- [x] ✅ Already logged: Request status changed
- [x] ✅ Already logged: Agent assigned
- [x] ✅ Already logged: Admin assigned
- [ ] Request updated (any field change)
- [ ] Request cancelled
- [ ] Request rejected with reason
- [ ] Request reopened

**Offer Management:**
- [x] ✅ Already logged: Offer created
- [x] ✅ Already logged: Offer updated
- [ ] Offer viewed by customer
- [ ] Offer accepted by customer
- [ ] Offer rejected by customer
- [ ] Offer expired

**Inspection:**
- [x] ✅ Already logged: Inspection assigned
- [x] ✅ Already logged: Inspection completed
- [ ] Inspection rescheduled
- [ ] Inspection notes added
- [ ] Inspection photos uploaded

**Documents:**
- [ ] Document uploaded (with type and uploader)
- [ ] Document viewed
- [ ] Document verified
- [ ] Document rejected with reason
- [ ] Document deleted

**Loan:**
- [ ] Loan created
- [ ] Loan approved
- [ ] Loan disbursed
- [ ] Loan terms modified
- [ ] Loan closed (fully repaid)
- [ ] Loan defaulted

**Bank Details:**
- [ ] Bank details added
- [ ] Bank details updated
- [ ] Bank details verified

**Agreement:**
- [ ] Agreement generated
- [ ] Agreement downloaded by customer
- [ ] Agreement signed by customer
- [ ] Agreement uploaded

**Communication:**
- [ ] Comment added (with content preview)
- [ ] Internal comment added
- [ ] Comment deleted
- [ ] Comments enabled/disabled

**Payment:**
- [ ] Payment initiated
- [ ] Payment successful
- [ ] Payment failed
- [ ] Refund initiated
- [ ] Refund completed

**Files to Update:**
- `apps/main-backend/src/utils/audit.ts` - Add helper functions for each action
- `apps/main-backend/src/api/requests/controllers.ts` - Add audit calls to all controllers
- `apps/main-backend/src/api/documents/controllers.ts` - Add audit calls
- `apps/main-backend/src/api/payments/controllers.ts` - Add audit calls

### 3.2 Audit Log Display in Request Detail
**Goal:** Show complete audit trail in request timeline

**Features:**
- [ ] Timeline component showing all actions chronologically
- [ ] Group actions by date
- [ ] Show actor (who performed the action)
- [ ] Show timestamp (relative + absolute on hover)
- [ ] Show action details (e.g., "Status changed from PENDING to UNDER_REVIEW")
- [ ] Show before/after values for updates
- [ ] Expandable details for complex actions
- [ ] Filter by action type
- [ ] Filter by actor
- [ ] Export audit log as PDF/CSV

**Files to Create/Update:**
- `apps/frontend/src/components/request/sidebar/TimelineSidebar.tsx` - Already exists, enhance with full audit data
- `apps/frontend/src/components/request/timeline/AuditLogItem.tsx` - Individual audit entry
- `apps/frontend/src/components/request/timeline/AuditLogFilters.tsx` - Filter controls

### 3.3 Admin Audit Log Dashboard
**Goal:** System-wide audit log viewer for admins

**Features:**
- [ ] **Search/Filter:**
  - By entity type (Request, Loan, Payment, User)
  - By action type
  - By actor (user who performed action)
  - By entity ID (specific request, loan, etc.)
  - Date range
- [ ] **Export:** CSV/Excel export for compliance
- [ ] **Pagination:** Efficient loading of large datasets
- [ ] **Details Modal:** Click on audit entry to see full details

**Files to Update:**
- `apps/frontend/src/app/audit-logs/page.tsx` - Already exists, needs enhancement
- Backend controllers already exist at `apps/main-backend/src/api/admin/audit-logs/`

---

## 🔧 Phase 4: Implementation Details & Best Practices

### 4.1 Socket Event Naming Convention
Use consistent event names:

**Server → Client:**
- `request:updated` - Generic update
- `request:status_changed` - Status transition
- `request:offer_created` - Specific action
- `notification:new` - New notification
- `notification:count` - Count update

**Client → Server:**
- `join:request` - Join request room
- `leave:request` - Leave request room

### 4.2 Notification Priority Levels
Define clear priority levels:

```typescript
enum NotificationPriority {
  LOW = 'low',        // Info, no urgency (e.g., comment added)
  MEDIUM = 'medium',  // Important but not urgent (e.g., agent assigned)
  HIGH = 'high',      // Urgent, requires attention (e.g., offer created, EMI due)
  CRITICAL = 'critical' // Immediate action needed (e.g., payment failed, EMI overdue)
}
```

**Sound alerts only for HIGH and CRITICAL priorities.**

### 4.3 Real-Time Update Strategy
**Optimistic Updates:**
- For user-initiated actions, update UI immediately (optimistic)
- If server confirms, keep the update
- If server rejects, revert and show error

**Server Updates:**
- For actions by other users, show toast/banner notification
- Refresh relevant data section automatically
- Highlight what changed (flash animation)

### 4.4 Performance Considerations
**Socket Connection:**
- [x] ✅ Already implemented: Reconnection logic with exponential backoff
- [x] ✅ Already implemented: Fallback to polling if socket fails
- [ ] Throttle rapid updates (debounce refresh calls)
- [ ] Batch multiple updates if they arrive within 1 second

**Notification Loading:**
- [ ] Implement virtual scrolling for large notification lists
- [ ] Lazy load notification details on expand
- [ ] Cache notification data in IndexedDB for offline access

**Audit Logging:**
- [x] ✅ Already implemented: Async audit logging (doesn't block main operations)
- [ ] Batch audit writes if performance is an issue
- [ ] Archive old audit logs (older than 1 year) to separate table

---

## 🧪 Phase 5: Testing Checklist

### 5.1 Real-Time Functionality
- [ ] Test socket connection/reconnection
- [ ] Test fallback to polling when socket is down
- [ ] Test simultaneous updates from multiple users
- [ ] Test updates across multiple browser tabs (same user)
- [ ] Test real-time updates on slow network (3G simulation)

### 5.2 Notifications
- [ ] Test notification delivery for all actions
- [ ] Test notification sound playback
- [ ] Test notification badge count accuracy
- [ ] Test notification center filters
- [ ] Test mark as read/unread functionality
- [ ] Test delete functionality
- [ ] Test notification persistence after page refresh

### 5.3 Audit Logging
- [ ] Test audit log creation for all actions
- [ ] Test audit log accuracy (before/after values)
- [ ] Test audit log filtering and search
- [ ] Test audit log export functionality
- [ ] Test audit log performance with large datasets

---

## 📊 Phase 6: Monitoring & Observability

### 6.1 Metrics to Track
- [ ] WebSocket connection success rate
- [ ] Average notification delivery time
- [ ] Notification open rate
- [ ] Notification action click-through rate
- [ ] Audit log write failures
- [ ] Real-time update latency

### 6.2 Logging
- [ ] Log all socket connection events
- [ ] Log notification sending success/failure
- [ ] Log audit log write failures
- [ ] Log user actions (for analytics)

---

## 🚀 Implementation Priority Order

### Sprint 1 (Week 1): Foundation
1. ✅ Socket connection infrastructure (already done)
2. Add missing socket emissions in backend controllers
3. Implement basic real-time listeners in RequestDetailPage
4. Test real-time updates for request status changes

### Sprint 2 (Week 2): Notifications - Part 1
1. Implement notification badge with real-time count
2. Add notification triggers for request lifecycle events
3. Implement banner notifications with sound alerts
4. Test notification delivery and display

### Sprint 3 (Week 3): Notifications - Part 2
1. Enhance notification center page with filters
2. Implement mark as read/delete functionality
3. Add pagination and infinite scroll
4. Test notification management

### Sprint 4 (Week 4): Audit Logging
1. Add audit logging to all missing actions
2. Enhance timeline sidebar with full audit data
3. Test audit log accuracy and completeness

### Sprint 5 (Week 5): Polish & Testing
1. Add real-time updates to request list and dashboard
2. Performance optimization (debouncing, caching)
3. Comprehensive testing across all features
4. Bug fixes and refinements

---

## 📝 Notes

**Existing Infrastructure:**
- ✅ Socket.IO server running at `apps/live-sockets/src/index.ts`
- ✅ Socket client for backend at `apps/main-backend/src/utils/socket-client.ts`
- ✅ Frontend SocketContext at `apps/frontend/src/contexts/SocketContext.tsx`
- ✅ Audit logging infrastructure at `apps/main-backend/src/utils/audit.ts`
- ✅ Notification API endpoints exist
- ✅ In-app notification database model exists

**What's Missing:**
- Socket emissions for many request actions
- Frontend socket listeners for real-time updates
- Notification triggers for all important actions
- Enhanced notification center UI
- Banner notification component with sounds
- Comprehensive audit logging for all actions
- Real-time updates on list/dashboard pages

---

## 🎉 Success Criteria

1. **Real-Time:** All request changes reflect immediately without page refresh
2. **Notifications:** Users receive instant notifications for all important actions
3. **Audit:** Complete audit trail visible for every request action
4. **Performance:** No noticeable lag or degradation
5. **Reliability:** Graceful fallback when real-time features fail
6. **User Experience:** Intuitive, non-intrusive notifications with clear actions

---

**Last Updated:** December 3, 2025
**Status:** Planning Phase - Ready for Implementation
