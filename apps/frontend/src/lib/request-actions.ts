/**
 * Request Action Handlers
 * 
 * Centralized handlers for all request workflow actions.
 * Maps action IDs to their respective API calls.
 */

import { REQUEST_STATUS, WORKFLOW_EVENTS, RequestType } from '@fundifyhub/types';
import { postWithResult, getWithResult } from './api-client';

export interface ActionHandlerContext {
  requestId: string;
  onSuccess?: (data: RequestType) => void;
  onError?: (error: string) => void;
}

export interface ActionInput {
  // For offers
  amount?: number;
  tenureMonths?: number;
  interestRate?: number;
  penaltyPercentage?: number;
  lateFeePercentage?: number;
  processingFee?: number;
  
  // For agent assignment
  agentId?: string;
  // date-only string in YYYY-MM-DD format
  inspectionDate?: string;
  
  // For admin assignment
  adminId?: string;
  
  // For generic comments/notes
  notes?: string;
  reason?: string;
  isInternal?: boolean;
  
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
      
      case WORKFLOW_EVENTS.ADD_COMMENT:
        if (!input?.notes) {
          onError?.('Comment cannot be empty');
          return false;
        }
        return await addComment(requestId, input.notes, input.isInternal || false, onSuccess, onError);

      case WORKFLOW_EVENTS.TOGGLE_COMMENTS:
        return await updateRequestSettings(
          requestId, 
          { commentsEnabled: input?.notes === 'enable' }, 
          onSuccess, 
          onError
        );

      case WORKFLOW_EVENTS.START_REVIEW:
        return await updateStatus(requestId, REQUEST_STATUS.UNDER_REVIEW, onSuccess, onError);
      
      case WORKFLOW_EVENTS.MAKE_OFFER:
      case WORKFLOW_EVENTS.REVISE_OFFER:
        if (!input?.amount || !input?.tenureMonths || !input?.interestRate) {
          onError?.('Missing offer details');
          return false;
        }
        return await createOffer(requestId, input, onSuccess, onError);
      
      case WORKFLOW_EVENTS.REQUEST_MORE_INFO:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.MORE_INFO_REQUIRED, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case WORKFLOW_EVENTS.ASSIGN_AGENT:
        if (!input?.agentId) {
          onError?.('Please select an agent');
          return false;
        }
        return await assignAgent(requestId, input.agentId, input.inspectionDate, onSuccess, onError);
      
      case WORKFLOW_EVENTS.REASSIGN_AGENT:
        if (!input?.agentId) {
          onError?.('Please select an agent');
          return false;
        }
        return await assignAgent(requestId, input.agentId, input.inspectionDate, onSuccess, onError);
      
      case WORKFLOW_EVENTS.SELF_ASSIGN_ADMIN:
        return await selfAssignAdmin(requestId, onSuccess, onError);
      
      case WORKFLOW_EVENTS.ASSIGN_ADMIN:
        if (!input?.adminId) {
          onError?.('Please select an admin');
          return false;
        }
        return await assignAdmin(requestId, input.adminId, onSuccess, onError);
      
      case WORKFLOW_EVENTS.REJECT:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.REJECTED, 
          onSuccess, 
          onError,
          input?.reason || 'Request rejected by admin'
        );
      
      case WORKFLOW_EVENTS.RESUME_REVIEW:
        return await updateStatus(requestId, REQUEST_STATUS.UNDER_REVIEW, onSuccess, onError);
      
      case WORKFLOW_EVENTS.CANCEL:
      case WORKFLOW_EVENTS.CANCEL_OFFER:
      case WORKFLOW_EVENTS.CLOSE_REQUEST:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.CANCELLED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case WORKFLOW_EVENTS.RESEND_OFFER:
        return await updateStatus(requestId, REQUEST_STATUS.OFFER_SENT, onSuccess, onError);
      
      case WORKFLOW_EVENTS.MAKE_NEW_OFFER:
        if (!input?.amount || !input?.tenureMonths || !input?.interestRate) {
          onError?.('Missing offer details');
          return false;
        }
        return await createOffer(requestId, input, onSuccess, onError);
      
      case WORKFLOW_EVENTS.DISBURSE:
        // Admin creates loan record and disburses amount in single step
        return await updateStatus(requestId, REQUEST_STATUS.AMOUNT_DISBURSED, onSuccess, onError);
      
      case WORKFLOW_EVENTS.REQUEST_DIFFERENT_BANK_DETAILS:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.PENDING_BANK_DETAILS, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case WORKFLOW_EVENTS.TRANSFER_FAILED:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.TRANSFER_FAILED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case WORKFLOW_EVENTS.CREATE_LOAN:
        // Step 1: Create Loan + EMI Schedule records
        const createLoanRes = await postWithResult(`/api/v1/requests/${requestId}/create-loan`);

        if (!createLoanRes.ok) {
          onError?.(createLoanRes.error.message || 'Failed to create loan');
          return false;
        }

        // Step 2: Update status to ACTIVE
        return await updateStatus(requestId, REQUEST_STATUS.ACTIVE, onSuccess, onError);
      
      case WORKFLOW_EVENTS.MARK_OVERDUE:
        return await updateStatus(requestId, REQUEST_STATUS.PAYMENT_OVERDUE, onSuccess, onError);
      
      case WORKFLOW_EVENTS.MARK_COMPLETED:
        return await updateStatus(requestId, REQUEST_STATUS.COMPLETED, onSuccess, onError);
      
      case WORKFLOW_EVENTS.MARK_PAID:
        return await updateStatus(requestId, REQUEST_STATUS.ACTIVE, onSuccess, onError, input?.notes);
      
      case WORKFLOW_EVENTS.MARK_DEFAULTED:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.DEFAULTED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case WORKFLOW_EVENTS.MARK_SETTLED:
        return await updateStatus(requestId, REQUEST_STATUS.COMPLETED, onSuccess, onError);
      
      case WORKFLOW_EVENTS.REOPEN:
        return await updateStatus(requestId, REQUEST_STATUS.UNDER_REVIEW, onSuccess, onError);
      
      // ==========================================
      // CUSTOMER ACTIONS
      // ==========================================
      
      case WORKFLOW_EVENTS.ACCEPT_OFFER:
        return await updateStatus(requestId, REQUEST_STATUS.OFFER_ACCEPTED, onSuccess, onError);
      
      case WORKFLOW_EVENTS.DECLINE_OFFER:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.OFFER_DECLINED, 
          onSuccess, 
          onError,
          input?.reason
        );
      
      case WORKFLOW_EVENTS.SUBMIT_INFO:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.PENDING, 
          onSuccess, 
          onError,
          'Customer submitted additional information'
        );
      
      case WORKFLOW_EVENTS.WITHDRAW:
      case WORKFLOW_EVENTS.REFUSE_SIGNATURE:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.CANCELLED, 
          onSuccess, 
          onError,
          input?.reason || 'Cancelled by customer'
        );
      
      case WORKFLOW_EVENTS.REQUEST_RESCHEDULE:
        // Customer requests a reschedule: send date-only (YYYY-MM-DD) as requestedInspectionAt
        return await updateStatus(
          requestId,
          REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
          onSuccess,
          onError,
          { requestedInspectionAt: input?.inspectionDate || null, note: input?.notes }
        );
      
      case WORKFLOW_EVENTS.SIGN_AGREEMENT:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.PENDING_BANK_DETAILS, 
          onSuccess, 
          onError,
          'Customer signed agreement'
        );
      
      case WORKFLOW_EVENTS.SUBMIT_BANK_DETAILS:
        if (!input?.accountNumber || !input?.ifscCode || !input?.accountHolderName) {
          onError?.('Missing bank details');
          return false;
        }
        return await submitBankDetails(requestId, {
          accountNumber: input.accountNumber,
          ifscCode: input.ifscCode,
          accountName: input.accountHolderName,
          upiId: input.upiId
        }, onSuccess, onError);
      
      case WORKFLOW_EVENTS.UPDATE_BANK_DETAILS:
        if (!input?.accountNumber || !input?.ifscCode || !input?.accountHolderName) {
          onError?.('Missing bank details');
          return false;
        }
        return await submitBankDetails(requestId, {
          accountNumber: input.accountNumber,
          ifscCode: input.ifscCode,
          accountName: input.accountHolderName,
          upiId: input.upiId
        }, onSuccess, onError);
      
      case WORKFLOW_EVENTS.PROVIDE_EXPLANATION:
        if (!input?.notes) {
          onError?.('Explanation cannot be empty');
          return false;
        }
        // Just add a comment as explanation, don't change status as customer might not have permission
        return await addComment(requestId, input.notes, false, onSuccess, onError);
      
      case WORKFLOW_EVENTS.REQUEST_RESUME:
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
      
      case WORKFLOW_EVENTS.START_INSPECTION:
        return await updateStatus(requestId, REQUEST_STATUS.INSPECTION_IN_PROGRESS, onSuccess, onError);
      
      case WORKFLOW_EVENTS.COMPLETE_INSPECTION:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.INSPECTION_COMPLETED, 
          onSuccess, 
          onError,
          input?.notes
        );
      
      case WORKFLOW_EVENTS.CUSTOMER_NOT_AVAILABLE:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE, 
          onSuccess, 
          onError,
          input?.notes || 'Customer not available on scheduled date'
        );
      
      case WORKFLOW_EVENTS.ASSET_MISMATCH:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.ASSET_MISMATCH, 
          onSuccess, 
          onError,
          input?.notes || 'Asset does not match description'
        );
      
      case WORKFLOW_EVENTS.CANCEL_AGENT:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.AGENT_NOT_AVAILABLE, 
          onSuccess, 
          onError,
          "Agent can't make the scheduled inspection"
        );
      
      case WORKFLOW_EVENTS.APPROVE_INSPECTION:
        return await updateStatus(
          requestId, 
          REQUEST_STATUS.APPROVED, 
          onSuccess, 
          onError,
          'Approved by agent after inspection'
        );
      
      case WORKFLOW_EVENTS.RESCHEDULE_INSPECTION:
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

/** Response type for status update API */
interface StatusUpdateResponse {
  request?: RequestType;
}

/** Notes can be a simple string or an object with additional metadata */
interface NotesPayload {
  note?: string;
  requestedInspectionAt?: string | null;
  [key: string]: unknown;
}

async function updateStatus(
  requestId: string,
  status: REQUEST_STATUS,
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void,
  notes?: string | NotesPayload
): Promise<boolean> {
  // Build body allowing either a simple note string or an object with additional fields
  const bodyData: NotesPayload & { status: REQUEST_STATUS } = { status };
  if (typeof notes === 'string') {
    bodyData.note = notes;
  } else if (notes && typeof notes === 'object') {
    Object.assign(bodyData, notes);
  }

  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/status`, bodyData);
  
  if (result.ok) {
    // Fetch full request to get updated history
    const fullRequest = await fetchFullRequest(requestId);
    onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to update status');
    return false;
  }
}

async function createOffer(
  requestId: string,
  offer: ActionInput,
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/offer`, {
    amount: offer.amount,
    tenureMonths: offer.tenureMonths,
    interestRate: offer.interestRate,
    penaltyPercentage: offer.penaltyPercentage ?? 4,
    lateFeePercentage: offer.lateFeePercentage ?? 0.01,
    processingFee: offer.processingFee ?? 0
  });
  
  if (result.ok) {
      // Fetch full request to ensure we pass the complete request including relations (history/comments)
      const fullRequest = await fetchFullRequest(requestId);
      onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to create offer');
    return false;
  }
}

async function assignAgent(
  requestId: string,
  agentId: string,
  inspectionDate?: string,
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const body: Record<string, string> = { agentId };
  if (inspectionDate) body.inspectionDate = inspectionDate; // date-only (YYYY-MM-DD)

  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/assign`, body);
  
  if (result.ok) {
    onSuccess?.(result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to assign agent');
    return false;
  }
}

async function selfAssignAdmin(
  requestId: string,
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/self-assign`);
  
  if (result.ok) {
    const fullRequest = await fetchFullRequest(requestId);
    onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to self-assign');
    return false;
  }
}

async function assignAdmin(
  requestId: string,
  adminId: string,
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/assign-admin`, { adminId });
  
  if (result.ok) {
    const fullRequest = await fetchFullRequest(requestId);
    onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to assign admin');
    return false;
  }
}

/** Response type for fetching a single request */
interface GetRequestResponse {
  request?: RequestType;
}

async function fetchFullRequest(requestId: string): Promise<RequestType | null> {
  const result = await getWithResult<GetRequestResponse>(`/api/v1/requests/${requestId}`);
  return result.ok ? result.data?.request || null : null;
}

async function submitBankDetails(
  requestId: string,
  bankDetails: { accountNumber: string; ifscCode: string; accountName: string; upiId?: string },
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/bank-details`, {
    bankAccountNumber: bankDetails.accountNumber,
    bankIfscCode: bankDetails.ifscCode,
    bankAccountName: bankDetails.accountName,
    upiId: bankDetails.upiId
  });
  
  if (result.ok) {
    // Fetch full request to get updated history
    const fullRequest = await fetchFullRequest(requestId);
    onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to submit bank details');
    return false;
  }
}

async function addComment(
  requestId: string,
  content: string,
  isInternal: boolean,
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/comments`, { content, isInternal });
  
  if (result.ok) {
    const fullRequest = await fetchFullRequest(requestId);
    onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to add comment');
    return false;
  }
}

async function updateRequestSettings(
  requestId: string,
  settings: { commentsEnabled: boolean },
  onSuccess?: (data: RequestType) => void,
  onError?: (error: string) => void
): Promise<boolean> {
  const result = await postWithResult<StatusUpdateResponse>(`/api/v1/requests/${requestId}/comments-enabled`, { enabled: settings.commentsEnabled });
  
  if (result.ok) {
    const fullRequest = await fetchFullRequest(requestId);
    onSuccess?.(fullRequest || result.data?.request as RequestType);
    return true;
  } else {
    onError?.(result.error.message || 'Failed to update settings');
    return false;
  }
}
