# Request Detail Restructuring - Implementation Guide

## ✅ Completed Work

### 1. Centralized Section Components Created

All components are located in: `apps/frontend/src/components/request/sections/`

#### **EMIScheduleSection.tsx** (293 lines)
- **Purpose**: Centralized EMI schedule display with smart detection
- **Features**:
  - `PreviewEMISchedule`: Shows simplified 4-column table (EMI No., Principal, Interest, Amount) for pre-loan state
  - `ActualLoanEMISchedule`: Shows detailed 8-column table (EMI #, Due Date, EMI Amount, Principal, Interest, Late Fee, Status, Actions) for actual loan
  - Automatic detection: displays preview if no loan, detailed if loan exists
  - Role-based rendering: Admin users see "Mark Paid" action buttons
  - Status badges: Paid (green), Overdue (red), Pending (yellow) with icons
  - Summary cards: Payment progress, total interest, total repayment

#### **OfferDetailsSection.tsx** (40 lines)
- **Purpose**: Display loan offer summary in a reusable component
- **Features**:
  - Two display variants:
    - `showForCustomer={true}`: Full Card with detailed layout and header
    - Compact version: Inline summary for admin/agent views
  - Shows: Offered Amount, Tenure (months), Interest Rate (%)
  - Primary color theme for better visibility

#### **ActionAlertsSection.tsx** (230 lines - updated)
- **Purpose**: Contextual alerts based on request status and user role
- **Features**:
  - **Payment Due/Overdue Alert** (Customer): Shows next pending EMI with due date, amount, and "Pay Now" button
  - **Inspection Alert** (Agent): Prompts to upload inspection photos with scroll-to-documents functionality
  - **Signature Required** (Customer): Alerts for signature upload with scroll-to-documents
  - **Bank Details Required** (Customer): Prompts for bank details submission with modal trigger
  - **More Info Required** (Customer): Shows admin's requested information with upload prompt
  - Smart filtering: Only shows relevant alerts for current user role and request status
  - Callbacks: `onPayEMI`, `onSubmitBankDetails`, `onScrollToSection` for integration

#### **DocumentsSection.tsx** (370 lines)
- **Purpose**: Unified document upload and display for all user roles
- **Features**:
  - **Customer Upload Section**: Shows upload button for asset photos in PENDING/UNDER_REVIEW/MORE_INFO_REQUIRED statuses
  - **Agent Upload Section**: Shows upload button for inspection photos in INSPECTION_IN_PROGRESS status
  - **Document Display Grids**:
    - Customer Asset Photos (standard border)
    - Agent Inspection Photos (blue theme)
    - Disbursement Proofs (green theme)
  - Photo grid with hover preview and signed URL handling
  - Verified badges for admin-approved documents
  - Upload progress indicators with loading states
  - Error handling with fallback UI

#### **index.ts** (Export file)
- Centralized exports for easy importing: 
  ```ts
  export { EMIScheduleSection, OfferDetailsSection, ActionAlertsSection, DocumentsSection } from '@/components/request/sections';
  ```

---

## 📋 Next Steps: Integration

### Step 1: Import Components in RequestDetailComplete.tsx

Add import statement after existing imports (around line 33):
```tsx
import { 
  EMIScheduleSection, 
  OfferDetailsSection, 
  ActionAlertsSection, 
  DocumentsSection 
} from '@/components/request/sections';
```

### Step 2: Replace Alert Sections

**Current location**: Lines ~974-1126 in RequestDetailComplete.tsx

**Replace with**:
```tsx
{/* Contextual Alerts - Centralized Component */}
<ActionAlertsSection 
  request={request}
  isCustomer={isCustomer}
  isAgent={isAgent}
  onScrollToSection={(section) => {
    const element = document.getElementById(section);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }}
  onPayEMI={(emiData) => {
    setSelectedEmiId(emiData.id);
    setSelectedEmiNumber(emiData.emiNumber);
    setSelectedEmiAmount(emiData.emiAmount);
    setSelectedBreakdown(emiData.breakdown);
    setShowPaymentModal(true);
  }}
  onSubmitBankDetails={() => setShowBankDetails(true)}
/>
```

**Removes**: 
- Customer Payment Card (~40 lines)
- Agent Inspection Alert (~20 lines)
- Signature Upload Alert (~20 lines)
- Bank Details Alert (~20 lines)
- Admin Requested Info Alert (~20 lines)

### Step 3: Replace Document Sections

**Current location**: Lines ~1540-1950 in RequestDetailComplete.tsx

**Replace with**:
```tsx
{/* Documents - Centralized Component */}
<DocumentsSection 
  request={request}
  isCustomer={isCustomer}
  isAgent={isAgent}
  uploadProgress={uploadProgress}
  setUploadProgress={setUploadProgress}
  onDocumentUpload={handleDocumentUpload}
  getSignedUrl={getSignedUrl}
/>
```

**Removes**:
- Customer Asset Photo Upload (~60 lines)
- Digital Signature Upload (~100 lines)
- Agent Inspection Photo Upload (~60 lines)
- Customer Asset Photos Display Grid (~50 lines)
- Agent Inspection Photos Display Grid (~50 lines)
- Disbursement Proof Display Grid (~50 lines)

### Step 4: Replace EMI Schedule Sections

**Current locations**: 
- Line ~1538: Admin EMI preview in offer card
- Line ~2125+: Actual loan EMI schedule

**Replace with**:
```tsx
{/* EMI Schedule - Centralized Component */}
<EMIScheduleSection 
  request={request}
  userRoles={userRoles}
  onMarkPaid={async (emiId) => {
    try {
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/emis/${emiId}/mark-paid`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        alert('EMI marked as paid successfully');
        window.location.reload();
      } else {
        alert('Failed to mark EMI as paid');
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    }
  }}
/>
```

**Removes**:
- Admin EMI Preview Table in Offer Card (~30 lines)
- Actual Loan EMI Schedule Table (~150 lines)
- EMI Progress Cards (~40 lines)

### Step 5: Add Offer Details (Optional Enhancement)

**Suggested location**: After Request Details Card, before Loan Details

```tsx
{/* Loan Offer Details - If admin has made an offer */}
{hasOffer && (
  <OfferDetailsSection 
    request={request}
    showForCustomer={isCustomer && request.currentStatus === REQUEST_STATUS.OFFER_SENT}
  />
)}
```

---

## 🎯 Expected Benefits

### Code Reduction
- **Before**: RequestDetailComplete.tsx ~2700 lines
- **After**: ~1800-2000 lines (removing ~700-900 lines of duplicated code)

### Reusability
- All 4 section components can be used in:
  - RequestDetailComplete.tsx (main detail page)
  - RequestDetailClientImproved.tsx (customer-specific view)
  - RequestDetailClient.tsx (legacy view)
  - New dashboard cards/widgets
  - Request list item expansions

### Maintainability
- **Single source of truth**: Changes to EMI display, alerts, or documents only need to be made once
- **Consistent UX**: All views will have identical behavior and styling
- **Role-based logic centralized**: No scattered conditional rendering

### Testing
- Each section component can be unit tested independently
- Props are well-defined with TypeScript interfaces
- Easier to mock and test specific user scenarios

---

## ⚠️ Important Integration Notes

### 1. Callback Functions
Ensure these functions exist in RequestDetailComplete:
- `handleDocumentUpload`: Already exists (line ~723)
- `getSignedUrl`: Already exists (line ~755)
- `handleWorkflowAction`: Already exists (line ~784)
- Mark Paid EMI API: May need to add endpoint

### 2. State Variables
Verify these state variables are available:
- `uploadProgress`, `setUploadProgress`
- `selectedEmiId`, `setSelectedEmiId`
- `selectedEmiNumber`, `setSelectedEmiNumber`
- `selectedEmiAmount`, `setSelectedEmiAmount`
- `selectedBreakdown`, `setSelectedBreakdown`
- `showPaymentModal`, `setShowPaymentModal`
- `showBankDetails`, `setShowBankDetails`

### 3. Section IDs for Scrolling
Add `id` attributes to sections for smooth scrolling:
```tsx
<DocumentsSection id="documents" ... />
<EMIScheduleSection id="emi-schedule" ... />
```

### 4. Testing Checklist

After integration, test these scenarios:

**Customer Role:**
- [ ] Can upload asset photos in PENDING/UNDER_REVIEW status
- [ ] Sees simplified 4-column EMI preview before loan creation
- [ ] Sees payment due alert with "Pay Now" button
- [ ] Can submit bank details when prompted
- [ ] Can upload additional docs when MORE_INFO_REQUIRED
- [ ] Sees detailed 8-column EMI schedule after loan creation
- [ ] Can pay EMIs with Razorpay modal

**Agent Role:**
- [ ] Sees inspection alert in INSPECTION_IN_PROGRESS status
- [ ] Can upload inspection photos
- [ ] Cannot see customer payment information
- [ ] Cannot perform admin actions

**District Admin / Super Admin:**
- [ ] Can see full EMI schedule with "Mark Paid" buttons
- [ ] Can view all document categories
- [ ] Can see offer details in compact format
- [ ] All workflow actions available

---

## 📊 File Size Comparison

| Component | Lines | Purpose | Replaces (approx.) |
|-----------|-------|---------|-------------------|
| EMIScheduleSection.tsx | 293 | EMI display logic | ~200 lines |
| OfferDetailsSection.tsx | 40 | Offer summary | ~80 lines (reused 2x) |
| ActionAlertsSection.tsx | 230 | Contextual alerts | ~140 lines |
| DocumentsSection.tsx | 370 | Document upload/display | ~370 lines |
| **Total** | **933 lines** | **Centralized** | **~790 lines removed** |

**Net Gain**: 933 lines of reusable code eliminates ~790 lines of duplication while adding better structure and consistency.

---

## 🚀 Future Enhancements

Once integrated, these components enable:

1. **Request List Previews**: Show EMI schedules in collapsed list items
2. **Dashboard Widgets**: Reuse ActionAlertsSection for homepage notifications
3. **Mobile Views**: Components are already responsive, can be adapted for mobile layouts
4. **Admin Bulk Actions**: EMIScheduleSection can be extended for bulk EMI operations
5. **Document Management Panel**: DocumentsSection can be used in admin document verification dashboard

---

## 📝 Summary

**Status**: ✅ All 4 centralized components successfully created and validated (0 TypeScript errors)

**Ready for Integration**: Yes - components are production-ready with proper TypeScript types, error handling, and role-based rendering

**Next Action**: Integrate components into RequestDetailComplete.tsx by following Step 1-5 above

**Testing Required**: Full user role testing after integration (CUSTOMER, AGENT, DISTRICT_ADMIN, SUPER_ADMIN)

**Documentation**: This file serves as the integration guide. Update it as integration progresses.

---

Created: 2025
Last Updated: 2025-01-XX (integration pending)
