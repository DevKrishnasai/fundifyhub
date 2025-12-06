'use client';

import React, { useMemo } from 'react';
import { useRequest } from '../context/RequestContext';
import { useRequestActions } from '../context/RequestActionContext';
import { ACTION_CONFIG } from '@fundifyhub/utils';
import { WORKFLOW_EVENTS, MODAL_COMPONENTS, AGENT_ISSUE_TYPES, LOCAL_STORAGE_KEYS } from '@fundifyhub/types';
import { getDistrictName, type StagedPhoto } from '@/lib/type-guards';

// Import all modals
import CreateOfferModal from '../../features/requests/OfferCard';
import AssignAgentModal from '../AssignAgentModal';
import {
  RejectModal,
  ApproveModal,
  DisbursementModal,
  AgentIssueModal,
  OfferDeclineModal,
  CancelWithdrawModal,
  RequestInfoModal,
  RequestBankDetailsModal,
  BankDetailsModal,
  RescheduleModal,
  CompleteInspectionModal,
  ConfirmActionModal,
  AssignAdminModal,
} from '../modals';
import { GenericReasonModal } from '../modals/GenericReasonModal';

/**
 * ActionModalManager
 * 
 * This component is responsible for rendering the correct modal based on the 
 * currently active action in the RequestActionContext.
 * 
 * It decouples the Page component from the specific modal implementations.
 */
export function ActionModalManager() {
  const { request } = useRequest();
  const { activeActionId, closeAction, executeAction, isActionLoading } = useRequestActions();

  if (!activeActionId || !request) return null;

  // Get configuration for the active action
  const config = ACTION_CONFIG[activeActionId];
  if (!config) return null;

  // Helper to handle simple submissions
  const handleSimpleSubmit = async (data?: Record<string, unknown>) => {
    await executeAction(activeActionId, data);
  };

  // 1. Render Specific Modals based on config.modalComponent
  switch (config.modalComponent) {
    case MODAL_COMPONENTS.CREATE_OFFER_MODAL:
      return (
        <CreateOfferModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          requestId={request.id}
          initialOffer={
            request.adminOfferedAmount
              ? {
                  amount: request.adminOfferedAmount,
                  tenureMonths: request.adminTenureMonths || 12,
                  interestRate: request.adminInterestRate || 18,
                  penaltyPercentage: request.penaltyPercentage || 2,
                  lateFeePercentage: request.lateFeePercentage || 1,
                }
              : undefined
          }
          onSubmit={async (data) => {
            await executeAction(activeActionId, data);
          }}
        />
      );

    case MODAL_COMPONENTS.ASSIGN_AGENT_MODAL:
      return (
        <AssignAgentModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          district={getDistrictName(request)}
          isReschedule={activeActionId === WORKFLOW_EVENTS.RESCHEDULE_INSPECTION}
          onSubmit={async (agentId, date) => {
            await executeAction(activeActionId, { agentId, inspectionDate: date });
            return true;
          }}
        />
      );

    case MODAL_COMPONENTS.ASSIGN_ADMIN_MODAL:
      return (
        <AssignAdminModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          district={getDistrictName(request)}
          onSubmit={async (adminId) => {
            await executeAction(activeActionId, { adminId });
          }}
        />
      );

    case MODAL_COMPONENTS.REJECT_MODAL:
      return (
        <RejectModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (reason) => { await executeAction(activeActionId, { reason }); }}
          isSubmitting={isActionLoading}
        />
      );

    case MODAL_COMPONENTS.APPROVE_MODAL:
      return (
        <ApproveModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (notes) => { await executeAction(activeActionId, { notes }); }}
          isSubmitting={isActionLoading}
        />
      );

    case MODAL_COMPONENTS.DISBURSEMENT_MODAL:
      return (
        <DisbursementModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (transactionId) => { await executeAction(activeActionId, { transactionId }); }}
          isSubmitting={isActionLoading}
          loanAmount={request.adminOfferedAmount || request.requestedAmount}
          processingFee={0}
        />
      );
      
    case MODAL_COMPONENTS.OFFER_DECLINE_MODAL:
      return (
        <OfferDeclineModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (reason) => { await executeAction(activeActionId, { reason }); }}
          isSubmitting={isActionLoading}
        />
      );

    case MODAL_COMPONENTS.CANCEL_WITHDRAW_MODAL:
      return (
        <CancelWithdrawModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (reason) => { await executeAction(activeActionId, { reason }); }}
          isSubmitting={isActionLoading}
          isAdmin={activeActionId === WORKFLOW_EVENTS.CANCEL} // Simple check
        />
      );

    case MODAL_COMPONENTS.REQUEST_INFO_MODAL:
      return (
        <RequestInfoModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (notes) => { await executeAction(activeActionId, { notes }); }}
          isSubmitting={isActionLoading}
        />
      );

    case MODAL_COMPONENTS.REQUEST_BANK_DETAILS_MODAL:
      return (
        <RequestBankDetailsModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (notes) => { await executeAction(activeActionId, { notes }); }}
          isSubmitting={isActionLoading}
        />
      );

    case MODAL_COMPONENTS.BANK_DETAILS_MODAL:
      return (
        <BankDetailsModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (data) => {
            await executeAction(activeActionId, {
              accountNumber: data.accountNumber,
              ifscCode: data.ifscCode,
              accountHolderName: data.accountName,
              upiId: data.upiId,
            });
          }}
          isSubmitting={isActionLoading}
          initialData={
            request.bankAccountNumber
              ? {
                  accountNumber: request.bankAccountNumber,
                  ifscCode: request.bankIfscCode || '',
                  accountName: request.bankAccountName || '',
                  upiId: request.upiId || '',
                }
              : undefined
          }
        />
      );

    case MODAL_COMPONENTS.RESCHEDULE_MODAL:
      return (
        <RescheduleModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (reason, date) => { await executeAction(activeActionId, { reason, inspectionDate: date }); }}
          isSubmitting={isActionLoading}
        />
      );

    case MODAL_COMPONENTS.COMPLETE_INSPECTION_MODAL:
      // Check for staged inspection photos in localStorage
      const stagedPhotos = (() => {
        if (typeof window === 'undefined') return [];
        const key = LOCAL_STORAGE_KEYS.INSPECTION_PHOTOS(request.id);
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            return JSON.parse(saved) as StagedPhoto[];
          } catch {
            return [];
          }
        }
        return [];
      })();
      
      return (
        <CompleteInspectionModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (notes) => { 
            await executeAction(activeActionId, { notes }); 
            // Clear staged photos after successful completion
            if (typeof window !== 'undefined') {
              localStorage.removeItem(LOCAL_STORAGE_KEYS.INSPECTION_PHOTOS(request.id));
            }
          }}
          isSubmitting={isActionLoading}
          hasStagedUploads={stagedPhotos.length > 0}
        />
      );
      
    case MODAL_COMPONENTS.AGENT_ISSUE_MODAL:
      return (
        <AgentIssueModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (reason) => { await executeAction(activeActionId, { notes: reason }); }}
          isSubmitting={isActionLoading}
          issueType={activeActionId === WORKFLOW_EVENTS.CUSTOMER_NOT_AVAILABLE ? AGENT_ISSUE_TYPES.CUSTOMER_NOT_AVAILABLE : AGENT_ISSUE_TYPES.AGENT_NOT_AVAILABLE}
        />
      );

    case MODAL_COMPONENTS.REFUSE_SIGNATURE_MODAL:
      return (
        <GenericReasonModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (reason) => { await executeAction(activeActionId, { reason }); }}
          isSubmitting={isActionLoading}
          title="Refuse Signature"
          description="Please provide a reason for refusing to sign the agreement."
          submitLabel="Refuse Signature"
          variant="destructive"
        />
      );

    case MODAL_COMPONENTS.EXPLANATION_MODAL:
      return (
        <GenericReasonModal
          open={true}
          onOpenChange={(open) => !open && closeAction()}
          onSubmit={async (notes) => { await executeAction(activeActionId, { notes }); }}
          isSubmitting={isActionLoading}
          title="Provide Explanation"
          description="Please explain the discrepancy."
          submitLabel="Submit Explanation"
        />
      );
  }

  // 2. Render Generic Confirmation Modal if no specific modal is defined but confirmation is required
  if (config.requiresConfirmation) {
    return (
      <ConfirmActionModal
        open={true}
        onOpenChange={(open) => !open && closeAction()}
        title={config.label}
        message={config.description || `Are you sure you want to perform this action?`}
        confirmLabel="Confirm"
        variant={config.variant === 'destructive' ? 'destructive' : 'default'}
        onConfirm={async () => {
          await executeAction(activeActionId);
        }}
        isSubmitting={isActionLoading}
        closeImmediately={true}
      />
    );
  }

  return null;
}
