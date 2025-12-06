'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getWithResult, postWithResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { REQUEST_STATUS, ROLES } from '@fundifyhub/types';

/**
 * Request Detail data structure
 * Matches the full request object returned by the API
 */
export interface RequestDetailData {
  id: string;
  requestNumber?: string | null;
  currentStatus: string;
  requestedAmount: number;
  district: string;
  assetType?: string | null;
  assetCondition?: string | null;
  assetBrand?: string | null;
  assetModel?: string | null;
  purchaseYear?: number | null;
  AdditionalDescription?: string | null;
  
  // Offer details
  adminOfferedAmount?: number | null;
  adminTenureMonths?: number | null;
  adminInterestRate?: number | null;
  penaltyPercentage?: number | null;
  lateFeePercentage?: number | null;
  adminProcessingFee?: number | null;
  adminEmiSchedule?: {
    monthlyPayment: number;
    totalInterest: number;
    totalPayment: number;
    emiSchedule: Array<{
      installment: number;
      paymentDate: string;
      paymentAmount: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    }>;
  } | null;
  
  // Agent & Inspection
  assignedAgentId?: string | null;
  assignedAgent?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  inspectionScheduledAt?: string | null;
  
  // Bank details
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountName?: string | null;
  upiId?: string | null;
  bankDetailsSubmittedAt?: string | null;
  
  // Customer
  customerId: string;
  customer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  
  // Loan
  loan?: {
    id: string;
    loanNumber?: string | null;
    status: string;
    approvedAmount: number;
    totalAmount: number;
    totalPaidAmount: number;
    remainingAmount?: number | null;
    paidEMIs: number;
    tenureMonths: number;
    emiAmount: number;
    interestRate: number;
    disbursedDate?: string | null;
    emisSchedule?: Array<{
      id: string;
      emiNumber: number;
      dueDate: string;
      emiAmount: number;
      principalAmount?: number;
      interestAmount?: number;
      status: string;
      lateFee?: number;
      paidDate?: string | null;
      paidAmount?: number | null;
    }>;
  } | null;
  
  // Documents
  documents?: Array<{
    id: string;
    documentType?: string;
    documentCategory?: string;
    fileKey?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    uploadedBy?: string;
    uploaderRole?: string;
    uploadedAt?: string;
  }>;
  
  // Request history
  requestHistory?: Array<{
    id: string;
    action: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    actor?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      role?: string;
    } | null;
  }>;
  
  // Comments
  comments?: Array<{
    id: string;
    text: string;
    createdAt: string;
    user?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      role?: string;
    } | null;
  }>;
  commentsEnabled?: boolean;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User permissions for the request
 */
export interface RequestPermissions {
  canView: boolean;
  isCustomer: boolean;
  isAgent: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRequestOwner: boolean;
  isAssignedAgent: boolean;
  hasDistrictAccess: boolean;
}

/**
 * Modal state management
 */
export interface ModalState {
  bankDetails: boolean;
  reject: boolean;
  approve: boolean;
  disbursement: boolean;
  agentIssue: boolean;
  offerDecline: boolean;
  cancelWithdraw: boolean;
  requestInfo: boolean;
  requestBankDetails: boolean;
  reschedule: boolean;
  completeInspection: boolean;
  confirm: boolean;
  createOffer: boolean;
  assignAgent: boolean;
}

interface UseRequestDetailOptions {
  requestId: string;
}

interface UseRequestDetailReturn {
  // Data
  request: RequestDetailData | null;
  loading: boolean;
  error: string | null;
  
  // Permissions
  permissions: RequestPermissions;
  
  // Actions
  refreshRequest: () => Promise<void>;
  updateRequest: (data: RequestDetailData) => void;
  
  // Modal management
  modals: ModalState;
  openModal: (modal: keyof ModalState) => void;
  closeModal: (modal: keyof ModalState) => void;
  closeAllModals: () => void;
  
  // Status update
  handleStatusUpdate: (status: string, note?: string | Record<string, unknown>) => Promise<boolean>;
  
  // Toast helpers
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
}

const INITIAL_MODAL_STATE: ModalState = {
  bankDetails: false,
  reject: false,
  approve: false,
  disbursement: false,
  agentIssue: false,
  offerDecline: false,
  cancelWithdraw: false,
  requestInfo: false,
  requestBankDetails: false,
  reschedule: false,
  completeInspection: false,
  confirm: false,
  createOffer: false,
  assignAgent: false,
};

/**
 * Custom hook for managing request detail state and operations
 */
export function useRequestDetail({ requestId }: UseRequestDetailOptions): UseRequestDetailReturn {
  const auth = useAuth();
  const { success: toastSuccessBase, error: toastErrorBase } = useToast();
  
  // Core state
  const [request, setRequest] = useState<RequestDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [modals, setModals] = useState<ModalState>(INITIAL_MODAL_STATE);
  
  // Toast helpers
  const toastSuccess = useCallback((message: string) => {
    toastSuccessBase(message);
  }, [toastSuccessBase]);
  
  const toastError = useCallback((message: string) => {
    toastErrorBase(message);
  }, [toastErrorBase]);
  
  // Fetch request data
  const fetchRequest = useCallback(async () => {
    if (!requestId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getWithResult<{ request: RequestDetailData }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(requestId)
      );
      
      if (result.ok && result.data?.request) {
        setRequest(result.data.request);
      } else if (!result.ok) {
        setError(result.error?.message || 'Failed to load request');
      } else {
        setError('Failed to load request');
      }
    } catch (err) {
      setError('Network error while loading request');
    } finally {
      setLoading(false);
    }
  }, [requestId]);
  
  // Initial fetch
  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);
  
  // Compute permissions
  const permissions = useMemo<RequestPermissions>(() => {
    const user = auth.user;
    
    if (!user || !request) {
      return {
        canView: false,
        isCustomer: false,
        isAgent: false,
        isAdmin: false,
        isSuperAdmin: false,
        isRequestOwner: false,
        isAssignedAgent: false,
        hasDistrictAccess: false,
      };
    }
    
    const isSuperAdmin = auth.isSuperAdmin();
    const isDistrictAdmin = auth.isDistrictAdmin();
    const isAgentRole = auth.isAgent();
    const isCustomerRole = auth.isCustomer();
    const isAdmin = auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]);
    
    const isRequestOwner = request.customerId === user.id;
    const isAssignedAgent = request.assignedAgentId === user.id;
    // Check if user's districts include the request's district
    const userDistricts = user.districts || [];
    const hasDistrictAccess = isSuperAdmin || (isDistrictAdmin && userDistricts.includes(request.district));
    
    // Determine effective role for this request
    const isCustomer = isRequestOwner && !isAdmin;
    const isAgent = isAssignedAgent && !isAdmin;
    
    // Can view if: owner, assigned agent, or admin with district access
    const canView = isRequestOwner || isAssignedAgent || hasDistrictAccess;
    
    return {
      canView,
      isCustomer,
      isAgent,
      isAdmin,
      isSuperAdmin,
      isRequestOwner,
      isAssignedAgent,
      hasDistrictAccess,
    };
  }, [auth, request]);
  
  // Modal management
  const openModal = useCallback((modal: keyof ModalState) => {
    setModals((prev) => ({ ...prev, [modal]: true }));
  }, []);
  
  const closeModal = useCallback((modal: keyof ModalState) => {
    setModals((prev) => ({ ...prev, [modal]: false }));
  }, []);
  
  const closeAllModals = useCallback(() => {
    setModals(INITIAL_MODAL_STATE);
  }, []);
  
  // Update request manually (optimistic updates)
  const updateRequest = useCallback((data: RequestDetailData) => {
    setRequest(data);
  }, []);
  
  // Status update handler
  const handleStatusUpdate = useCallback(async (
    status: string,
    note?: string | Record<string, unknown>
  ): Promise<boolean> => {
    if (!request) return false;
    
    try {
      const bodyData: Record<string, unknown> = { status };
      
      if (typeof note === 'string') {
        bodyData.note = note;
      } else if (note && typeof note === 'object') {
        Object.assign(bodyData, note);
      }
      
      const result = await postWithResult<{ request: RequestDetailData }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_STATUS(request.id),
        bodyData
      );
      
      if (result.ok) {
        // Refresh to get full data with history
        await fetchRequest();
        return true;
      } else if (!result.ok) {
        toastError(result.error?.message || 'Failed to update status');
        return false;
      }
      return false;
    } catch (err) {
      toastError('Network error');
      return false;
    }
  }, [request, fetchRequest, toastError]);
  
  return {
    request,
    loading,
    error,
    permissions,
    refreshRequest: fetchRequest,
    updateRequest,
    modals,
    openModal,
    closeModal,
    closeAllModals,
    handleStatusUpdate,
    toastSuccess,
    toastError,
  };
}

/**
 * Helper functions for extracting data from request history
 */
export function getLatestStatusNote(
  request: RequestDetailData,
  status: string
): string | null {
  if (!request.requestHistory) return null;
  
  const entries = request.requestHistory.filter((h) => {
    const meta = h.metadata as Record<string, unknown> | undefined;
    return meta?.toStatus === status || h.action === status;
  });
  
  if (entries.length === 0) return null;
  
  // Sort by createdAt descending
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const latest = entries[0];
  const meta = latest.metadata as Record<string, unknown> | undefined;
  
  return (meta?.note as string) || (meta?.reason as string) || null;
}

export function getLatestStatusActorType(
  request: RequestDetailData,
  status: string
): 'customer' | 'agent' | 'admin' | 'system' | null {
  if (!request.requestHistory) return null;
  
  const entries = request.requestHistory.filter((h) => {
    const meta = h.metadata as Record<string, unknown> | undefined;
    return meta?.toStatus === status || h.action === status;
  });
  
  if (entries.length === 0) return null;
  
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const latest = entries[0];
  const meta = latest.metadata as Record<string, unknown> | undefined;
  
  if (meta?.actorType) return meta.actorType as 'customer' | 'agent' | 'admin' | 'system';
  
  // Infer from actor role
  const role = latest.actor?.role;
  if (role === ROLES.CUSTOMER) return 'customer';
  if (role === ROLES.AGENT) return 'agent';
  if (role === ROLES.SUPER_ADMIN || role === ROLES.DISTRICT_ADMIN) return 'admin';
  
  return null;
}

export function getLatestAdminRequestedInfo(request: RequestDetailData): string | null {
  return getLatestStatusNote(request, REQUEST_STATUS.MORE_INFO_REQUIRED);
}

export function getLatestRequestedInspectionDate(request: RequestDetailData): string | null {
  if (!request.requestHistory) return null;
  
  const entries = request.requestHistory.filter((h) => {
    const meta = h.metadata as Record<string, unknown> | undefined;
    return meta?.toStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED;
  });
  
  if (entries.length === 0) return null;
  
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const meta = entries[0].metadata as Record<string, unknown> | undefined;
  return (meta?.requestedInspectionAt as string) || null;
}
