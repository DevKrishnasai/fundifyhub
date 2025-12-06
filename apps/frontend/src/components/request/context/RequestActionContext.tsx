'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useRequest } from './RequestContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks';
import { WorkflowEngine } from '@fundifyhub/utils';
import { type WorkflowActionConfig, type WorkflowContext, WORKFLOW_EVENTS, REQUEST_STATUS } from '@fundifyhub/types';

export interface ActionInput {
  notes?: string;
  isInternal?: boolean;
  amount?: number;
  tenureMonths?: number;
  interestRate?: number;
  processingFee?: number;
  penaltyPercentage?: number;
  lateFeePercentage?: number;
  agentId?: string;
  transferProof?: string; // Signature data
  inspectionDate?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  reason?: string;
}

import { 
  useUpdateStatus, 
  useAssignAgent, 
  useAddComment, 
  useCreateOffer, 
  useConfirmOffer, 
  useGenerateAgreement, 
  useSignAgreement, 
  useCompleteInspection, 
  useUpdateBankDetails, 
  useToggleCommentsEnabled, 
  useSelfAssignAdmin 
} from '@/hooks/queries/useRequests';

// Define the shape of our context
interface RequestActionContextType {
  // State
  availableActions: Array<WorkflowActionConfig & { id: string }>;
  isActionLoading: boolean;
  activeActionId: string | null; // The ID of the action currently being performed/modal open
  
  // Methods
  openAction: (actionId: string) => void;
  closeAction: () => void;
  executeAction: (actionId: string, input?: ActionInput) => Promise<boolean>;
}

const RequestActionContext = createContext<RequestActionContextType | undefined>(undefined);

export function RequestActionProvider({ children }: { children: React.ReactNode }) {
  const { request } = useRequest();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Mutations
  const updateStatus = useUpdateStatus();
  const assignAgent = useAssignAgent();
  const addComment = useAddComment();
  const createOffer = useCreateOffer();
  const confirmOffer = useConfirmOffer();
  const generateAgreement = useGenerateAgreement();
  const signAgreement = useSignAgreement();
  const completeInspection = useCompleteInspection();
  const updateBankDetails = useUpdateBankDetails();
  const toggleComments = useToggleCommentsEnabled();
  const selfAssign = useSelfAssignAdmin();

  // 1. Calculate Available Actions using the Engine
  const availableActions = useMemo(() => {
    if (!request || !user) return [];

    // Extract district ID string (handles both string and DistrictType)
    const districtId = typeof request.district === 'string' 
      ? request.district 
      : request.district?.id || '';

    const context: WorkflowContext = {
      user: {
        id: user.id,
        roles: user.roles || [],
        districts: user.districts,
      },
      request: {
        id: request.id,
        customerId: request.customerId,
        district: districtId,
        assignedAgentId: request.assignedAgentId,
        amount: request.requestedAmount,
      }
    };

    return WorkflowEngine.getAvailableActions(context);
  }, [request, user]);

  // 2. Handle Opening Action Modals
  const openAction = useCallback((actionId: string) => {
    setActiveActionId(actionId);
  }, []);

  const closeAction = useCallback(() => {
    setActiveActionId(null);
  }, []);

  // 3. Execute Actions (API Calls)
  const executeAction = useCallback(async (actionId: string, input?: ActionInput): Promise<boolean> => {
    if (!request) return false;
    
    setIsActionLoading(true);
    try {
      switch (actionId) {
        case WORKFLOW_EVENTS.ADD_COMMENT:
          if (!input?.notes) throw new Error('Comment cannot be empty');
          await addComment.mutateAsync({ 
            id: request.id, 
            data: { content: input.notes, isInternal: input.isInternal || false } 
          });
          break;

        case WORKFLOW_EVENTS.TOGGLE_COMMENTS:
          await toggleComments.mutateAsync({ 
            requestId: request.id, 
            enabled: input?.notes === 'enable' 
          });
          break;

        case WORKFLOW_EVENTS.START_REVIEW:
          await updateStatus.mutateAsync({ 
            id: request.id, 
            data: { status: REQUEST_STATUS.UNDER_REVIEW } 
          });
          break;
        
        case WORKFLOW_EVENTS.MAKE_OFFER:
        case WORKFLOW_EVENTS.REVISE_OFFER:
          if (!input?.amount || !input?.tenureMonths || !input?.interestRate) {
            throw new Error('Missing offer details');
          }
          await createOffer.mutateAsync({ 
            requestId: request.id, 
            offerData: {
              offeredAmount: input.amount,
              tenureMonths: input.tenureMonths,
              interestRate: input.interestRate,
              processingFee: input.processingFee,
              penaltyPercentage: input.penaltyPercentage,
              lateFeePercentage: input.lateFeePercentage,
              adminRequestedInfo: input.notes
            }
          });
          break;
        
        case WORKFLOW_EVENTS.REQUEST_MORE_INFO:
          await updateStatus.mutateAsync({ 
            id: request.id, 
            data: { 
              status: REQUEST_STATUS.MORE_INFO_REQUIRED,
              reason: input?.notes 
            } 
          });
          break;

        case WORKFLOW_EVENTS.ASSIGN_AGENT:
          if (!input?.agentId) throw new Error('Agent ID is required');
          await assignAgent.mutateAsync({ 
            id: request.id, 
            data: { agentId: input.agentId } 
          });
          break;

        case WORKFLOW_EVENTS.SELF_ASSIGN:
          await selfAssign.mutateAsync(request.id);
          break;

        case WORKFLOW_EVENTS.CONFIRM_OFFER:
          await confirmOffer.mutateAsync(request.id);
          break;

        case WORKFLOW_EVENTS.GENERATE_AGREEMENT:
          await generateAgreement.mutateAsync(request.id);
          break;

        case WORKFLOW_EVENTS.SIGN_AGREEMENT:
          if (!input?.transferProof) throw new Error('Signature data required');
          await signAgreement.mutateAsync({ 
            requestId: request.id, 
            signatureData: input.transferProof 
          });
          break;

        case WORKFLOW_EVENTS.COMPLETE_INSPECTION:
          await completeInspection.mutateAsync({ 
            requestId: request.id, 
            inspectionData: {
              inspectionDate: input?.inspectionDate,
              notes: input?.notes,
              // Add other inspection fields as needed
            } 
          });
          break;

        case WORKFLOW_EVENTS.UPDATE_BANK_DETAILS:
          if (!input?.accountNumber || !input?.ifscCode || !input?.accountHolderName) {
            throw new Error('Bank details incomplete');
          }
          await updateBankDetails.mutateAsync({ 
            requestId: request.id, 
            bankDetails: {
              accountNumber: input.accountNumber,
              ifscCode: input.ifscCode,
              accountHolderName: input.accountHolderName,
              bankName: '', // Should be fetched from IFSC or input
              branchName: '',
            } 
          });
          break;

        case WORKFLOW_EVENTS.APPROVE_REQUEST:
          await updateStatus.mutateAsync({ 
            id: request.id, 
            data: { status: REQUEST_STATUS.APPROVED } 
          });
          break;

        case WORKFLOW_EVENTS.REJECT_REQUEST:
          await updateStatus.mutateAsync({ 
            id: request.id, 
            data: { 
              status: REQUEST_STATUS.REJECTED,
              reason: input?.reason || input?.notes 
            } 
          });
          break;

        default:
          throw new Error(`Action ${actionId} not implemented`);
      }

      toastSuccess('Action completed successfully');
      closeAction();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      toastError(message);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, [
    request, 
    toastSuccess, 
    toastError, 
    closeAction,
    updateStatus,
    assignAgent,
    addComment,
    createOffer,
    confirmOffer,
    generateAgreement,
    signAgreement,
    completeInspection,
    updateBankDetails,
    toggleComments,
    selfAssign
  ]);

  const value = {
    availableActions,
    isActionLoading,
    activeActionId,
    openAction,
    closeAction,
    executeAction
  };

  return (
    <RequestActionContext.Provider value={value}>
      {children}
    </RequestActionContext.Provider>
  );
}

export function useRequestActions() {
  const context = useContext(RequestActionContext);
  if (context === undefined) {
    throw new Error('useRequestActions must be used within a RequestActionProvider');
  }
  return context;
}
