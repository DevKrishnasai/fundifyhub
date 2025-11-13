/**
 * Request Action Handlers
 * 
 * Centralized handlers for all request workflow actions.
 * Maps action IDs to their respective API calls.
 */

import { REQUEST_STATUS } from '@fundifyhub/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface ActionHandlerContext {
  requestId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface ActionInput {
  // For offers
  amount?: number;
  tenureMonths?: number;
  interestRate?: number;
  
  // For agent assignment
  agentId?: string;
  
  // For generic comments/notes
  notes?: string;
  reason?: string;
  
  // For bank details
  upiId?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  
  // For transfer proof
  transactionId?: string;
  transferProof?: string;
}

/**
 * Execute a request action
 */
export async function executeRequestAction(
  actionId: string,
  context: ActionHandlerContext,
  input?: ActionInput
): Promise<boolean> {
  const { requestId, onSuccess, onError } = context;

  try {
    switch (actionId) {
      // ==========================================
      // ADMIN ACTIONS
      // ==========================================
      
      case 'start-review':
        return await updateStatus(requestId, REQUEST_STATUS.UNDER_REVIEW, onSuccess, onError);
      
      case 'make-offer':
      case 'revise-offer':
        if (!input?.amount || !input?.tenureMonths || !input?.interestRate) {
          onError?.('Missing offer details');
          return false;
        }
        return await createOffer(requestId, input, onSuccess, onError);
      
      case 'request-more-info':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.MORE_INFO_REQUIRED, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case 'assign-agent':
        if (!input?.agentId) {
          onError?.('Please select an agent');
          return false;
        }
        return await assignAgent(requestId, input.agentId, onSuccess, onError);
      
      case 'reassign-agent':
        if (!input?.agentId) {
          onError?.('Please select an agent');
          return false;
        }
        return await assignAgent(requestId, input.agentId, onSuccess, onError);
      
      case 'reject':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.REJECTED, 
          onSuccess, 
          onError,
          input?.reason || 'Request rejected by admin'
        );
      
      case 'resume-review':
      case 'resume':
        return await updateStatus(requestId, REQUEST_STATUS.UNDER_REVIEW, onSuccess, onError);
      
      case 'cancel':
      case 'cancel-offer':
      case 'close-request':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.CANCELLED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case 'resend-offer':
        return await updateStatus(requestId, REQUEST_STATUS.OFFER_SENT, onSuccess, onError);
      
      case 'make-new-offer':
        if (!input?.amount || !input?.tenureMonths || !input?.interestRate) {
          onError?.('Missing offer details');
          return false;
        }
        return await createOffer(requestId, input, onSuccess, onError);
      
      case 'disburse-amount':
        // Admin creates loan record and disburses amount in single step
        return await updateStatus(requestId, REQUEST_STATUS.AMOUNT_DISBURSED, onSuccess, onError);
      
      case 'request-different-details':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.PENDING_BANK_DETAILS, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case 'transfer-failed':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.TRANSFER_FAILED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case 'create-emi-schedule':
        // Step 1: Create Loan + EMI Schedule records
        try {
          console.log('🎯 Creating loan for request:', requestId);
          
          const createLoanRes = await fetch(`${API_BASE}/api/v1/requests/${requestId}/create-loan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          console.log('📡 Create loan response status:', createLoanRes.status);

          if (!createLoanRes.ok) {
            const errorData = await createLoanRes.json();
            console.error('❌ Failed to create loan:', errorData);
            if (onError) onError(errorData.message || 'Failed to create loan');
            return false;
          }

          const loanData = await createLoanRes.json();
          console.log('✅ Loan created successfully:', loanData);

          // Step 2: Update status to ACTIVE
          console.log('🔄 Updating status to ACTIVE...');
          const result = await updateStatus(requestId, REQUEST_STATUS.ACTIVE, onSuccess, onError);
          console.log('✅ Status update result:', result);
          return result;
        } catch (error) {
          console.error('💥 Error in create-emi-schedule:', error);
          if (onError) onError('Failed to create loan and EMI schedule');
          return false;
        }
      
      case 'mark-overdue':
        return await updateStatus(requestId, REQUEST_STATUS.PAYMENT_OVERDUE, onSuccess, onError);
      
      case 'mark-completed':
        return await updateStatus(requestId, REQUEST_STATUS.COMPLETED, onSuccess, onError);
      
      case 'mark-paid':
        return await updateStatus(requestId, REQUEST_STATUS.ACTIVE, onSuccess, onError, input?.notes);
      
      case 'mark-defaulted':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.DEFAULTED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case 'mark-settled':
        return await updateStatus(requestId, REQUEST_STATUS.COMPLETED, onSuccess, onError);
      
      case 'reopen':
        return await updateStatus(requestId, REQUEST_STATUS.UNDER_REVIEW, onSuccess, onError);
      
      // ==========================================
      // CUSTOMER ACTIONS
      // ==========================================
      
      case 'accept-offer':
        return await updateStatus(requestId, REQUEST_STATUS.OFFER_ACCEPTED, onSuccess, onError);
      
      case 'decline-offer':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.OFFER_DECLINED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case 'submit-info':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.PENDING, 
          onSuccess, 
          onError,
          'Customer submitted additional information'
        );
      
      case 'withdraw-request':
      case 'withdraw':
      case 'refuse-signature':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.CANCELLED, 
          onSuccess, 
          onError,
          input?.reason || 'Cancelled by customer'
        );
      
      case 'request-reschedule':
      case 'reschedule':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.INSPECTION_SCHEDULED, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case 'sign-agreement':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.PENDING_BANK_DETAILS, 
          onSuccess, 
          onError,
          'Customer signed agreement'
        );
      
      case 'submit-bank-details':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.BANK_DETAILS_SUBMITTED, 
          onSuccess, 
          onError,
          'Bank details submitted'
        );
      
      case 'update-bank-details':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.BANK_DETAILS_SUBMITTED, 
          onSuccess, 
          onError,
          'Updated bank details'
        );
      
      case 'provide-explanation':
        // Just add a comment, don't change status
        onError?.('Comment functionality not yet implemented');
        return false;
      
      case 'request-resume':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.UNDER_REVIEW, 
          onSuccess, 
          onError,
          'Customer requested resume'
        );
      
      // ==========================================
      // AGENT ACTIONS
      // ==========================================
      
      case 'start-inspection':
        return await updateStatus(requestId, REQUEST_STATUS.INSPECTION_IN_PROGRESS, onSuccess, onError);
      
      case 'complete-inspection':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.INSPECTION_COMPLETED, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case 'customer-not-available':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE, 
          onSuccess, 
          onError,
          input?.notes || 'Customer not available at scheduled time'
        );
      
      case 'asset-mismatch':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.ASSET_MISMATCH, 
          onSuccess, 
          onError,
          input?.notes || 'Asset does not match description'
        );
      
      case 'cancel-agent':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.AGENT_NOT_AVAILABLE, 
          onSuccess, 
          onError,
          "Agent can't make the scheduled inspection"
        );
      
      case 'approve':
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.APPROVED, 
          onSuccess, 
          onError,
          'Approved by agent after inspection'
        );
      
      case 'reschedule-inspection':
        return await updateStatus(requestId, REQUEST_STATUS.INSPECTION_SCHEDULED, onSuccess, onError);
      
      default:
        onError?.(`Unknown action: ${actionId}`);
        return false;
    }
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Network error');
    return false;
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function updateStatus(
  requestId: string,
  status: REQUEST_STATUS,
  onSuccess?: (data: any) => void,
  onError?: (error: string) => void,
  notes?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/requests/${requestId}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Fetch full request to get updated history
      const fullRequest = await fetchFullRequest(requestId);
      onSuccess?.(fullRequest || data.data?.request);
      return true;
    } else {
      onError?.(data.message || 'Failed to update status');
      return false;
    }
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Network error');
    return false;
  }
}

async function createOffer(
  requestId: string,
  offer: ActionInput,
  onSuccess?: (data: any) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/requests/${requestId}/offer`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: offer.amount,
        tenureMonths: offer.tenureMonths,
        interestRate: offer.interestRate
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      onSuccess?.(data.data?.request);
      return true;
    } else {
      onError?.(data.message || 'Failed to create offer');
      return false;
    }
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Network error');
    return false;
  }
}

async function assignAgent(
  requestId: string,
  agentId: string,
  onSuccess?: (data: any) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/requests/${requestId}/assign`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      onSuccess?.(data.data?.request);
      return true;
    } else {
      onError?.(data.message || 'Failed to assign agent');
      return false;
    }
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Network error');
    return false;
  }
}

async function fetchFullRequest(requestId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/requests/${requestId}`, {
      credentials: 'include'
    });
    const data = await res.json();
    return res.ok ? data.data?.request : null;
  } catch {
    return null;
  }
}
