/**
 * Complete Request Detail Page
 * 
 * Implemented workflows:
 * ✓ Document upload and display with signed URLs
 * ✓ Agent assignment with district filtering
 * ✓ Offer creation and acceptance
 * ✓ Inspection workflow with photo uploads
 * ✓ Request more info workflow
 * ✓ Role-based UI and permissions
 * ✓ Timeline with all events
 * ✓ Comments system
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { REQUEST_STATUS, ROLES, DOCUMENT_MESSAGES, ACTION_MESSAGES, getActionsForUser, canViewRequestDetail, type WorkflowAction, type UserRole, EMI_STATUS, type AdminEMISchedulePreview, type HistoryEventDescription, CLIENT_CONSTANTS, type RequestHistoryItem, DOCUMENT_TYPE, DOCUMENT_CATEGORY, REQUEST_HISTORY_ACTION, VALIDATION_PATTERNS } from '@fundifyhub/types';
import { useRouter } from 'next/navigation';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { executeRequestAction } from '@/lib/request-actions';
import { deleteDocument, generateAgreement, uploadSignedAgreement, getAgreementPreviewUrl, signAgreement, downloadDocumentBlob } from '@/lib/document-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile } from '@fundifyhub/types';
import { createBulkDocuments } from '@/lib/document-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadButton } from '@/components/uploadthing-components';
import type { ClientUploadedFileData } from 'uploadthing/types';
import { SignaturePad } from '@/components/SignaturePad';
import PreviewModal from '@/components/common/PreviewModal';
import { useRazorpay } from '@/hooks/use-razorpay';
import { DocumentGallery } from '@/components/request/DocumentGallery';
import { LoanSummaryCard } from '@/components/request/LoanSummaryCard';
import { EMIPaymentsCard } from '@/components/request/EMIPaymentsCard';
import CreateOfferModal from '@/components/request/CreateOfferModal';
import AssignAgentModal from '@/components/request/AssignAgentModal';
import EmiScheduleTable from '@/components/request/EmiScheduleTable';
import { 
  Calendar, 
  MapPin, 
  IndianRupee, 
  FileText,
  Download,
  FileImage,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Upload,
  PenTool,
  CreditCard,
  Send,
  Loader2,
  Eye,
  Users,
  X
} from 'lucide-react';
import InspectionCard from '@/components/request/InspectionCard';
import { getWithResult, postWithResult } from '@/lib/api-client';

interface RequestDetail {
  id: string;
  requestNumber?: string | null;
  currentStatus: string;
  requestedAmount: number;
  district: string;
  customerId: string;
  createdAt?: string; // Request creation timestamp
  
  assetType?: string;
  assetBrand?: string;
  assetModel?: string;
  assetCondition?: string;
  purchaseYear?: number;
  AdditionalDescription?: string;
  
  adminOfferedAmount?: number | null;
  adminTenureMonths?: number | null;
  adminInterestRate?: number | null;
  offerMadeDate?: string | null;
  adminEmiSchedule?: AdminEMISchedulePreview | null;
  penaltyPercentage?: number | null;
  lateFeePercentage?: number | null;
  
  // Assignment
  assignedAgentId?: string | null;
  inspectionScheduledAt?: string | null;
  
  // Bank Details
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountName?: string | null;
  upiId?: string | null;
  bankDetailsSubmittedAt?: string | null;
  
  documents?: Array<{
    id: string;
    fileKey?: string | null;
    url?: string | null;
    fileName?: string | null;
    documentType?: string;
    documentCategory?: string;
    isVerified?: boolean;
  }>;
  // Use shared RequestHistoryItem shape but normalize createdAt to string for frontend rendering
  requestHistory?: Array<Omit<RequestHistoryItem, 'createdAt'> & { createdAt: string }>;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    author?: {
      id: string;
      firstName?: string;
      lastName?: string;
      roles?: string[];
    };
  }>;
  commentsEnabled?: boolean | null;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  };
  assignedAgent?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
  loan?: {
    id: string;
    loanNumber?: string | null;
    approvedAmount: number;
    interestRate: number;
    tenureMonths: number;
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
    status: string;
    paidEMIs: number;
    totalPaidAmount: number;
    overdueEMIs: number;
    remainingAmount?: number | null;
    remainingEMIs?: number | null;
    firstEMIDate?: string | null;
    lastEMIDate?: string | null;
    disbursedDate?: string | null;
    emisSchedule?: Array<{
      id: string;
      emiNumber: number;
      dueDate: string;
      emiAmount: number;
      principalAmount: number;
      interestAmount: number;
      status: string;
      paidDate?: string | null;
      paidAmount?: number | null;
      lateFee: number;
    }>;
    paymentOrders?: Array<{
      id: string;
      razorpayOrderId: string;
      emiScheduleId: string;
      emiAmount: number;
      penalty: number;
      totalAmount: number;
      status: string;
      razorpayPaymentId?: string | null;
      failureReason?: string | null;
      failureCode?: string | null;
      attempts: number;
      createdAt: string;
      updatedAt: string;
      paidAt?: string | null;
    }>;
  } | null;
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
}

export default function RequestDetailComplete({ id }: { id: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [hasUploadedNewDocs, setHasUploadedNewDocs] = useState(() => {
    // Check sessionStorage for uploaded docs flag for this request
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`uploaded_docs_${id}`);
      return stored === 'true';
    }
    return false;
  });
  // Track fileKeys that were uploaded during this session/interation so we can
  // show "Remove" only for those newly uploaded documents.
  const [recentlyUploadedFileKeys, setRecentlyUploadedFileKeys] = useState<string[]>([]);
  // Staged uploads: uploaded to cloud (UploadThing) but not yet persisted as DB documents.
  const [stagedUploads, setStagedUploads] = useState<UploadedFile[]>([]);
  // Preview of the most recent signature (data URL) so we can show a thumbnail in the Agreement card
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<null | { url: string; mimeType?: string | null; title?: string | null }>(null);
  const [finalizeAfterPreview, setFinalizeAfterPreview] = useState(false);
  const [signingSaving, setSigningSaving] = useState(false);

  // Handle signature save from SignaturePad: store preview and perform merge/upload workflow
  async function handleSignatureSave(signatureDataUrl: string) {
    if (!request) return;
    try {
      // keep thumbnail for Agreement card
      setSignaturePreview(signatureDataUrl);
      setUploadProgress('Processing signature...');

      // Import pdf-lib dynamically (client-side only)
      const { PDFDocument } = await import('pdf-lib');

      // Step 1: Download the generated PDF from backend
      setUploadProgress('Downloading agreement...');
      const pdfBlob = await generateAgreement(request.id);

      // Step 2: Load the PDF and embed signature
      setUploadProgress('Merging signature...');
      const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());

      // Convert signature base64 to blob
      const signatureResponse = await fetch(signatureDataUrl);
      const signatureBlob = await signatureResponse.blob();
      const signatureBytes = await signatureBlob.arrayBuffer();

      // Embed signature image
      const signatureImage = await pdfDoc.embedPng(signatureBytes);

      // Get the last page (signature page) and add signature
      const pages = pdfDoc.getPages();
      const signaturePage = pages[pages.length - 1];

      // Position signature in the borrower signature box
      signaturePage.drawImage(signatureImage, {
        x: 80,
        y: signaturePage.getHeight() - 450, // Adjust based on signature box position
        width: 180,
        height: 50,
      });

      // Step 3: Save the merged PDF
      setUploadProgress('Finalizing document...');
      const mergedPdfBytes = await pdfDoc.save();

      // Convert to base64 for backend upload
      const base64Pdf = btoa(
        new Uint8Array(mergedPdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Step 4: prepare to upload signed PDF to backend

      // Step 5: Send to backend to upload to UploadThing and save
      setUploadProgress('Uploading signed agreement...');
      const uploadData = await uploadSignedAgreement(request.id, base64Pdf, `signed-agreement-${request.requestNumber || request.id}.pdf`);

      // If backend returned a stamped signed URL, open it in our PreviewModal
      const stampedUrl = uploadData?.stampedSignedUrl || null;

      // Refresh request from server so UI reflects the server-side status transition
      try {
        const refreshResult = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(request.id));
        if (refreshResult.ok) {
          setRequest(refreshResult.data.request as RequestDetail);
        }
      } catch (e) {
        // ignore refresh failure — we still continue to preview if available
        console.error('Failed to refresh request after signing', e);
      }

      if (stampedUrl) {
        setPreviewSource({ url: stampedUrl, mimeType: 'application/pdf', title: `Signed Agreement - ${request.requestNumber || request.id}` });
        setPreviewOpen(true);
        setUploadProgress('');
        toastSuccess('Agreement signed successfully! Please review the stamped agreement.');
        return;
      }

      // No stamped URL — the backend still persisted the customer-signed document and should have progressed status.
      setUploadProgress('');
      toastSuccess('Agreement signed successfully! Please submit your bank details.');
    } catch (error) {
      setUploadProgress('');
      toastError(error instanceof Error ? error.message : 'Failed to process signature. Please try again.');
      throw error;
    }
  }
  // Helper: retrieve latest admin-requested-info strictly from structured requestHistory metadata
  // We prefer the explicit note. If no note, show who requested it (name) as informational only.
  const getLatestAdminRequestedInfo = (req: RequestDetail | null): string | null => {
    if (!req) return null;

    try {
      // Only consider structured metadata entries in requestHistory (no legacy fields or comments)
      const history = (req.requestHistory || []).filter(h => {
        const meta = (h.metadata || {}) as any;
        // Accept entries that include a note or have a requestedByName
        return Boolean(meta && ((typeof meta.note === 'string' && meta.note.trim()) || (meta.requestedByName && String(meta.requestedByName).trim())));
      });

      if (history.length === 0) return null;

      // Most recent first
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const meta = (history[0].metadata || {}) as any;

      // Prefer explicit note when present
      if (meta && typeof meta.note === 'string' && meta.note.trim()) return meta.note.trim();

      // Fallback: show who requested it (name) only — don't expose role or other structured fields
      if (meta.requestedByName) return `Requested by ${String(meta.requestedByName)}`;

      return null;
    } catch (err) {
      return null;
    }
  };

  // Get the latest note for a given status (e.g., REJECTED) from structured history metadata
  const getLatestStatusNote = (req: RequestDetail | null, status: string): string | null => {
    if (!req) return null;
    try {
      const history = (req.requestHistory || []).filter(h => {
        const meta = (h.metadata || {}) as any;
        return Boolean(meta && ((meta.toStatus === status) || (h.action === status)) && (meta.note || meta.message));
      });
      if (history.length === 0) return null;
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const meta = (history[0].metadata || {}) as any;
      const note = meta.note || meta.message;
      return note ? String(note).trim() : null;
    } catch (e) {
      return null;
    }
  };

  // Get the latest history entry for a given status transition and return the actor type
  const getLatestStatusActorType = (req: RequestDetail | null, status: string): 'customer' | 'admin' | 'agent' | 'system' | 'unknown' => {
    if (!req) return 'unknown';
    try {
      const history = (req.requestHistory || []).filter(h => {
        const meta = (h.metadata || {}) as any;
        return Boolean((meta && meta.toStatus === status) || h.action === status);
      });
      if (!history || history.length === 0) return 'unknown';
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const entry = history[0];
      const actor = (entry as any).actor || null;
      // If actor id matches customerId -> customer
      if (actor && typeof actor === 'object') {
        if (actor.id && req.customerId && actor.id === req.customerId) return 'customer';
        const roles: string[] = actor.roles || actor.role || [];
        if (Array.isArray(roles)) {
          if (roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.DISTRICT_ADMIN)) return 'admin';
          if (roles.includes(ROLES.AGENT)) return 'agent';
          if (roles.includes(ROLES.CUSTOMER)) return 'customer';
        }
      }
      // If metadata includes performedBy or actorRole
      const meta = (entry.metadata || {}) as any;
      if (meta && meta.actorRole) {
        const r = String(meta.actorRole).toLowerCase();
        if (r.includes('admin')) return 'admin';
        if (r.includes('agent')) return 'agent';
        if (r.includes('customer')) return 'customer';
      }
      // System or unknown
  if (((entry as any).performedBy === 'system') || (meta && meta.system)) return 'system';
      return 'unknown';
    } catch (e) {
      return 'unknown';
    }
  };

  // Get the most recent customer-requested inspection date from history metadata (date-only YYYY-MM-DD)
  const getLatestRequestedInspectionDate = (req: RequestDetail | null): string | null => {
    if (!req) return null;
    try {
      const history = (req.requestHistory || []).filter(h => {
        const meta = (h.metadata || {}) as any;
        return Boolean(meta && meta.requestedInspectionAt && (meta.toStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED || h.action === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED));
      });
      if (!history || history.length === 0) return null;
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const meta = (history[0].metadata || {}) as any;
      return meta.requestedInspectionAt || null;
    } catch (e) {
      return null;
    }
  };
  
    // Get the most recent admin actor (super admin or district admin) from history, if any
    const getLatestAdminActor = (req: RequestDetail | null) => {
      if (!req) return null;
      try {
        const history = (req.requestHistory || []).filter(h => {
          const actor = (h as any).actor || null;
          if (!actor || !actor.roles) return false;
          return Array.isArray(actor.roles) && (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN));
        });
        if (!history || history.length === 0) return null;
        history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const entry = history[0] as any;
        return entry.actor || null;
      } catch (e) {
        return null;
      }
    };
  
  // Agent assignment
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [inspectionDate, setInspectionDate] = useState('');
  
  // Offer creation
  const [creatingOffer, setCreatingOffer] = useState(false);
  // Initial offer payload for the CreateOfferModal (prefill when revising)
  const [createOfferInitial, setCreateOfferInitial] = useState<Partial<{ amount: number; tenureMonths: number; interestRate: number; penaltyPercentage: number; lateFeePercentage: number; processingFee: number }>>();
  
  // Bank details
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submittingBank, setSubmittingBank] = useState(false);
  const [bankValidationErrors, setBankValidationErrors] = useState({
    accountNumber: '',
    ifscCode: '',
    accountName: '',
    upiId: ''
  });

  // Bank details validation
  const validateBankDetails = () => {
    const errors: {
      accountNumber: string;
      ifscCode: string;
      accountName: string;
      upiId: string;
    } = {
      accountNumber: '',
      ifscCode: '',
      accountName: '',
      upiId: ''
    };

    // Account Number validation
    if (!accountNumber.trim()) {
      errors.accountNumber = 'Account number is required';
    } else if (!VALIDATION_PATTERNS.ACCOUNT_NUMBER.test(accountNumber.replace(/\s/g, ''))) {
      errors.accountNumber = 'Account number must be 9-18 digits';
    }

    // IFSC Code validation
    if (!ifscCode.trim()) {
      errors.ifscCode = 'IFSC code is required';
    } else if (!VALIDATION_PATTERNS.IFSC_CODE.test(ifscCode.toUpperCase())) {
      errors.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
    }

    // Account Name validation
    if (!accountName.trim()) {
      errors.accountName = 'Account holder name is required';
    } else if (accountName.trim().length < 2) {
      errors.accountName = 'Account holder name must be at least 2 characters';
    } else if (!VALIDATION_PATTERNS.ACCOUNT_NAME.test(accountName.trim())) {
      errors.accountName = 'Account holder name can only contain letters, spaces, and periods';
    }

    // UPI ID validation (optional)
    if (upiId.trim() && !VALIDATION_PATTERNS.UPI_ID.test(upiId.trim())) {
      errors.upiId = 'Invalid UPI ID format';
    }

    setBankValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };
  
  // Comments
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Admin control: toggle whether customers can comment after rejection
  const [togglingCommentsFlag, setTogglingCommentsFlag] = useState(false);
  
  // Request More Info (note only). Note is mandatory and limited to CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX chars.
  const [requestedInfo, setRequestedInfo] = useState('');
  const [submittingInfo, setSubmittingInfo] = useState(false);
  const isRequestNoteValid = requestedInfo.trim().length > 0 && requestedInfo.trim().length <= CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX;

  // Request Different Bank Details (note only). Note is mandatory and limited to CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX chars.
  const [requestedBankDetailsNote, setRequestedBankDetailsNote] = useState('');
  const [submittingBankDetailsRequest, setSubmittingBankDetailsRequest] = useState(false);
  const isBankDetailsRequestNoteValid = requestedBankDetailsNote.trim().length > 0 && requestedBankDetailsNote.trim().length <= CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX;

  // Reject flow: admins must provide a reason when rejecting
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submittingReject, setSubmittingReject] = useState(false);
  const [pendingRejectAction, setPendingRejectAction] = useState<WorkflowAction | null>(null);
  // Approve flow: confirmation and optional note
  const [approveNote, setApproveNote] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [submittingApprove, setSubmittingApprove] = useState(false);
  const [pendingApproveAction, setPendingApproveAction] = useState<WorkflowAction | null>(null);
  // Offer decline by customer: capture reason when customer declines an offer
  const [offerDeclineReason, setOfferDeclineReason] = useState('');
  const [showOfferDeclineModal, setShowOfferDeclineModal] = useState(false);
  const [submittingOfferDecline, setSubmittingOfferDecline] = useState(false);
  const [pendingOfferDeclineAction, setPendingOfferDeclineAction] = useState<WorkflowAction | null>(null);
  // Close / Cancel flow: capture reason when admin or customer closes/withdraws
  const [closeReason, setCloseReason] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<WorkflowAction | null>(null);
  
  // Modals
  const [showAssignAgent, setShowAssignAgent] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showRequestBankDetails, setShowRequestBankDetails] = useState(false);
  const [showDisbursement, setShowDisbursement] = useState(false);
  // Confirmation + reschedule modal state
  const { success: toastSuccess, error: toastError } = useToast();
  const [pendingConfirmAction, setPendingConfirmAction] = useState<null | { title: string; message?: string; onConfirm: () => Promise<void> | void }>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [pendingRescheduleAction, setPendingRescheduleAction] = useState<WorkflowAction | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  // Agent issue modal (for agent-reported reasons like customer not available or agent can't make it)
  const [showAgentIssueModal, setShowAgentIssueModal] = useState(false);
  const [pendingAgentIssueAction, setPendingAgentIssueAction] = useState<WorkflowAction | null>(null);
  const [agentIssueReason, setAgentIssueReason] = useState('');
  const [submittingAgentIssue, setSubmittingAgentIssue] = useState(false);
  // Complete inspection modal state (agent adds a note before completing)
  const [showCompleteInspectionModal, setShowCompleteInspectionModal] = useState(false);
  const [pendingCompleteInspectionAction, setPendingCompleteInspectionAction] = useState<WorkflowAction | null>(null);
  const [completeInspectionNote, setCompleteInspectionNote] = useState('');
  const [submittingCompleteInspection, setSubmittingCompleteInspection] = useState(false);

  // Direct Razorpay payment hook
  const { success: toastSuccess2, error: toastError2 } = useToast();
  const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
    onSuccess: () => {
      toastSuccess2('EMI payment successful!');
      window.location.reload();
    },
    onError: (errorMsg) => {
      toastError2(errorMsg || 'Payment failed');
    },
    onCancel: () => {
      toastError2('Payment was cancelled');
    },
  });
  
  // Disbursement form
  const [transactionRef, setTransactionRef] = useState('');
  const [disbursementFiles, setDisbursementFiles] = useState<UploadedFile[]>([]);
  const [submittingDisbursement, setSubmittingDisbursement] = useState(false);

  /**
   * Permission Model:
   * - Customer: Can only act on their OWN requests (customerId === userId)
   * - Agent: Can only act on requests ASSIGNED to them (assignedAgentId === userId)
   * - District Admin: Can only act on requests in THEIR districts
   * - Super Admin: Can act on ALL requests
   * 
   * Users with multiple roles are determined by actual ownership/assignment for this specific request.
   */
  const isSuperAdmin = auth.hasRole([ROLES.SUPER_ADMIN]);
  const isDistrictAdmin = auth.hasRole([ROLES.DISTRICT_ADMIN]);
  const hasAgentRole = auth.isAgent();
  const hasCustomerRole = auth.isCustomer();
  
  // Check actual ownership/assignment for THIS request
  const isRequestOwner = request && auth.user && request.customerId === auth.user.id;
  const isAssignedAgent = request && auth.user && request.assignedAgentId === auth.user.id;
  const hasDistrictAccess = request && auth.user && (
    isSuperAdmin || 
    (isDistrictAdmin && auth.user.districts.includes(request.district))
  );

  // Determine effective role for THIS request (based on actual permissions)
  // For multi-role users, prioritize higher privilege roles (admin > customer > agent)
  const isCustomer = isRequestOwner && hasCustomerRole && !hasDistrictAccess && !isSuperAdmin;
  const isAgent = isAssignedAgent && hasAgentRole && !hasDistrictAccess && !isSuperAdmin;
  const isAdmin = hasDistrictAccess && (isSuperAdmin || isDistrictAdmin);

  // Build user context with all roles
  const getUserRoles = (): UserRole[] => {
    const roles: UserRole[] = [];
    if (auth.hasRole([ROLES.SUPER_ADMIN])) roles.push(ROLES.SUPER_ADMIN);
    if (auth.hasRole([ROLES.DISTRICT_ADMIN])) roles.push(ROLES.DISTRICT_ADMIN);
    if (auth.isAgent()) roles.push(ROLES.AGENT);
    if (auth.isCustomer()) roles.push(ROLES.CUSTOMER);
    return roles;
  };

  // Get available actions from workflow engine (supports multi-role users)
  const availableActions = request && auth.user
    ? getActionsForUser(
        request.currentStatus as REQUEST_STATUS,
        {
          id: auth.user.id,
          roles: getUserRoles(),
          districts: auth.user.districts,
        },
        {
          customerId: request.customerId,
          district: request.district,
          agentId: request.assignedAgentId,
        }
      )
    : [];

  // Check if user can view this request
  const canView = request && auth.user
    ? canViewRequestDetail(
        {
          id: auth.user.id,
          roles: getUserRoles(),
          districts: auth.user.districts,
        },
        {
          customerId: request.customerId,
          district: request.district,
          agentId: request.assignedAgentId,
        },
        request.currentStatus as REQUEST_STATUS
      )
    : false;

  // Load request data
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const result = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(id));
        if (result.ok) {
          if (mounted) {
            setRequest(result.data.request as RequestDetail);
            
            // Check sessionStorage for upload flag
            const hasUploaded = sessionStorage.getItem(`uploaded_docs_${id}`) === 'true';
            if (hasUploaded) {
              setHasUploadedNewDocs(true);
            }
          }
        } else {
          toastError(result.error?.message || 'Failed to load request');
        }
      } catch (err) {
        toastError(ACTION_MESSAGES.NETWORK_ERROR);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, router]);

  // Load available agents when admin wants to assign
  const loadAgents = async () => {
    if (!request?.district) return;
    try {
      const result = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_AGENTS_BY_DISTRICT(request.district));
      if (result.ok) {
        setAgents(result.data.agents || []);
      }
    } catch (err) {
      // Silently fail, agents will be empty array
    }
  };

  // Handle agent assignment
  const handleAssignAgent = async () => {
    if (!selectedAgent) {
      toastError('Please select an agent');
      return;
    }
    if (!inspectionDate) {
      toastError('Please set inspection date');
      return;
    }

    setAssigningAgent(true);
    try {
      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGN_AGENT(id), {
        agentId: selectedAgent,
        inspectionDate: inspectionDate
      });
      if (result.ok) {
        setRequest(result.data.request);
        setShowAssignAgent(false);
        setInspectionDate('');
        toastSuccess('Agent assigned successfully with inspection scheduled');
      } else {
        toastError(result.error?.message || 'Failed to assign agent');
      }
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setAssigningAgent(false);
    }
  };

  // Quick inline offer handler removed; use the full CreateOfferModal instead

  // Handle status updates. Accept either a note string or a payload object (e.g. { requestedInspectionAt, note })
  const handleStatusUpdate = async (newStatus: string, payload?: string | Record<string, any>): Promise<boolean> => {
    try {
      const body: Record<string, any> = { status: newStatus };
      if (typeof payload === 'string') {
        body.note = payload;
      } else if (payload && typeof payload === 'object') {
        Object.assign(body, payload);
      }

      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_STATUS(id), body);
      if (result.ok) {
        setRequest(result.data.request);

        // Clear the upload flag when status changes
        sessionStorage.removeItem(`uploaded_docs_${id}`);
        setHasUploadedNewDocs(false);

        toastSuccess(ACTION_MESSAGES.SUCCESS);
        return true;
      } else {
        toastError(result.error?.message || ACTION_MESSAGES.ERROR);
        return false;
      }
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
      return false;
    }
  };

  // Handle bank details submission
  const handleBankDetailsSubmit = async () => {
    // Validate form
    const isValid = validateBankDetails();
    
    if (!isValid) {
      toastError('Please correct the validation errors before submitting');
      return;
    }
    
    setSubmittingBank(true);
    try {
      // Submit bank details to backend
      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_BANK_DETAILS(id), {
        bankAccountNumber: accountNumber.trim(),
        bankIfscCode: ifscCode.trim().toUpperCase(),
        bankAccountName: accountName.trim(),
        upiId: upiId.trim() || null,
      });
      
      if (result.ok) {
        toastSuccess('Bank details submitted successfully!');
        setShowBankDetails(false);
        // Reload to show updated status
        window.location.reload();
      } else {
        toastError(result.error?.message || 'Failed to submit bank details');
      }
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingBank(false);
    }
  };  const handleDisbursementSubmit = async () => {
    if (!transactionRef.trim()) {
      toastError('Please enter transaction reference/UTR number');
      return;
    }

    if (disbursementFiles.length === 0) {
      toastError('Please upload proof of transfer');
      return;
    }
    
    setSubmittingDisbursement(true);
    try {
      // Create document records for the proof files
      const documentsPayload = disbursementFiles.map((file, index) => ({
        fileKey: file.fileKey,
        fileName: `Disbursement Proof ${index + 1}`,
        fileSize: file.fileSize || 0, // Size not available from fileKey only
        fileType: file.fileType || 'application/octet-stream', // Default type
        documentType: DOCUMENT_TYPE.TRANSFER_PROOF,
        documentCategory: DOCUMENT_CATEGORY.TRANSFER_PROOF,
        requestId: request?.id,
        uploadedBy: auth.user?.id || '',
        description: `Disbursement proof document ${index + 1}`
      }));

      // First, create document records for the proof files
      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.CREATE_BULK, { documents: documentsPayload });

      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to create document records');
        // Continue anyway, don't block disbursement
      }

      // Update status to AMOUNT_DISBURSED with final summary note
      const note = `Amount Disbursed\nTransaction Ref: ${transactionRef}\n${disbursementFiles.length} proof document(s) uploaded`;
      const ok = await handleStatusUpdate(REQUEST_STATUS.AMOUNT_DISBURSED, note);
      if (!ok) {
        toastError('Failed to record disbursement');
        return;
      }

      toastSuccess('Disbursement recorded successfully!');
      setShowDisbursement(false);
      window.location.reload();
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingDisbursement(false);
    }
  };

  // Handle request more info submission
  const handleRequestMoreInfo = async () => {
    const note = requestedInfo && requestedInfo.trim() ? requestedInfo.trim() : '';
    if (!note) {
      toastError('Please provide a note describing what information is required');
      return;
    }
    if (note.length > CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX) {
      toastError(`Note must be at most ${CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX} characters`);
      return;
    }

    setSubmittingInfo(true);
    try {
      const ok = await handleStatusUpdate(REQUEST_STATUS.MORE_INFO_REQUIRED, note);
      if (ok) {
        setShowRequestInfo(false);
        setRequestedInfo('');
        toastSuccess('Request sent to customer');
      } else {
        toastError('Failed to request more info');
      }
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingInfo(false);
    }
  };

  // Handle request different bank details submission
  const handleRequestDifferentBankDetails = async () => {
    const note = requestedBankDetailsNote && requestedBankDetailsNote.trim() ? requestedBankDetailsNote.trim() : '';
    if (!note) {
      toastError('Please provide a note explaining what bank details need correction');
      return;
    }
    if (note.length > CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX) {
      toastError(`Note must be at most ${CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX} characters`);
      return;
    }

    setSubmittingBankDetailsRequest(true);
    try {
      const ok = await handleStatusUpdate(REQUEST_STATUS.PENDING_BANK_DETAILS, note);
      if (ok) {
        setShowRequestBankDetails(false);
        setRequestedBankDetailsNote('');
        toastSuccess('Bank details resubmission requested');
      } else {
        toastError('Failed to request bank details resubmission');
      }
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingBankDetailsRequest(false);
    }
  };

  // Handle comment posting (enforce 300 char limit)
  const handlePostComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

  // Enforce client-side max length
  const maxLen = CLIENT_CONSTANTS.COMMENT_MAX_LENGTH || 300;
  const content = trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;

    setPostingComment(true);
    try {
      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ADD_COMMENT(id), { content });
      if (result.ok) {
        setRequest(prev => prev ? {
          ...prev,
          comments: [result.data, ...(prev.comments || [])]
        } : null);
        setCommentText('');
      } else {
        if (result.status === 403) {
          // Comments disabled or forbidden
          toastError(result.error.message || 'Comments are disabled for this request');
          return;
        }
        toastError(result.error.message || 'Failed to post comment');
      }
    } catch (err) {
      toastError(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setPostingComment(false);
    }
  };

  // Handle document upload (consolidated for both agent and customer)
  const handleDocumentUpload = async (
    files: ClientUploadedFileData<{ fileKey: string; uploadedBy: string; fileName: string; fileSize: number; fileType: string }>[],
    documentType: string,
    documentCategory: string,
    successMessage: string
  ) => {
    try {
      setUploadProgress('Saving documents...');
      
      const documents = files.map((file) => ({
        fileKey: file.serverData?.fileKey || file.key,
        fileName: file.serverData?.fileName || file.name,
        fileSize: file.serverData?.fileSize || file.size || 0,
        fileType: file.serverData?.fileType || file.type,
        documentType,
        documentCategory,
        requestId: request?.id,
        uploadedBy: file.serverData?.uploadedBy,
        description: `${documentCategory} photo uploaded`
      }));

      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.CREATE_BULK, { documents });

      if (result.ok) {
        
        // Mark that new docs were uploaded (for enabling submit button)
        setHasUploadedNewDocs(true);
        
        // Persist upload state across reloads
        sessionStorage.setItem(`uploaded_docs_${request?.id}`, 'true');
        // Capture the fileKeys we just uploaded so the gallery can allow removal
        const uploadedFileKeys = documents.map(d => d.fileKey).filter(Boolean) as string[];
        if (uploadedFileKeys.length > 0) {
          setRecentlyUploadedFileKeys(prev => Array.from(new Set([...prev, ...uploadedFileKeys])));
        }
        
        // Refetch request to get updated documents with signed URLs
        const refreshResult = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(id));
        
        if (refreshResult.ok) {
          setRequest(refreshResult.data.request);
        }
        
  setUploadProgress('');

  // Show success message
  toastSuccess(successMessage);
      } else {
        throw new Error(result.error.message || 'Failed to save documents');
      }
    } catch (error) {
      setUploadProgress('');
      toastError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Persist staged uploads (called when user clicks Submit for MORE_INFO_REQUIRED or when agent completes inspection)
  // Accept override for document type/category so same function can be used for MORE_INFO and INSPECTION flows.
  const handleSubmitStagedUploads = async (opts?: { documentType?: string; documentCategory?: string; description?: string }): Promise<boolean | string[]> => {
    if (!request) {
      toastError('Request not loaded');
      return false;
    }
    if (!stagedUploads || stagedUploads.length === 0) {
      toastError('No files staged for submission');
      return false;
    }

    const documentType = opts?.documentType || 'MORE_INFO';
    const documentCategory = opts?.documentCategory || 'GENERAL';
    const description = opts?.description || (documentType === 'MORE_INFO' ? 'Customer submitted requested document' : 'Inspection photo uploaded by agent');

    try {
      setUploadProgress('Saving staged documents...');

      const documentsPayload = stagedUploads.map((s, index) => ({
        fileKey: s.fileKey,
        fileName: s.fileName || `Document ${index + 1}`,
        fileSize: s.fileSize || 0,
        fileType: s.fileType || 'application/octet-stream',
        documentType,
        documentCategory,
        requestId: request.id,
        uploadedBy: auth.user?.id || '',
        description
      }));

      const result = await createBulkDocuments({ documents: documentsPayload });

      // Persist flag across reloads so UI continues to reflect new docs
      sessionStorage.setItem(`uploaded_docs_${request.id}`, 'true');
      setHasUploadedNewDocs(true);

      // Clear staged uploads and update recently uploaded keys (they are now persisted)
      const persistedKeys = stagedUploads.map(s => s.fileKey).filter(Boolean) as string[];
      setStagedUploads([]);
      setRecentlyUploadedFileKeys(prev => Array.from(new Set([...prev, ...persistedKeys])));

      // Refresh request to show new documents
      const refreshResult = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(request.id));
      if (refreshResult.ok) {
        setRequest(refreshResult.data.request as RequestDetail);
      }

      setUploadProgress('');
      toastSuccess('Documents submitted');

      // Return created document IDs so callers (e.g., inspection complete) can include them in subsequent payloads
      return result?.documentIds || [];
    } catch (err: any) {
      setUploadProgress('');
      toastError((err && (err.message || err.toString())) || DOCUMENT_MESSAGES.UPLOAD_ERROR);
      return false;
    }
  };

  // Remove a staged upload (delete from storage since it's not persisted yet)
  const handleRemoveStagedUpload = async (fileKey: string) => {
    if (!fileKey) return false;
    if (!request) return false;

    try {
      // Call backend endpoint to delete uploadthing files by fileKey
      const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE_BY_FILEKEYS, { fileKeys: [fileKey] });

      if (result.ok) {
        // Remove from stagedUploads and recentlyUploadedFileKeys
        setStagedUploads(prev => prev.filter(s => s.fileKey !== fileKey));
        setRecentlyUploadedFileKeys(prev => prev.filter(k => k !== fileKey));

        // If no more staged uploads, clear the uploaded flag
        if (!stagedUploads || stagedUploads.length <= 1) {
          sessionStorage.removeItem(`uploaded_docs_${request.id}`);
          setHasUploadedNewDocs(false);
        }

        toastSuccess('File removed');
        return true;
      } else {
        throw new Error(result.error.message || 'Failed to delete file from storage');
      }
    } catch (err: any) {
      toastError((err && (err.message || err.toString())) || ACTION_MESSAGES.NETWORK_ERROR);
      return false;
    }
  };

  // Get signed URL for document display
  const getSignedUrl = (fileKey: string) => {
    return `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.SIGNED_URL(fileKey)}?expiresIn=${CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT}`;
  };

  // Helper: scroll to comments section (or bottom) when user wants to reply
  const scrollToComments = () => {
    try {
      const el = document.getElementById('comments-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // focus the input if present
        const input = el.querySelector('textarea, input') as HTMLTextAreaElement | HTMLInputElement | null;
        if (input) input.focus();
        return;
      }
    } catch (e) {
      // ignore
    }
    // fallback: scroll to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // Render EMI schedule card (actual loan or admin preview)
  const renderEmiSchedule = () => {
    return (
      <Card className="mb-3 mt-2">
        <CardHeader>
          <CardTitle>{request!.loan ? 'EMI Schedule' : 'EMI Schedule Preview'}</CardTitle>
          <CardDescription>
            {request!.loan ? 'Scheduled EMIs for the approved loan' : 'Proposed monthly payment schedule - dates will be set after disbursement'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show actual loan if exists, otherwise show preview */}
          {request!.loan && request!.loan.emisSchedule && request!.loan.emisSchedule.length > 0 ? (
            <>
              {/* Actual Loan Summary */}
              <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
                  <p className="text-lg font-bold">₹{request!.loan.approvedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                  <p className="text-lg font-bold">₹{request!.loan.emiAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                  <p className="text-lg font-bold">{request!.loan.interestRate}% p.a.</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                  <p className="text-lg font-bold">{request!.loan.tenureMonths} months</p>
                </div>
              </div>

              {/* Actual EMI Schedule Table */}
              <div className="overflow-x-auto">
                <EmiScheduleTable rows={request!.loan.emisSchedule} mode="loan" />
              </div>

              {/* Loan Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-base font-bold">₹{request!.loan.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Paid EMIs</p>
                  <p className="text-base font-bold text-green-600">{request!.loan.paidEMIs}/{request!.loan.tenureMonths}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
                  <p className="text-base font-bold text-green-600">₹{request!.loan.totalPaidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                  <p className="text-base font-bold text-orange-600">₹{(request!.loan.remainingAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </>
          ) : request!.adminEmiSchedule ? (
            <>
              {/* Preview from adminEmiSchedule (subtle info) */}
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="rounded-full bg-primary/10 text-primary p-2 shrink-0">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs">This is the proposed EMI schedule (EMIs are calculated on the offered amount). Disbursed amount will be reduced by processing fee at the time of transfer.</div>
                  </div>
                </div>
              </div>

              {/* Simplified Preview - Only Principal, Interest, Amount */}
              <div className="overflow-x-auto">
                <EmiScheduleTable rows={request!.adminEmiSchedule.emiSchedule} mode="preview" />
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                  <p className="text-base font-bold text-orange-600">₹{request!.adminEmiSchedule.totalInterest?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Repayment</p>
                  <p className="text-base font-bold">₹{request!.adminEmiSchedule.totalPayment?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Number of EMIs</p>
                  <p className="text-base font-bold">{request!.adminEmiSchedule.emiSchedule?.length || 0} payments</p>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  // Single Offer Card (consolidated) - shows request/admin offer details with role-aware copy
  const OfferCard = () => {
    if (!hasOffer || !request) return null;
    const processingFee = Number((request as any).adminProcessingFee ?? 0);
    const offeredAmount = Number(request.adminOfferedAmount ?? 0);
    const netDisbursed = Math.max(0, offeredAmount - processingFee);

    return (
      <Card className="mb-3">
        <CardHeader>
          <CardTitle className="text-lg">{isCustomer ? '💰 Your Loan Offer' : 'Loan Offer Details'}</CardTitle>
          <CardDescription>{isCustomer ? 'Review the offer and next steps' : 'Offer prepared by admin — full terms'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-medium mb-1 text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {isCustomer ? 'You Requested' : 'Requested Amount'}
              </p>
              <p className="text-xl sm:text-2xl font-bold flex items-center gap-2 line-through text-muted-foreground">
                <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
                {request.requestedAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-medium mb-1 text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                {isCustomer ? 'We Can Offer' : 'Approved Amount'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
                  {offeredAmount.toLocaleString('en-IN')}
                </p>
                {offeredAmount !== request.requestedAmount && (
                  <Badge variant={(offeredAmount || 0) > request.requestedAmount ? 'default' : 'destructive'} className="text-xs">
                    {(offeredAmount || 0) > request.requestedAmount ? '+' : ''}
                    {(((offeredAmount || 0) - request.requestedAmount) / Math.max(request.requestedAmount,1) * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                <p className="text-lg font-bold">{request.adminInterestRate}% p.a.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                <p className="text-lg font-bold">{request.adminTenureMonths} months</p>
              </div>
              {request.adminEmiSchedule?.monthlyPayment && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                  <p className="text-lg font-bold">₹{request.adminEmiSchedule.monthlyPayment.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-sm">Processing Fee</p>
                <p className="text-base font-semibold">₹{processingFee.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground mt-1">Estimated disbursed: <span className="font-semibold">₹{netDisbursed.toLocaleString('en-IN')}</span></p>
              </div>

              <div>
                {(request.penaltyPercentage || request.lateFeePercentage) ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Late payment charges</p>
                    <div className="flex gap-3 items-center">
                      {request.penaltyPercentage && <p className="text-sm font-semibold">Penalty: {request.penaltyPercentage}% / month</p>}
                      {request.lateFeePercentage && <p className="text-sm font-semibold">Late fee: {request.lateFeePercentage}% / day</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No penalty terms specified</p>
                )}
              </div>
            </div>
          </div>

          {request.adminEmiSchedule && (
            <div className="mt-4">{renderEmiSchedule()}</div>
          )}

          <div className="mt-4">
            {isCustomer &&
              <p className="text-sm">If you accept this offer, click <strong>Accept</strong>. If you want revisions, click <strong>Decline</strong> and provide feedback.</p>
            }
          </div>
        </CardContent>
      </Card>
    );
  };

  // Delete a document (used by customer when they need to remove an uploaded file)
  const handleDeleteDocument = async (documentId: string): Promise<boolean> => {
    try {
  // Use centralized API helper which handles body and error mapping.
  // For user-initiated removals we permanently delete so the document
  // is removed from the DB and will not appear in subsequent request fetches.
  await deleteDocument(documentId, true);

      // Refresh request to get updated documents
      const refreshResult = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(id));
      if (refreshResult.ok) {
        const refreshedRequest = refreshResult.data.request as RequestDetail;
        setRequest(refreshedRequest);

        // Reconcile recently uploaded file keys: keep only those keys still present on the server
        const currentFileKeys = (refreshedRequest.documents || []).map(d => d.fileKey).filter(Boolean) as string[];
        setRecentlyUploadedFileKeys(prev => prev.filter(pk => currentFileKeys.includes(pk)));
      }

      toastSuccess('Document removed');
      return true;
    } catch (err: any) {
      toastError((err && (err.message || err.toString())) || ACTION_MESSAGES.NETWORK_ERROR);
      return false;
    }
  };

  // Handle workflow actions
  const handleWorkflowAction = async (action: WorkflowAction) => {
    // Special handling for submit-info: persist staged uploads before changing status
  if (action.id === 'submit-info' && request && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED) {
      // If there are staged uploads, persist them first
      if (stagedUploads && stagedUploads.length > 0) {
        const ok = await handleSubmitStagedUploads();
        if (!ok) return; // if submit failed, abort
      } else {
        toastError('Please upload at least one document before submitting');
        return;
      }

      // After persisting, continue with the normal status update
      await handleStatusUpdate(action.targetStatus);
      return;
    }

    // Agent completing inspection: open modal to collect note, then persist staged photos and transition status
    if (action.id === 'complete-inspection' && request && request.currentStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS) {
      setPendingCompleteInspectionAction(action);
      setCompleteInspectionNote('');
      setShowCompleteInspectionModal(true);
      return;
    }
    if (action.id === 'make-offer' || action.id === 'revise-offer' || action.id === 'make-new-offer') {
      // Prefill modal fields when revising or when request has existing offer data
      if (request) {
        setCreateOfferInitial({
          amount: request.adminOfferedAmount ?? undefined,
          tenureMonths: request.adminTenureMonths ?? undefined,
          interestRate: request.adminInterestRate ?? undefined,
          penaltyPercentage: request.penaltyPercentage ?? undefined,
          lateFeePercentage: request.lateFeePercentage ?? undefined,
          processingFee: (request as any).adminProcessingFee ?? undefined,
        });
      } else {
        setCreateOfferInitial(undefined);
      }
      setShowOffer(true);
      return;
    }
    if (action.id === 'assign-agent' || action.id === 'reassign-agent') {
      setSelectedAgent(''); // Clear previous selection
      setShowAssignAgent(true);
      loadAgents();
      return;
    }
    if (action.id === 'submit-bank-details') {
      setShowBankDetails(true);
      return;
    }
    if (action.id === 'disburse-amount') {
      setShowDisbursement(true);
      return;
    }
    if (action.id === 'request-more-info') {
      setShowRequestInfo(true);
      return;
    }
    if (action.id === 'request-different-details') {
      // Pre-fill existing bank details for admin to see what needs correction
      if (request) {
        setAccountNumber(request.bankAccountNumber || '');
        setIfscCode(request.bankIfscCode || '');
        setAccountName(request.bankAccountName || '');
        setUpiId(request.upiId || '');
      }
      setShowRequestBankDetails(true);
      return;
    }
    if (action.id === 'request-reschedule') {
      // Open reschedule modal (handled below)
      setShowReschedule(true);
      // Store target status and action for confirm handler
      setPendingRescheduleAction(action);
      return;
    }
    // Agent-specific issue flows: collect a reason from the agent before submitting
    if (action.id === 'customer-not-available' || action.id === 'cancel-agent') {
      // Show modal where agent must provide a reason; note will be sent as the status note
      setPendingAgentIssueAction(action);
      setAgentIssueReason('');
      setShowAgentIssueModal(true);
      return;
    }
    // If this action is a rejection of the entire application, open the reject modal (admin flow)
    if (String(action.targetStatus).toUpperCase() === REQUEST_STATUS.REJECTED || (action.id && action.id.toLowerCase().includes('reject'))) {
      setPendingRejectAction(action);
      setRejectReason('');
      setShowRejectModal(true);
      return;
    }

    // If this action is an approval (admin flow), open the approve modal to capture optional note and confirmation
    if (String(action.targetStatus).toUpperCase() === REQUEST_STATUS.APPROVED || (action.id && action.id.toLowerCase().includes('approve'))) {
      setPendingApproveAction(action);
      setApproveNote('');
      setShowApproveModal(true);
      return;
    }

    // If this action closes/cancels the request (admin close or customer withdraw), capture a reason via modal
    if (String(action.targetStatus).toUpperCase() === REQUEST_STATUS.CANCELLED) {
      setPendingCloseAction(action);
      setCloseReason('');
      setShowCloseModal(true);
      return;
    }

    // If customer is declining an offer, capture reason via modal
    if (String(action.targetStatus).toUpperCase() === REQUEST_STATUS.OFFER_DECLINED && isCustomer) {
      setPendingOfferDeclineAction(action);
      setOfferDeclineReason('');
      setShowOfferDeclineModal(true);
      return;
    }
    
    // For actions with custom handlers (like create-emi-schedule)
    if (action.id === 'create-emi-schedule') {
      // Executing create-emi-schedule action
      // Use confirmation dialog below if required
      setPendingConfirmAction({
        title: action.label || 'Confirm',
        message: action.requiresConfirmation ? `Are you sure you want to ${action.label.toLowerCase()}? This will create the loan and EMI schedule.` : (action.description || ''),
        onConfirm: async () => {
          const success = await executeRequestAction(
            action.id,
            {
              requestId: id,
              onSuccess: (data) => {
                // Action succeeded
                // Reload the page to show the updated loan data
                window.location.reload();
              },
              onError: (error) => {
                // Action failed
                toastError(error || 'Failed to create loan and EMI schedule');
              }
            }
          );
        }
      });
      return;
    }
    
    // For simple status transitions
    if (action.requiresConfirmation) {
      setPendingConfirmAction({
        title: action.label || 'Confirm',
        message: action.description || `Are you sure you want to ${action.label.toLowerCase()}?`,
        onConfirm: async () => {
          await handleStatusUpdate(action.targetStatus);
        }
      });
      return;
    }

    handleStatusUpdate(action.targetStatus);
  };

  // Map icon names to actual icon components
  const iconMap: Record<string, any> = {
    XCircle, CheckCircle, FileSearch: Eye, FilePlus: TrendingUp, 
    MessageCircle: AlertCircle, Pause: Clock, UserPlus: Users,
    Upload, Edit: PenTool, Ban: XCircle, RefreshCw: TrendingUp,
    Archive: XCircle, Play: Eye, Send, CreditCard
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 text-lg font-semibold">Request not found</p>
        </div>
      </div>
    );
  }

  // Access control: Only show request to authorized users
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 text-lg font-semibold">Access Denied</p>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to view this request.
          </p>
        </div>
      </div>
    );
  }

  const timelineEvents = buildTimeline(request, Boolean(isAdmin));
  const hasOffer = request.adminOfferedAmount && request.adminTenureMonths && request.adminInterestRate;
  const showOfferEarly = Boolean(hasOffer && ![REQUEST_STATUS.ACTIVE, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.REJECTED, REQUEST_STATUS.CANCELLED].includes(request.currentStatus as REQUEST_STATUS));
  const showOfferToCustomer = isCustomer && hasOffer && [
    REQUEST_STATUS.OFFER_SENT,
    REQUEST_STATUS.OFFER_ACCEPTED,
    REQUEST_STATUS.OFFER_DECLINED
  ].includes(request.currentStatus as REQUEST_STATUS);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Card - Friendly & Contextual */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Welcome Message */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                      {isCustomer && '👋 Your Loan Application'}
                      {isAgent && '🔍 Inspection Request'}
                      {(isAdmin || isSuperAdmin) && '📋 Loan Application Review'}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {isCustomer && 'Track your loan application status and complete required steps'}
                      {isAgent && 'Review asset details and complete on-site inspection'}
                      {(isAdmin || isSuperAdmin) && 'Review application and make lending decision'}
                    </p>
                  </div>
                  <StatusBadge status={request.currentStatus} />
                </div>
                
                {/* Application Number */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Application No:</span>
                  <span className="text-sm font-bold">{request.requestNumber || 'N/A'}</span>
                </div>
              </div>
              
              {/* Quick Stats - Customer Friendly */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <IndianRupee className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Loan Amount</p>
                    <p className="text-sm font-bold">₹{(request.adminOfferedAmount ?? request.requestedAmount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Location</p>
                    <p className="text-sm font-bold">{request.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Applied On</p>
                    <p className="text-sm font-bold">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Item Type</p>
                    <p className="text-sm font-bold">{request.assetType || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
            </Card>
          {/* Inspection Details */}
          {request.currentStatus === REQUEST_STATUS.INSPECTION_SCHEDULED && (
            <InspectionCard request={request} isCustomer={isCustomer} isAdmin={isAdmin} isAgent={isAgent} />
          )}
          {/* Admin: Comment Controls (always visible to admins) - placed early so admins can toggle anytime */}
          {isAdmin && (
            <Card className="mb-3">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  Comment Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Allow customers and agents to post comments on this application. Toggle anytime.</p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={async () => {
                        if (!request) return;
                        const newVal = !(request.commentsEnabled ?? true);
                        setTogglingCommentsFlag(true);
                        try {
                          const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_COMMENTS_ENABLED(request.id), { enabled: newVal });
                          if (result.ok) {
                            if (result.data && result.data.request) {
                              setRequest(result.data.request as RequestDetail);
                              toastSuccess('Comment permissions updated');
                            } else {
                              setRequest(prev => prev ? { ...prev, commentsEnabled: newVal } : prev);
                              toastSuccess('Comment permissions updated');
                            }
                          } else {
                            toastError(result.error.message || 'Failed to update comment permissions');
                          }
                        } catch (err) {
                          toastError(ACTION_MESSAGES.NETWORK_ERROR);
                        } finally {
                          setTogglingCommentsFlag(false);
                        }
                      }}
                      disabled={togglingCommentsFlag}
                    >
                      {togglingCommentsFlag ? 'Updating...' : (request?.commentsEnabled ? 'Disable Comments' : 'Enable Comments')}
                    </Button>
                    <div className="text-sm text-muted-foreground">Current: <span className="font-medium">{request?.commentsEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Action Buttons - Using Centralized Workflow Engine (always show right after header) */}
      {availableActions.length > 0 && (
        <Card className="mb-3 sm:mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Available Actions</CardTitle>
            <CardDescription>Workflow actions based on your role and request status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {/* Dynamically render actions from workflow matrix */}
              {(() => {
                const withdrawActionIds = new Set(['withdraw-request', 'withdraw']);
                const NO_WITHDRAW_STATUSES = new Set([
                  REQUEST_STATUS.PENDING_SIGNATURE,
                  REQUEST_STATUS.PENDING_BANK_DETAILS,
                  REQUEST_STATUS.ACTIVE,
                  REQUEST_STATUS.AMOUNT_DISBURSED,
                  REQUEST_STATUS.COMPLETED,
                ]);

                const actionsToRender = (availableActions || []).filter(a => {
                  // Prevent showing withdraw action to customers after offer acceptance and once the flow reaches PENDING_SIGNATURE and beyond
                  if (isCustomer && withdrawActionIds.has(a.id)) {
                    // Hide on OFFER_ACCEPTED and all statuses in NO_WITHDRAW_STATUSES
                    if (request.currentStatus === REQUEST_STATUS.OFFER_ACCEPTED) return false;
                    if (NO_WITHDRAW_STATUSES.has(request.currentStatus as REQUEST_STATUS)) return false;
                  }
                  return true;
                });
                return actionsToRender.map((action) => {
                  const IconComponent = iconMap[action.icon || ''] || FileText;

                  // Special handling for submit-info action in MORE_INFO_REQUIRED status
                  if (action.id === 'submit-info' && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED) {
                    // Only check if new documents were uploaded in THIS session
                    const canSubmit = hasUploadedNewDocs;

                    return (
                      <div key={action.id} className="flex items-center gap-2">
                        <Button
                          variant={action.variant || 'default'}
                          onClick={() => handleWorkflowAction(action)}
                          disabled={!canSubmit}
                          title={canSubmit ? action.description : 'Please upload at least one document first'}
                        >
                          <IconComponent className="h-4 w-4 mr-2" />
                          {action.label}
                        </Button>
                        {!canSubmit && (
                          <span className="text-xs text-muted-foreground italic">
                            Upload documents first ↓
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Button
                      key={action.id}
                      variant={action.variant || 'default'}
                      onClick={() => handleWorkflowAction(action)}
                      title={action.description}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {action.label}
                    </Button>
                  );
                });
              })()}
              
              {/* Customer Pay EMI Button */}
              {isCustomer && request.loan && request.loan.emisSchedule && request.loan.emisSchedule.length > 0 && request.currentStatus === REQUEST_STATUS.ACTIVE && (() => {
                const nextPending = request.loan.emisSchedule.find((e) => e.status === EMI_STATUS.PENDING || e.status === EMI_STATUS.OVERDUE);
                if (!nextPending) return null;
                
                return (
                  <Button
                    key="pay-emi"
                    variant={nextPending.status === EMI_STATUS.OVERDUE ? 'destructive' : 'default'}
                    onClick={() => {
                      if (request.loan) {
                        initiatePayment({
                          loanId: request.loan.id,
                          emiId: nextPending.id,
                          emiNumber: nextPending.emiNumber,
                        });
                      }
                    }}
                    disabled={isPaymentProcessing}
                    title={`Pay EMI #${nextPending.emiNumber}`}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay EMI #{nextPending.emiNumber} – ₹{(nextPending.emiAmount + (nextPending.lateFee ?? 0)).toLocaleString()}
                  </Button>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Simplified Agreement / Signature Card */}
        {request && request.currentStatus === REQUEST_STATUS.PENDING_SIGNATURE && (
          (() => {
            const agreementEndpoint = `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GENERATE_AGREEMENT(request.id)}`;

            const signedAgreementDoc = (request.documents || []).find(d => d.documentType === DOCUMENT_TYPE.LOAN_AGREEMENT) || null;
            const signedHistoryEntry = (request.requestHistory || []).find(h => h.action === REQUEST_HISTORY_ACTION.SIGNED_AGREEMENT_UPLOADED) || null;
            const signedAt = signedHistoryEntry ? new Date(signedHistoryEntry.createdAt).toLocaleDateString() : null;
            const signedAgreementUrl = signedAgreementDoc && signedAgreementDoc.fileKey ? getSignedUrl(signedAgreementDoc.fileKey) : null;
            const isSigned = !!signedAgreementDoc;

            const handleDownload = async (signed: boolean = false) => {
              try {
                // If signed flag is set, attempt to download signed agreement URL (if available)
                if (signed && isSigned && signedAgreementUrl) {
                  const result = await downloadDocumentBlob(signedAgreementUrl);
                  if (result.ok) {
                    const blob = result.data;
                    const tempUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = tempUrl;
                    a.download = `signed-agreement-${request.requestNumber || request.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(tempUrl);
                    return;
                  } else {
                    throw new Error(result.error?.message || 'Failed to download signed agreement');
                  }
                }

                const result = await downloadDocumentBlob(agreementEndpoint);
                if (result.ok) {
                  const blob = result.data;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `loan-agreement-${request.requestNumber || request.id}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } else {
                  toastError(result.error?.message || 'Failed to download agreement');
                }
              } catch (e) {
                console.error('Download failed', e);
              }
            };

            const handlePreview = async () => {
              try {
                const result = await getAgreementPreviewUrl(request.id);
                if (result.ok) {
                  const url = result.data.url;
                  if (url) {
                    setPreviewSource({ url, mimeType: 'application/pdf', title: `Loan Agreement - ${request.requestNumber || request.id}` });
                    setPreviewOpen(true);
                  }
                } else {
                  toastError(result.error?.message || 'Failed to prepare preview');
                }
              } catch (e) {
                console.error('Preview failed', e);
              }
            };

            const handlePreviewSigned = async () => {
              if (!isSigned || !signedAgreementUrl) return;
              setPreviewSource({ url: signedAgreementUrl, mimeType: 'application/pdf', title: `Signed Agreement - ${request.requestNumber || request.id}` });
              setPreviewOpen(true);
            };

            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-lg">Loan Agreement & Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Button size="sm" onClick={handlePreview}>
                        <Eye className="h-4 w-4 mr-2" /> Preview Agreement
                      </Button>
                      {!isAgent && (
                        <Button size="sm" variant="outline" onClick={() => handleDownload(false)}>
                          <Download className="h-4 w-4 mr-2" /> Download Agreement
                        </Button>
                      )}
                      {isSigned && (
                        <Button size="sm" variant="ghost" onClick={handlePreviewSigned}>
                          <Eye className="h-4 w-4 mr-2" /> View Signed
                        </Button>
                      )}
                    </div>

                    {/* Signature pad for customers */}
                    {auth.isCustomer() && !isSigned && (
                      <div>
                        <SignaturePad
                          requestId={request!.id}
                          requestNumber={request!.requestNumber || request!.id}
                          disableDownload={true}
                          disableAutoSave={true}
                          onSave={async (signatureDataUrl: string) => {
                            setSigningSaving(true);
                            try {
                              // Send signature to backend for digital signing
                              const result = await signAgreement(request.id, signatureDataUrl);
                              if (!result.ok) {
                                throw new Error(result.error?.message || 'Failed to sign agreement');
                              }

                              const signedUrl = result.data.signedUrl;

                              // Refresh request to show updated status
                              const refreshResult = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(request.id));
                              if (refreshResult.ok) {
                                const refreshData = refreshResult.data;
                                if (refreshData && refreshData.request) {
                                  setRequest(refreshData.request as RequestDetail);
                                }
                              }

                              if (signedUrl) {
                                setPreviewSource({ url: signedUrl, mimeType: 'application/pdf', title: `Signed Agreement - ${request.requestNumber || request.id}` });
                                setPreviewOpen(true);
                              }

                              toastSuccess('Agreement signed successfully!');
                            } catch (error) {
                              toastError(error instanceof Error ? error.message : 'Failed to sign agreement');
                              throw error; // Re-throw so SignaturePad can display the error to user
                            } finally {
                              setSigningSaving(false);
                            }
                          }}
                          inline
                        />
                      </div>
                    )}

                    {/* Upload / Processing progress */}
                    {uploadProgress ? (
                      <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <div className="text-sm text-muted-foreground">{uploadProgress}</div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })()
        )}

      {/* Admin: show agent-provided reasons for customer/agent availability issues */}
      {request.currentStatus === REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE && (
        (() => {
          const note = getLatestStatusNote(request, REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE);
          // Admin sees full note; customers see a generic message further down
          if (isAdmin) {
            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>Customer Not Available (agent note)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Agent reported the customer was not available for inspection. Reason recorded by agent:</p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{note || 'No reason provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // Customer-friendly generic message (no agent note exposed)
          if (isCustomer) {
            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>Inspection attempt</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Our agent attempted the inspection but couldn't complete it. Our team will follow up to reschedule.</p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return null;
        })()
      )}

      {request.currentStatus === REQUEST_STATUS.AGENT_NOT_AVAILABLE && (
        (() => {
          const note = getLatestStatusNote(request, REQUEST_STATUS.AGENT_NOT_AVAILABLE);
          if (isAdmin) {
            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-rose-700" />
                    <span>Agent Not Available (agent note)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Agent reported they couldn't make the scheduled inspection. Reason recorded by agent:</p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{note || 'No reason provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (isCustomer) {
            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>Inspection update</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Our agent couldn't make the scheduled inspection. We'll contact you to arrange a new time.</p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return null;
        })()
      )}

      {/* Admin: show card when customer has requested an inspection reschedule */}
      {isAdmin && request.currentStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED && (
        (() => {
          const requestedDate = getLatestRequestedInspectionDate(request);
          const note = getLatestStatusNote(request, REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED);
          return (
            <Card className="mb-3">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Customer requested inspection reschedule</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">The customer has requested to change the inspection date.</p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">Requested Date: <span className="font-medium">{requestedDate ? (new Date(requestedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : 'Not specified'}</span></p>
                    {note && (
                      <p className="text-sm mt-2 text-muted-foreground">Note: {note}</p>
                    )}
                  </div>

                  {/* Actions intentionally hidden on this card; manage assignments from the Assign/Reschedule flow */}
                </div>
              </CardContent>
            </Card>
          );
        })()
      )}

      {/* When an offer is declined by customer, show reason to admin (moved up near actions) */}
      {isAdmin && request.currentStatus === REQUEST_STATUS.OFFER_DECLINED && (
        (() => {
          const reason = getLatestStatusNote(request, REQUEST_STATUS.OFFER_DECLINED);
          return (
            <Card className="mb-3">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <span>Offer Declined</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">The customer declined the offer. Reason (if provided):</p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{reason || 'No reason provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()
      )}

      {/* When request is CANCELLED, show a top-card depending on who closed/withdrew */}
      {request.currentStatus === REQUEST_STATUS.CANCELLED && (
        (() => {
          const reason = getLatestStatusNote(request, REQUEST_STATUS.CANCELLED);
          const actorType = getLatestStatusActorType(request, REQUEST_STATUS.CANCELLED);

          // If the latest CANCELLED action was performed by the customer
          if (actorType === 'customer') {
            // If the current viewer is the customer (owner), show 'You withdrew'
            if (isCustomer) {
              return (
                <Card className="mb-3">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      <span>Request Withdrawn</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">You withdrew this request. Reason:</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">{reason || 'No reason provided'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // Admin or others see who withdrew it
            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    <span>Withdrawn by Customer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">The customer withdrew this request. Reason:</p>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{reason || 'No reason provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // If admin closed it
          if (actorType === 'admin') {
            // Attempt to detect if current viewer performed the cancel so we can show "You cancelled" copy
            const cancelledHistory = (request.requestHistory || []).filter(h => {
              const meta = (h.metadata || {}) as any;
              return Boolean((meta && meta.toStatus === REQUEST_STATUS.CANCELLED) || h.action === REQUEST_STATUS.CANCELLED);
            });
            let latestActorId: string | null = null;
            if (cancelledHistory && cancelledHistory.length > 0) {
              cancelledHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const latest = cancelledHistory[0] as any;
              if (latest && latest.actor && latest.actor.id) latestActorId = latest.actor.id;
              // fallback: metadata.performedBy
              if (!latestActorId && latest && latest.metadata && (latest.metadata.performedBy || latest.metadata.actorId)) {
                latestActorId = latest.metadata.performedBy || latest.metadata.actorId || null;
              }
            }

            const viewerDidIt = Boolean(latestActorId && auth.user && latestActorId === auth.user.id);

            return (
              <Card className="mb-3">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    <span>{viewerDidIt ? 'You cancelled this request' : 'Request Cancelled by Admin'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{viewerDidIt ? 'You cancelled this request. Reason:' : 'An admin cancelled this request. Reason:'}</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">{reason || 'No reason provided'}</p>
                      </div>

                      {/* If admin cancelled and the current viewer is the customer, show actions similar to Rejected card */}
                      {actorType === 'admin' && isCustomer && !viewerDidIt && (
                        (() => {
                          const commentsAllowed = Boolean(request.commentsEnabled);
                          return (
                            <div className="mt-3 flex items-center gap-2">
                              {commentsAllowed ? (
                                <Button size="sm" variant="outline" onClick={scrollToComments} className="text-rose-700 border-rose-200">
                                  <MessageCircle className="h-4 w-4 mr-2" /> Ask for clarification
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => window.location.href = 'mailto:support@fundifyhub.com?subject=Question%20about%20cancelled%20request'} className="text-rose-700">
                                  Contact Support
                                </Button>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                </CardContent>
              </Card>
            );
          }

          // Agent or system or unknown
          return (
            <Card className="mb-3">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <span>Request Cancelled</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">This request has been cancelled. Reason:</p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">{reason || 'No reason provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()
      )}

    {/* Offer / Quick-Offer area: show the OfferCard only when an offer exists AND the request is in an offer-related status
      (OFFER_SENT, OFFER_ACCEPTED, OFFER_DECLINED). This prevents showing offers in PENDING, UNDER_REVIEW, REJECTED, CANCELLED, etc. */}
    {showOfferEarly && <OfferCard />}

      {/* Loan Summary & EMI Payments Cards - For both Customer and Admin */}
      {request.loan && (request.currentStatus === REQUEST_STATUS.ACTIVE || request.currentStatus === REQUEST_STATUS.PAYMENT_OVERDUE) && (
        <>
          {/* Loan Summary Card */}
          <LoanSummaryCard
            loan={request.loan}
            isCustomer={isCustomer || undefined}
            isAdmin={isAdmin || undefined}
          />

          {/* EMI Payments Card */}
          <EMIPaymentsCard
            loan={request.loan}
            onPayEMI={(emiId, breakdown) => {
              const selectedEmi = request.loan?.emisSchedule?.find(e => e.id === emiId);
              if (selectedEmi && request.loan) {
                initiatePayment({
                  loanId: request.loan.id,
                  emiId: selectedEmi.id,
                  emiNumber: selectedEmi.emiNumber,
                });
              }
            }}
            isCustomer={isCustomer || undefined}
            isAdmin={isAdmin || undefined}
          />
        </>
      )}

      {/* Bank Details Display Card - After Loan Card */}
      {request.bankAccountNumber && request.bankDetailsSubmittedAt && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              {isCustomer ? '🏦' : <CreditCard className="h-4 w-4 shrink-0" />}
              <span>{isCustomer ? 'Your Bank Account' : 'Bank Details'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left side - Bank Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Account Holder</p>
                  <p className="text-sm font-medium">{request.bankAccountName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                  <p className="text-sm font-mono font-medium">{request.bankAccountNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">IFSC Code</p>
                  <p className="text-sm font-mono font-medium">{request.bankIfscCode}</p>
                </div>
                {request.upiId && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">UPI ID</p>
                    <p className="text-sm font-mono font-medium">{request.upiId}</p>
                  </div>
                )}
              </div>

              {/* Right side - Submission Info */}
              <div className="shrink-0 lg:border-l lg:pl-6">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <p className="font-medium text-sm">
                    {isCustomer
                      ? 'You submitted'
                      : `Customer ${request.customer?.firstName} ${request.customer?.lastName} submitted`
                    }
                  </p>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {new Date(request.bankDetailsSubmittedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Inspection Alert - Points to upload section below */}
      {isAgent && request.currentStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS && (
        <Card className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-lg">
                  📸 Inspection Photos Required
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Please upload inspection photos in the <strong>Documents section below</strong> before completing the inspection.
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-lg px-3 py-2">
                  <span className="text-base">�</span>
                  <span>Scroll down to the <strong>"Upload Inspection Photos"</strong> section</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature helper (moved into Agreement card). Removed duplicate top-banner to keep single source of truth */}

      {/* Bank Details Alert - For Customer in PENDING_BANK_DETAILS status */}
      {isCustomer && request.currentStatus === REQUEST_STATUS.PENDING_BANK_DETAILS && (
        <Card className="mb-4 shadow-sm rounded-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 text-lg">
                  🏦 {request.bankAccountNumber ? 'Bank Details Need Correction' : 'Bank Details Required'}
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  {request.bankAccountNumber 
                    ? 'Our team has requested you to resubmit your bank details. Please provide corrected information for loan disbursement.'
                    : 'Almost done! Please provide your bank account details for loan disbursement.'
                  }
                </p>
                {(() => {
                  const adminNote = getLatestStatusNote(request, REQUEST_STATUS.PENDING_BANK_DETAILS);
                  if (adminNote) {
                    return (
                      <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-md">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">Correction Required:</p>
                        <p className="text-sm text-purple-800 dark:text-purple-200">{adminNote}</p>
                      </div>
                    );
                  }
                  return null;
                })()}
                <Button 
                  onClick={() => {
                    // Pre-fill existing bank details when resubmitting
                    if (request.bankAccountNumber) {
                      setAccountNumber(request.bankAccountNumber);
                      setIfscCode(request.bankIfscCode || '');
                      setAccountName(request.bankAccountName || '');
                      setUpiId(request.upiId || '');
                    }
                    setShowBankDetails(true);
                  }}
                  className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {request.bankAccountNumber ? 'Resubmit Bank Details' : 'Submit Bank Details'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Requested Info Alert - For Customer */}
      {isCustomer && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED && (
        <Card className="mb-4 shadow-sm rounded-lg">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-600/10 text-amber-700 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Action Required: Additional Information</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      <strong className="font-medium">Requested by our team:</strong>
                      <span className="block mt-1">{getLatestAdminRequestedInfo(request) || 'Please upload the requested documents or information.'}</span>
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">💡 Use the "Select Files" button below to upload up to 4 files (images or PDFs). After uploading, click the <strong>Submit</strong> action at the top to complete your response.</p>
                  </div>
                  <div className="shrink-0 ml-4">
                    <Button size="sm" variant="outline" onClick={() => {
                      const el = document.getElementById('upload-requested');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}>
                      Upload Files
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Rejection Note - Show to customer when request was rejected and admin provided a note */}
      {isCustomer && request.currentStatus === REQUEST_STATUS.REJECTED && (
        (() => {
          const note = getLatestStatusNote(request, REQUEST_STATUS.REJECTED);
          if (!note) return null;
          const commentsAllowed = Boolean(request.commentsEnabled);
          return (
            <Card className="mb-4 border-rose-500 bg-rose-50 dark:bg-rose-950 shadow-sm rounded-lg">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-rose-600/10 text-rose-700 dark:bg-rose-700/20 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-rose-900 dark:text-rose-100 mb-2 text-lg">Application Rejected</h3>
                        <p className="text-sm text-rose-800 dark:text-rose-200 mb-3">{note}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {commentsAllowed ? (
                          <Button size="sm" variant="outline" onClick={scrollToComments} className="text-rose-700 border-rose-200">
                            <MessageCircle className="h-4 w-4 mr-2" /> Ask for clarification
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => window.location.href = 'mailto:support@fundifyhub.com?subject=Question%20about%20rejected%20application'} className="text-rose-700">
                            Contact Support
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {!commentsAllowed ? (
                        <p className="text-xs text-rose-700 dark:text-rose-300">Comments are disabled for this application. If you need help, contact support or raise a ticket.</p>
                      ) : (
                        <p className="text-sm text-rose-700 dark:text-rose-300">You may leave a comment below to ask for clarification. Be concise and mention the specific point you want clarified.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()
      )}

      {/* Hidden Modals for actions requiring input */}
      {/* Bank Details Modal */}
      <Dialog open={showBankDetails} onOpenChange={(open) => {
        setShowBankDetails(open);
        if (!open) {
          // Clear bank details state when modal closes
          setAccountNumber('');
          setIfscCode('');
          setAccountName('');
          setUpiId('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
            <DialogDescription>Provide your bank details for loan disbursement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Number *</Label>
              <Input 
                value={accountNumber} 
                onChange={(e) => setAccountNumber(e.target.value)} 
                placeholder="1234567890" 
                className={bankValidationErrors.accountNumber ? 'border-red-500' : ''}
              />
              {bankValidationErrors.accountNumber && (
                <p className="text-sm text-red-500 mt-1">{bankValidationErrors.accountNumber}</p>
              )}
            </div>
            <div>
              <Label>IFSC Code *</Label>
              <Input 
                value={ifscCode} 
                onChange={(e) => setIfscCode(e.target.value)} 
                placeholder="SBIN0001234" 
                className={bankValidationErrors.ifscCode ? 'border-red-500' : ''}
              />
              {bankValidationErrors.ifscCode && (
                <p className="text-sm text-red-500 mt-1">{bankValidationErrors.ifscCode}</p>
              )}
            </div>
            <div>
              <Label>Account Holder Name *</Label>
              <Input 
                value={accountName} 
                onChange={(e) => setAccountName(e.target.value)} 
                placeholder="John Doe" 
                className={bankValidationErrors.accountName ? 'border-red-500' : ''}
              />
              {bankValidationErrors.accountName && (
                <p className="text-sm text-red-500 mt-1">{bankValidationErrors.accountName}</p>
              )}
            </div>
            <div>
              <Label>UPI ID (Optional)</Label>
              <Input 
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)} 
                placeholder="yourname@upi" 
                className={bankValidationErrors.upiId ? 'border-red-500' : ''}
              />
              {bankValidationErrors.upiId && (
                <p className="text-sm text-red-500 mt-1">{bankValidationErrors.upiId}</p>
              )}
            </div>
            <Button onClick={handleBankDetailsSubmit} disabled={submittingBank} className="w-full">
              {submittingBank ? 'Submitting...' : 'Submit Details'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        {/* Reject Modal - Admin must provide a reason when rejecting a request */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>Provide a reason for rejecting this application. This will be recorded in the application history.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason (required)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why the application is being rejected (max 500 characters)"
                  rows={4}
                  maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
                />
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <div>Provide a clear reason that the customer can understand.</div>
                  <div>{rejectReason.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowRejectModal(false); setPendingRejectAction(null); setRejectReason(''); }}>Cancel</Button>
                <Button
                  onClick={async () => {
                    const note = rejectReason && rejectReason.trim() ? rejectReason.trim() : '';
                    if (!note) {
                      toastError('Please provide a reason for rejection');
                      return;
                    }
                    setSubmittingReject(true);
                    try {
                      if (!pendingRejectAction) {
                        toastError('No reject action available');
                        return;
                      }
                      const ok = await handleStatusUpdate(pendingRejectAction.targetStatus, note);
                      if (ok) {
                        toastSuccess('Application rejected');
                        setShowRejectModal(false);
                        setPendingRejectAction(null);
                        setRejectReason('');
                      } else {
                        toastError('Failed to reject application');
                      }
                    } catch (err: any) {
                      toastError((err && (err.message || err.toString())) || ACTION_MESSAGES.NETWORK_ERROR);
                    } finally {
                      setSubmittingReject(false);
                    }
                  }}
                  disabled={submittingReject}
                >
                  {submittingReject ? 'Rejecting...' : 'Reject Application'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* Approve Modal - Admin confirms approval and can add an optional note */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>Optionally add a note for the approval. This will be recorded in the application history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Approval Note (optional)</Label>
              <Textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="Add any comments about the approval (optional)"
                rows={4}
                maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
              />
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <div>Optional note for audit and customer communication.</div>
                <div>{approveNote.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowApproveModal(false); setPendingApproveAction(null); setApproveNote(''); }}>Cancel</Button>
              <Button
                onClick={async () => {
                  setSubmittingApprove(true);
                  try {
                    if (!pendingApproveAction) {
                      toastError('No approve action available');
                      return;
                    }

                    const payload = (approveNote && approveNote.trim()) ? approveNote.trim() : undefined;
                    const ok = await handleStatusUpdate(pendingApproveAction.targetStatus, payload as any);
                    if (ok) {
                      toastSuccess('Application approved');
                      setShowApproveModal(false);
                      setPendingApproveAction(null);
                      setApproveNote('');
                    } else {
                      toastError('Failed to approve application');
                    }
                  } catch (err: any) {
                    toastError((err && (err.message || err.toString())) || ACTION_MESSAGES.NETWORK_ERROR);
                  } finally {
                    setSubmittingApprove(false);
                  }
                }}
                disabled={submittingApprove}
              >
                {submittingApprove ? 'Approving...' : 'Approve Application'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disbursement Modal - Admin uploads proof of transfer */}
      <Dialog open={showDisbursement} onOpenChange={setShowDisbursement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disburse Loan Amount</DialogTitle>
            <DialogDescription>
              Upload proof of transfer and confirm disbursement to customer
            </DialogDescription>
          </DialogHeader>
    <div className="space-y-6">
      {/* Loan Amount Summary */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-primary mb-1">Loan Amount</h4>
            <p className="text-2xl font-bold text-primary">₹{request?.adminOfferedAmount?.toLocaleString()}</p>
          </div>

          <div className="text-right">
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Processing Fee</h4>
            <p className="text-lg font-medium">₹{(request as any).adminProcessingFee?.toLocaleString() || '0'}</p>
          </div>
        </div>
      </div>

      {/* Transaction Reference */}
      <div>
        <Label htmlFor="transaction-ref">Transaction Reference / UTR Number *</Label>
        <Input
          id="transaction-ref"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder="Enter transaction reference or UTR number"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">Enter the unique transaction reference from your bank statement</p>
      </div>

      {/* Upload Transfer Proof */}
      <div>
        <Label>Upload Transfer Proof *</Label>
        <p className="text-xs text-muted-foreground mb-3">Upload screenshots or documents showing the successful transfer</p>

        {/* Upload Button */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors">
          <div className="text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <UploadButton
              endpoint="requestDocument"
              appearance={{
                button: "bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium",
              }}
              content={{ button: 'Select Files' }}
              onClientUploadComplete={(res: ClientUploadedFileData<{ uploadedBy: string; fileName: string; fileSize: number; fileType: string }>[]) => {
                if (res && res.length > 0) {
                  const newFiles = res.map(r => ({
                    fileKey: r.key,
                    fileName: r.serverData?.fileName || r.name,
                    fileSize: r.serverData?.fileSize || r.size || 0,
                    fileType: r.serverData?.fileType || r.type,
                    url: r.url || undefined,
                  })).filter(f => f.fileKey) as UploadedFile[];

                  if (newFiles.length > 0) {
                    setDisbursementFiles(prev => [...prev, ...newFiles]);
                    toastSuccess(`${newFiles.length} file(s) staged for upload`);
                  }
                }
                setUploadProgress('');
              }}
              onUploadError={(error: Error) => {
                setUploadProgress('');
                toastError(`Upload failed: ${error.message}`);
              }}
              onUploadProgress={(progress: number) => {
                setUploadProgress(`Uploading... ${Math.round(progress)}%`);
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">Supported: Images (JPEG/PNG/WebP) and PDFs • Max 4MB each</p>
            {uploadProgress && (
              <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-center justify-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium">{uploadProgress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files List */}
        {disbursementFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Files ready to upload ({disbursementFiles.length})</p>
            {disbursementFiles.map((file, idx) => (
              <div key={file.fileKey} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm">
                    <div className="font-medium">{file.fileName || file.fileKey}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.fileSize || 0) > 0 ? `${Math.round((file.fileSize || 0)/1024)} KB` : ''}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDisbursementFiles(prev => prev.filter((_, i) => i !== idx));
                    toastSuccess('File removed');
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          onClick={handleDisbursementSubmit}
          disabled={submittingDisbursement || !transactionRef.trim() || disbursementFiles.length === 0}
          className="flex-1"
          size="lg"
        >
          {submittingDisbursement ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Disbursement...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Confirm & Disburse Amount
            </>
          )}
        </Button>
      </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Issue Modal - for agent to record reason (customer not available / can't make it) */}
      <Dialog open={showAgentIssueModal} onOpenChange={setShowAgentIssueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Issue</DialogTitle>
            <DialogDescription>Provide a short reason describing why the inspection couldn't proceed. This note will be visible to admins.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={agentIssueReason}
                onChange={(e) => setAgentIssueReason(e.target.value)}
                placeholder="e.g. Customer not at home / Road blocked / Vehicle issue"
                rows={4}
                maxLength={500}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowAgentIssueModal(false); setPendingAgentIssueAction(null); setAgentIssueReason(''); }}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!pendingAgentIssueAction) return;
                  const noteText = (agentIssueReason || '').trim();
                  if (!noteText) {
                    toastError('Please provide a reason');
                    return;
                  }
                  setSubmittingAgentIssue(true);
                  try {
                    const ok = await handleStatusUpdate(pendingAgentIssueAction.targetStatus, noteText);
                    if (ok) {
                      setShowAgentIssueModal(false);
                      setPendingAgentIssueAction(null);
                      setAgentIssueReason('');
                      toastSuccess('Recorded');
                    } else {
                      // handleStatusUpdate will have shown error
                    }
                  } catch (e) {
                    // noop
                  } finally {
                    setSubmittingAgentIssue(false);
                  }
                }}
                disabled={submittingAgentIssue}
              >
                {submittingAgentIssue ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Decline Modal - Customer must provide a reason when declining an offer */}
      <Dialog open={showOfferDeclineModal} onOpenChange={setShowOfferDeclineModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Offer</DialogTitle>
            <DialogDescription>Please provide a brief reason for declining the offer. This will help the admin review your feedback.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={offerDeclineReason}
                onChange={(e) => setOfferDeclineReason(e.target.value)}
                placeholder="Explain why you are declining the offer (max 500 characters)"
                rows={4}
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <div>Provide a short reason that helps the admin understand the issue.</div>
                <div>{offerDeclineReason.trim().length}/500</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowOfferDeclineModal(false); setPendingOfferDeclineAction(null); setOfferDeclineReason(''); }}>Cancel</Button>
              <Button
                onClick={async () => {
                  const note = offerDeclineReason && offerDeclineReason.trim() ? offerDeclineReason.trim() : '';
                  if (!note) {
                    toastError('Please provide a reason for declining the offer');
                    return;
                  }
                  setSubmittingOfferDecline(true);
                  try {
                    if (!pendingOfferDeclineAction) {
                      toastError('No decline action available');
                      return;
                    }
                    const ok = await handleStatusUpdate(pendingOfferDeclineAction.targetStatus, note);
                    if (ok) {
                      toastSuccess('Offer declined');
                      setShowOfferDeclineModal(false);
                      setPendingOfferDeclineAction(null);
                      setOfferDeclineReason('');
                    } else {
                      toastError('Failed to decline offer');
                    }
                  } catch (err: any) {
                    toastError((err && (err.message || err.toString())) || ACTION_MESSAGES.NETWORK_ERROR);
                  } finally {
                    setSubmittingOfferDecline(false);
                  }
                }}
                disabled={submittingOfferDecline}
              >
                {submittingOfferDecline ? 'Submitting...' : 'Decline Offer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel / Withdraw Modal - used by admin cancel or customer withdraw to capture a reason */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAdmin ? 'Cancel Request' : 'Withdraw Request'}</DialogTitle>
            <DialogDescription>{isAdmin ? 'Provide a reason for cancelling this request. This will be recorded in the application history.' : 'Please provide a brief reason for withdrawing your request. This helps our team understand why.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder={isAdmin ? 'Explain why the request is being closed (max 500 characters)' : 'Explain why you are withdrawing the request (max 500 characters)'}
                rows={4}
                maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
              />
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <div>{isAdmin ? 'Provide a clear reason that the customer can understand.' : 'Provide a short reason to help the admin.'}</div>
                <div>{closeReason.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowCloseModal(false); setPendingCloseAction(null); setCloseReason(''); }}>Cancel</Button>
              <Button
                onClick={async () => {
                  const note = closeReason && closeReason.trim() ? closeReason.trim() : '';
                  if (!pendingCloseAction) {
                    toastError('No action available');
                    return;
                  }
                  if (!note) {
                    toastError('Please provide a reason for cancelling/withdrawing the request');
                    return;
                  }
                  setSubmittingClose(true);
                  try {
                    const ok = await handleStatusUpdate(pendingCloseAction.targetStatus, note);
                    if (ok) {
                      toastSuccess(isAdmin ? 'Request cancelled' : 'Request withdrawn');
                      setShowCloseModal(false);
                      setPendingCloseAction(null);
                      setCloseReason('');
                    } else {
                      toastError('Failed to update status');
                    }
                  } catch (err: any) {
                    toastError((err && (err.message || err.toString())) || ACTION_MESSAGES.NETWORK_ERROR);
                  } finally {
                    setSubmittingClose(false);
                  }
                }}
                disabled={submittingClose || closeReason.trim().length === 0}
              >
                {submittingClose ? (isAdmin ? 'Cancelling...' : 'Withdrawing...') : (isAdmin ? 'Cancel Request' : 'Withdraw Request')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request More Info Modal */}
      <Dialog open={showRequestInfo} onOpenChange={setShowRequestInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Information</DialogTitle>
            <DialogDescription>Specify what information or documents you need from the customer</DialogDescription>
          </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Additional Note (required)</Label>
                  <Textarea
                    value={requestedInfo}
                    onChange={(e) => setRequestedInfo(e.target.value)}
                    placeholder="Describe what you need from the customer (max 500 characters)"
                    rows={4}
                    maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <div>Provide a short note for the customer explaining what you need.</div>
                    <div>{requestedInfo.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
                  </div>
                </div>

                <Button onClick={handleRequestMoreInfo} disabled={submittingInfo || !isRequestNoteValid} className="w-full">
                  {submittingInfo ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
        </DialogContent>
      </Dialog>

      {/* Request Different Bank Details Modal */}
      <Dialog open={showRequestBankDetails} onOpenChange={(open) => {
        setShowRequestBankDetails(open);
        if (!open) {
          // Clear bank details state when modal closes
          setAccountNumber('');
          setIfscCode('');
          setAccountName('');
          setUpiId('');
          setRequestedBankDetailsNote('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Bank Details Correction</DialogTitle>
            <DialogDescription>Ask the customer to resubmit their bank account details</DialogDescription>
          </DialogHeader>
              <div className="space-y-4">
                {/* Show existing bank details if available */}
                {request && (request.bankAccountNumber || request.bankIfscCode || request.bankAccountName || request.upiId) && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Currently Submitted Bank Details:</h4>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      {request.bankAccountName && (
                        <div>
                          <span className="text-muted-foreground">Account Holder:</span>
                          <p className="font-medium">{request.bankAccountName}</p>
                        </div>
                      )}
                      {request.bankAccountNumber && (
                        <div>
                          <span className="text-muted-foreground">Account Number:</span>
                          <p className="font-mono font-medium">{request.bankAccountNumber}</p>
                        </div>
                      )}
                      {request.bankIfscCode && (
                        <div>
                          <span className="text-muted-foreground">IFSC Code:</span>
                          <p className="font-mono font-medium">{request.bankIfscCode}</p>
                        </div>
                      )}
                      {request.upiId && (
                        <div>
                          <span className="text-muted-foreground">UPI ID:</span>
                          <p className="font-mono font-medium">{request.upiId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Note for Customer (required)</Label>
                  <Textarea
                    value={requestedBankDetailsNote}
                    onChange={(e) => setRequestedBankDetailsNote(e.target.value)}
                    placeholder="Explain what needs to be corrected in the bank details (max 500 characters)"
                    rows={4}
                    maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
                  />
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <div>Provide a clear note explaining what bank details need correction.</div>
                    <div>{requestedBankDetailsNote.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
                  </div>
                </div>

                <Button onClick={handleRequestDifferentBankDetails} disabled={submittingBankDetailsRequest || !isBankDetailsRequestNoteValid} className="w-full">
                  {submittingBankDetailsRequest ? 'Sending...' : 'Request Resubmission'}
                </Button>
              </div>
        </DialogContent>
      </Dialog>

      {/* Offer Creation Modal */}
      <CreateOfferModal 
        open={showOffer}
        onOpenChange={(open) => { setShowOffer(open); if (!open) setCreateOfferInitial(undefined); }}
        requestId={request.id}
        initialOffer={createOfferInitial}
        onSubmit={async (payload) => {
          setCreatingOffer(true);
          try {
            const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CREATE_OFFER(id), {
              amount: payload.amount,
              tenureMonths: payload.tenureMonths,
              interestRate: payload.interestRate,
              penaltyPercentage: payload.penaltyPercentage,
              lateFeePercentage: payload.lateFeePercentage,
              processingFee: payload.processingFee
            });
            if (result.ok) {
              setRequest(result.data.request);
              setShowOffer(false);
            } else {
              throw new Error(result.error?.message || 'Failed to create offer');
            }
          } catch (err: any) {
            throw err;
          } finally {
            setCreatingOffer(false);
          }
        }}
      />

      {/* Agent Assignment Modal */}
      <AssignAgentModal 
        open={showAssignAgent}
        onOpenChange={setShowAssignAgent}
        district={request.district}
        onSubmit={async (agentId: string, inspectionDate: string) => {
          setAssigningAgent(true);
          try {
            const ok = await executeRequestAction('assign-agent', {
              requestId: id,
              onSuccess: (data) => {
                setRequest(data);
                setShowAssignAgent(false);
              },
              onError: (error) => {
                toastError(error || 'Failed to assign agent');
              }
            }, { agentId, inspectionDate });
            return Boolean(ok);
          } catch (err: any) {
            toastError('Failed to assign agent');
            return false;
          } finally {
            setAssigningAgent(false);
          }
        }}
      />

      {/* Confirmation Dialog (generic) */}
      {pendingConfirmAction && (
        <Dialog open={Boolean(pendingConfirmAction)} onOpenChange={(open) => { if (!open) setPendingConfirmAction(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{pendingConfirmAction.title}</DialogTitle>
              {pendingConfirmAction.message && <DialogDescription>{pendingConfirmAction.message}</DialogDescription>}
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPendingConfirmAction(null)}>Cancel</Button>
              <Button onClick={async () => { try { await pendingConfirmAction.onConfirm(); } catch (err) { toastError((err as any)?.message || 'Action failed'); } setPendingConfirmAction(null); }}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reschedule Modal - collects reason, preferred date & time */}
      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>Please provide a reason and preferred date/time for rescheduling the inspection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason *</Label>
              <Textarea value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} placeholder="E.g., customer requested change of date" rows={3} />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label>Preferred Date</Label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowReschedule(false); setPendingRescheduleAction(null); setRescheduleReason(''); setRescheduleDate(''); }}>Cancel</Button>
              <Button onClick={async () => {
                if (!rescheduleReason.trim()) { toastError('Please provide a reason for rescheduling'); return; }
                // Send date-only requestedInspectionAt along with a note
                try {
                  const payload = { requestedInspectionAt: rescheduleDate || null, note: rescheduleReason };
                  if (pendingRescheduleAction) {
                    const ok = await handleStatusUpdate(pendingRescheduleAction.targetStatus, payload);
                    if (ok) {
                      toastSuccess('Reschedule request submitted');
                      setShowReschedule(false);
                      setPendingRescheduleAction(null);
                      setRescheduleReason(''); setRescheduleDate('');
                    } else {
                      toastError('Failed to submit reschedule request');
                    }
                  } else {
                    toastError('No reschedule action available');
                  }
                } catch (err) {
                  toastError((err as any)?.message || ACTION_MESSAGES.NETWORK_ERROR);
                }
              }}>Request Reschedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Inspection Modal - agent adds optional note before completing inspection */}
      <Dialog open={showCompleteInspectionModal} onOpenChange={setShowCompleteInspectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Inspection</DialogTitle>
            <DialogDescription>Please add any notes from the inspection (optional) before completing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Inspection Note</Label>
              <Textarea value={completeInspectionNote} onChange={(e) => setCompleteInspectionNote(e.target.value)} placeholder="e.g., Asset condition verified, minor scratches on back" rows={4} />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowCompleteInspectionModal(false); setPendingCompleteInspectionAction(null); setCompleteInspectionNote(''); }}>Cancel</Button>
              {/* Complete Inspection (single action). Persist staged uploads, then call inspection-complete endpoint. */}
              <Button onClick={async () => {
                if (!pendingCompleteInspectionAction) { toastError('No action pending'); return; }
                setSubmittingCompleteInspection(true);
                try {
                  // Persist staged inspection photos if present
                  let createdDocumentIds: string[] | undefined = undefined;
                  if (stagedUploads && stagedUploads.length > 0) {
                    const result = await handleSubmitStagedUploads({ documentType: 'INSPECTION_PHOTO', documentCategory: 'INSPECTION', description: completeInspectionNote || 'Inspection photos uploaded by agent' });
                    if (!result) {
                      toastError('Failed to save inspection photos');
                      setSubmittingCompleteInspection(false);
                      return;
                    }
                    if (Array.isArray(result)) {
                      createdDocumentIds = result as string[];
                    }
                  }

                  // Call backend inspections/complete endpoint. Note: outcome is intentionally omitted here; agent will approve/reject from INSPECTION_COMPLETED status.
                  const payload: any = {};
                  if (completeInspectionNote && completeInspectionNote.trim()) payload.note = completeInspectionNote.trim();
                  if (createdDocumentIds && createdDocumentIds.length > 0) payload.documentIds = createdDocumentIds;

                  const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.COMPLETE_INSPECTION(request!.id), payload);
                  if (result.ok) {
                    // Update local request state with returned request
                    if (result.data && result.data.request) {
                      setRequest(result.data.request as RequestDetail);
                    } else {
                      // fallback: refetch
                      const refreshResult = await getWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(request!.id));
                      if (refreshResult.ok) {
                        setRequest(refreshResult.data.request as RequestDetail);
                      }
                    }

                    setShowCompleteInspectionModal(false);
                    setPendingCompleteInspectionAction(null);
                    setCompleteInspectionNote('');
                    toastSuccess('Inspection completed');
                  } else {
                    toastError(result.error?.message || 'Failed to complete inspection');
                  }
                } catch (err) {
                  toastError(ACTION_MESSAGES.NETWORK_ERROR);
                } finally {
                  setSubmittingCompleteInspection(false);
                }
              }}>{submittingCompleteInspection ? 'Completing...' : 'Complete Inspection'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Asset Details */}
          <Card id="comments-section" className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileText className="h-5 w-5 shrink-0" />
                {isCustomer ? 'Your Item Details' : 'Asset Details'}
              </CardTitle>
              <CardDescription>
                {isCustomer ? 'Information about the item you want to use for the loan' : 'Details of the asset being used as collateral'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <InfoItem label={isCustomer ? "What are you pledging?" : "Asset Type"} value={request.assetType || '—'} />
                <InfoItem label={isCustomer ? "Item Condition" : "Condition"} value={request.assetCondition || '—'} />
                <InfoItem label="Brand/Make" value={request.assetBrand || '—'} />
                <InfoItem label="Model/Version" value={request.assetModel || '—'} />
                {request.purchaseYear && (
                  <InfoItem label={isCustomer ? "When did you buy it?" : "Purchase Year"} value={request.purchaseYear.toString()} />
                )}
              </div>
              
              {request.AdditionalDescription && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">{isCustomer ? "Additional Notes" : "Description"}</p>
                  <p className="text-sm text-muted-foreground">{request.AdditionalDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          


          {/* Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                {isCustomer ? '📎' : <FileImage className="h-5 w-5 shrink-0" />}
                <span>{isCustomer ? 'Your Documents' : 'Documents'}</span>
              </CardTitle>
              <CardDescription>
                {isCustomer ? 'Photos and documents you\'ve uploaded for verification' : 'All documents and photos related to this application'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Upload - Only when admin requests more info */}
              {isCustomer && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED && (
                <div id="upload-requested" className="border-2 border-dashed border-primary/50 rounded-lg p-6 bg-primary/5 hover:border-primary transition-colors shadow-sm">
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-primary rounded-lg mb-3">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg mb-2">
                      📎 Upload Requested Files
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please upload the documents or clear photos requested by the admin. Accepted file types: images (JPEG/PNG/WebP) and PDFs.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                      <span>✓ Up to 4 files</span>
                      <span>•</span>
                      <span>✓ Max 4MB each</span>
                      <span>•</span>
                      <span>✓ Images & PDFs accepted</span>
                    </div>
                    {uploadProgress ? (
                      <div className="bg-primary/10 rounded-lg p-4">
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm font-medium">{uploadProgress}</p>
                        </div>
                      </div>
                    ) : (
                      <UploadButton
              // Use the general requestDocument endpoint which supports images & PDFs
              endpoint="requestDocument"
                        appearance={{
                          button: "bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-md font-medium",
                        }}
                        content={{ button: 'Select Files' }}
                        // Enforce client-side validation: min 1 (implicit), max 4, only images & pdfs
                        onBeforeUploadBegin={(files: File[]) => {
                          const maxFiles = 4;
                          if (files.length === 0) {
                            toastError('Please select at least one file');
                            return [];
                          }
                          if (files.length > maxFiles) {
                            toastError(`You can upload at most ${maxFiles} files at once`);
                            return [];
                          }

                          const allowed = files.every(f => {
                            const lower = f.name.toLowerCase();
                            const isImage = f.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => lower.endsWith(ext));
                            const isPdf = lower.endsWith('.pdf') || f.type === 'application/pdf';
                            return isImage || isPdf;
                          });

                          if (!allowed) {
                            toastError('Only image files and PDFs are allowed');
                            return [];
                          }

                          setUploadProgress(`Uploading ${files.length} file(s)...`);
                          return files;
                        }}
                        onClientUploadComplete={async (res: ClientUploadedFileData<{ fileKey: string; uploadedBy: string; fileName: string; fileSize: number; fileType: string }>[]) => {
                          if (res && res.length > 0) {
                            // Stage uploads in memory: do NOT create DB records until user hits Submit
                            const newStaged = res.map(r => ({
                              fileKey: r.serverData?.fileKey || r.key,
                              fileName: r.serverData?.fileName || r.name,
                              fileSize: r.serverData?.fileSize || r.size || 0,
                              fileType: r.serverData?.fileType || r.type,
                              url: r.url || undefined,
                            })).filter(s => s.fileKey) as UploadedFile[];

                            if (newStaged.length > 0) {
                              setStagedUploads(prev => [...prev, ...newStaged]);
                              const keys = newStaged.map(s => s.fileKey).filter(Boolean) as string[];
                              setRecentlyUploadedFileKeys(prev => Array.from(new Set([...prev, ...keys])));
                              setHasUploadedNewDocs(true);
                              toastSuccess(`Staged ${newStaged.length} file(s) for submission`);
                              // Clear uploading indicator now that client uploads are staged
                              setUploadProgress('');
                            }
                            // Ensure progress cleared even if no newStaged (defensive)
                            setUploadProgress('');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          setUploadProgress('');
                          toastError(DOCUMENT_MESSAGES.UPLOAD_ERROR);
                        }}
                      />
                    )}
                    {/* Staged uploads preview (files uploaded to storage but not yet persisted) */}
                    {stagedUploads && stagedUploads.length > 0 && (
                      <div className="mt-4 text-left">
                        <p className="text-sm font-medium mb-1">Staged files — ready to submit</p>
                        <p className="text-xs text-muted-foreground mb-2">These files are uploaded to our storage but not yet submitted. Click the <strong>Submit</strong> action at the top when ready.</p>
                        <div className="space-y-2">
                          {stagedUploads.map((s) => (
                            <div key={s.fileKey} className="flex items-center justify-between bg-muted/10 p-2 rounded">
                              <div className="flex items-center gap-3">
                                <FileImage className="h-5 w-5 text-muted-foreground" />
                                <div className="text-sm">
                                  <div className="font-medium">{s.fileName || s.fileKey}</div>
                                  <div className="text-xs text-muted-foreground">{(s.fileSize || 0) > 0 ? `${Math.round((s.fileSize || 0)/1024)} KB` : ''}</div>
                                </div>
                              </div>
                              <div>
                                <Button size="sm" variant="outline" onClick={async () => { await handleRemoveStagedUpload(s.fileKey); }}>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Digital Signature - For Customer in PENDING_SIGNATURE status */}
              {/* Digital Signature - moved into Agreement card (rendered via dialog). We keep this block empty so Documents section no longer shows signature controls */}
              {isCustomer && request.currentStatus === REQUEST_STATUS.PENDING_SIGNATURE && (
                <div className="mb-6" />
              )}

              {/* Agent Upload - During inspection */}
              {isAgent && request.currentStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS && (
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 bg-blue-50 dark:bg-blue-950 hover:border-blue-500 transition-colors">
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-blue-600 rounded-lg mb-3">
                      <Upload className="h-10 w-10 text-white" />
                    </div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      📸 Upload Inspection Photos
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                      Upload clear photos from multiple angles (max 5 images, 4MB each)
                    </p>
                    {uploadProgress ? (
                      <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 border-2 border-blue-600">
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{uploadProgress}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadButton
                          endpoint="assetImageUploader"
                          appearance={{
                            button: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium",
                          }}
                          content={{
                            button: "📸 Select Photos",
                          }}
                          onBeforeUploadBegin={(files: File[]) => {
                            setUploadProgress(`Uploading ${files.length} photo(s)...`);
                            return files;
                          }}
                          onClientUploadComplete={async (res: ClientUploadedFileData<{ fileKey: string; uploadedBy: string; fileName: string; fileSize: number; fileType: string }>[]) => {
                            if (res && res.length > 0) {
                              // Stage agent uploads in memory: do NOT create DB records until agent clicks Complete Inspection
                              const newStaged = res.map(r => ({
                                fileKey: r.serverData?.fileKey || r.key,
                                fileName: r.serverData?.fileName || r.name,
                                fileSize: r.serverData?.fileSize || r.size || 0,
                                fileType: r.serverData?.fileType || r.type,
                                url: r.url || undefined,
                              })).filter(s => s.fileKey) as UploadedFile[];

                              if (newStaged.length > 0) {
                                setStagedUploads(prev => [...prev, ...newStaged]);
                                const keys = newStaged.map(s => s.fileKey).filter(Boolean) as string[];
                                setRecentlyUploadedFileKeys(prev => Array.from(new Set([...prev, ...keys])));
                                setHasUploadedNewDocs(true);
                                toastSuccess(`Staged ${newStaged.length} inspection photo(s) for submission`);
                                // Clear uploading indicator now that client uploads are staged
                                setUploadProgress('');
                              }
                              // Ensure progress cleared even if no newStaged (defensive)
                              setUploadProgress('');
                            }
                          }}
                          onUploadError={(error: Error) => {
                            setUploadProgress('');
                            toastError(`Upload failed: ${error.message}`);
                          }}
                        />
                        <div className="mt-4 bg-blue-100 dark:bg-blue-900 rounded-lg p-3 text-left">
                          <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                            <span className="text-base shrink-0">💡</span>
                            <span>
                              <strong>Tips:</strong> Hold Ctrl/Cmd to select multiple photos. 
                              Capture: front view, back view, serial numbers, and any defects.
                            </span>
                          </p>
                        </div>
                        {/* Staged uploads preview for agent (these are uploaded to storage but not yet persisted) */}
                        {stagedUploads && stagedUploads.length > 0 && (
                          <div className="mt-4 text-left">
                            <p className="text-sm font-medium mb-1">Staged photos — ready to save</p>
                            <p className="text-xs text-muted-foreground mb-2">These photos are uploaded to storage but not yet saved to the application. Click <strong>Save Photos</strong> to persist them or use the <strong>Complete Inspection</strong> action to persist and advance status.</p>
                            <div className="space-y-2">
                              {stagedUploads.map((s) => (
                                <div key={s.fileKey} className="flex items-center justify-between bg-muted/10 p-2 rounded">
                                  <div className="flex items-center gap-3">
                                    <FileImage className="h-5 w-5 text-muted-foreground" />
                                    <div className="text-sm">
                                      <div className="font-medium">{s.fileName || s.fileKey}</div>
                                      <div className="text-xs text-muted-foreground">{(s.fileSize || 0) > 0 ? `${Math.round((s.fileSize || 0)/1024)} KB` : ''}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={async () => { await handleRemoveStagedUpload(s.fileKey); }}>
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <Button size="sm" onClick={async () => {
                                // Persist staged inspection photos without changing status
                                setUploadProgress('Saving staged inspection photos...');
                                const ok = await handleSubmitStagedUploads({ documentType: 'INSPECTION_PHOTO', documentCategory: 'INSPECTION', description: 'Inspection photos uploaded by agent' });
                                setUploadProgress('');
                                if (!ok) return;
                                // Refresh is handled inside the submit helper
                              }}>
                                Save Photos
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Document Gallery */}
              {request.documents && request.documents.length > 0 ? (
                <DocumentGallery
                  documents={request.documents}
                  // Allow customers to remove uploaded files when more info was requested
                  onDeleteDocument={isCustomer && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED ? handleDeleteDocument : undefined}
                  recentlyUploadedFileKeys={recentlyUploadedFileKeys}
                  userRole={isAdmin ? 'admin' : isAgent ? 'agent' : 'customer'}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileImage className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{DOCUMENT_MESSAGES.NO_DOCUMENTS}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          {/* Comments: show to admins always; hide for customers/agents when comments are disabled */}
          {(request.commentsEnabled || isAdmin) && (
            <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                {isCustomer ? '💬' : <MessageCircle className="h-5 w-5 shrink-0" />}
                <span>{isCustomer ? 'Messages & Updates' : 'Comments'}</span>
              </CardTitle>
              <CardDescription>
                {isCustomer ? 'Stay updated with messages from our team or add your notes' : 'Communication thread for this application'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div className="space-y-2">
                  <div className="relative">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      maxLength={CLIENT_CONSTANTS.COMMENT_MAX_LENGTH}
                      className="resize-none"
                    />
                    <div className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                      {commentText.length}/{CLIENT_CONSTANTS.COMMENT_MAX_LENGTH}
                    </div>
                  </div>
                    {/* Disable posting for non-admins when comments are disabled */}
                    {(() => {
                      const commentsDisabled = !request.commentsEnabled && !isAdmin;
                      return (
                        <Button
                          onClick={handlePostComment}
                          disabled={Boolean(postingComment || !commentText.trim() || commentText.trim().length === 0 || commentsDisabled)}
                          className="w-full sm:w-auto"
                          title={commentsDisabled ? 'Comments are disabled for this application' : undefined}
                        >
                          {postingComment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Post Comment
                            </>
                          )}
                        </Button>
                      );
                    })()}
                
                </div>

                {!request.commentsEnabled && !isAdmin && (
                  <div className="text-sm text-muted-foreground mt-2">Comments are disabled for this application. If you need help, contact support.</div>
                )}

                {request.comments && request.comments.length > 0 ? (
                  <div className="space-y-3">
                    {request.comments.map((c) => {
                      // Determine role label from author roles
                      const roles = c.author?.roles || [];
                      let roleLabel = '';
                      if (roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.DISTRICT_ADMIN)) roleLabel = 'Admin';
                      else if (roles.includes(ROLES.AGENT)) roleLabel = 'Agent';
                      else if (roles.includes(ROLES.CUSTOMER)) roleLabel = 'Customer';

                      return (
                        <div key={c.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {roleLabel && (
                                <Badge variant="outline" className="text-xs py-0 px-2">
                                  {roleLabel}
                                </Badge>
                              )}
                              <p className="text-sm font-medium">
                                {c.author?.firstName} {c.author?.lastName}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                )}
              </div>
            </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* People Involved - Unified card for customers, agents, and admins */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                People Involved
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Key contacts for this request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer view: show admin contact + assigned agent (if any) using avatar and compact layout */}
              {isCustomer ? (
                <div className="space-y-4">
                  {/* Admin contact (try to find most recent admin actor) */}
                  {(() => {
                    const admin = getLatestAdminActor(request);
                    if (admin) {
                      return (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">{`${admin.firstName?.[0] || ''}${admin.lastName?.[0] || ''}`}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{admin.firstName} {admin.lastName}</p>
                            {admin.phoneNumber && <p className="text-xs text-muted-foreground">{admin.phoneNumber}</p>}
                            {admin.email && <p className="text-xs text-muted-foreground">{admin.email}</p>}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="text-sm text-muted-foreground">No admin contact available. Contact support for assistance.</div>
                    );
                  })()}

                  {/* Agent (if assigned) */}
                  {request.assignedAgent ? (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">{`${request.assignedAgent.firstName?.[0] || ''}${request.assignedAgent.lastName?.[0] || ''}`}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{request.assignedAgent.firstName} {request.assignedAgent.lastName}</p>
                            {request.assignedAgent.phoneNumber && <p className="text-xs text-muted-foreground">{request.assignedAgent.phoneNumber}</p>}
                          </div>
                        </div>
                        <div>
                          {request.inspectionScheduledAt ? (
                            <div className="inline-flex items-center gap-2 bg-muted px-3 py-1 rounded-md">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{new Date(request.inspectionScheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          ) : (
                            <Badge variant="secondary">No inspection scheduled</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                // Admin / Agent view: show customer details using avatar + compact layout (same as customer sees admin)
                request.customer && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-muted-foreground">{`${request.customer.firstName?.[0] || ''}${request.customer.lastName?.[0] || ''}`}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{request.customer.firstName} {request.customer.lastName}</p>
                        {request.customer.phoneNumber && <p className="text-xs text-muted-foreground">{request.customer.phoneNumber}</p>}
                        {request.customer.email && <p className="text-xs text-muted-foreground">{request.customer.email}</p>}
                      </div>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Admin control (moved to top): keep original block disabled to avoid duplication */}
          {false && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  Comment Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Allow customers to post comments on this application (useful for rejected or cancelled requests).</p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={async () => {
                        if (!request) return;
                        const newVal = !(request.commentsEnabled ?? true);
                        setTogglingCommentsFlag(true);
                        try {
                          const result = await postWithResult(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_COMMENTS_ENABLED(request.id), { enabled: newVal });
                          if (result.ok) {
                            // Expect backend to return updated request
                            if (result.data && result.data.request) {
                              setRequest(result.data.request as RequestDetail);
                              toastSuccess('Comment permissions updated');
                            } else {
                              // Fallback: optimistic update
                              setRequest(prev => prev ? { ...prev, commentsEnabled: newVal } : prev);
                              toastSuccess('Comment permissions updated');
                            }
                          } else {
                            toastError(result.error.message || 'Failed to update comment permissions');
                          }
                        } catch (err) {
                          toastError(ACTION_MESSAGES.NETWORK_ERROR);
                        } finally {
                          setTogglingCommentsFlag(false);
                        }
                      }}
                      disabled={togglingCommentsFlag}
                    >
                      {togglingCommentsFlag ? 'Updating...' : (request?.commentsEnabled ? 'Disable Comments' : 'Enable Comments')}
                    </Button>
                    <div className="text-sm text-muted-foreground">Current: <span className="font-medium">{request?.commentsEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                {isCustomer ? '📅' : <Clock className="h-4 w-4 shrink-0" />}
                <span>{isCustomer ? 'Application History' : 'Activity Timeline'}</span>
              </CardTitle>
              <CardDescription>
                {isCustomer ? 'Track every step of your loan application journey' : 'Complete history of all actions and updates'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {timelineEvents.length > 0 ? (
                  timelineEvents.map((event, index) => (
                    <TimelineEvent
                      key={event.id}
                      event={event}
                      isLast={index === timelineEvents.length - 1}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      {/* Preview Modal for agreements and stamped documents */}
      <PreviewModal
        open={previewOpen}
        onClose={async () => {
          setPreviewOpen(false);
          // If we need to finalize the process after showing the stamped PDF, do it now
          if (finalizeAfterPreview) {
            setFinalizeAfterPreview(false);
            try {
              setUploadProgress('Completing signature process...');
              await handleStatusUpdate(REQUEST_STATUS.PENDING_BANK_DETAILS);
              setUploadProgress('');
              // Reload to fetch updated docs/status
              window.location.reload();
            } catch (e) {
              setUploadProgress('');
            }
          }
        }}
        source={previewSource}
        hidePdfToolbar={true}
      />
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    if (['APPROVED', 'COMPLETED', 'AMOUNT_DISBURSED', 'ACTIVE'].includes(status)) return 'default';
    if (['REJECTED', 'CANCELLED', 'OFFER_DECLINED', 'DEFAULTED'].includes(status)) return 'destructive';
    return 'outline';
  };

  const getIcon = () => {
    if (['APPROVED', 'COMPLETED', 'AMOUNT_DISBURSED', 'ACTIVE'].includes(status)) return <CheckCircle className="h-4 w-4" />;
    if (['REJECTED', 'CANCELLED', 'OFFER_DECLINED'].includes(status)) return <XCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <Badge variant={getVariant()} className="px-4 py-2 text-sm flex items-center gap-2 w-fit">
      {getIcon()}
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  action: string;
  actor?: {
    id: string;
    firstName?: string;
    lastName?: string;
  } | null;
  roleLabel?: string;
  description?: string | Array<{ key: string; value: string }>;
}

function TimelineEvent({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const getIcon = () => {
    const action = event.action?.toUpperCase() || '';
    if (action.includes('REJECT') || action.includes('CANCEL') || action.includes('DECLINE')) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (action.includes('APPROVE') || action.includes('ACCEPT') || action.includes('COMPLETE') || action.includes('DISBURSED')) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (action.includes('COMMENT')) {
      return <MessageCircle className="h-5 w-5 text-blue-600" />;
    }
    if (action.includes('ASSIGN')) {
      return <Users className="h-5 w-5 text-purple-600" />;
    }
    if (action.includes('UPLOAD') || action.includes('DOCUMENT')) {
      return <Upload className="h-5 w-5 text-orange-600" />;
    }
    if (action.includes('OFFER')) {
      return <IndianRupee className="h-5 w-5 text-blue-600" />;
    }
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  const getActionColor = () => {
    const action = event.action?.toUpperCase() || '';
    if (action.includes('REJECT') || action.includes('CANCEL') || action.includes('DECLINE')) {
      return 'text-destructive';
    }
    if (action.includes('APPROVE') || action.includes('ACCEPT') || action.includes('COMPLETE') || action.includes('DISBURSED')) {
      return 'text-green-600';
    }
    if (action.includes('COMMENT')) {
      return 'text-blue-600';
    }
    if (action.includes('ASSIGN')) {
      return 'text-purple-600';
    }
    if (action.includes('UPLOAD') || action.includes('DOCUMENT')) {
      return 'text-orange-600';
    }
    if (action.includes('OFFER')) {
      return 'text-blue-600';
    }
    return 'text-muted-foreground';
  };

  return (
    <div className="relative pl-8 pb-5">
      {!isLast && (
        <div className="absolute left-[9px] top-7 bottom-0 w-0.5 bg-border"></div>
      )}
      <div className="absolute left-0 top-0 bg-background border-2 border-border rounded-full p-1">
        {getIcon()}
      </div>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={`font-semibold text-sm ${getActionColor()}`}>{event.title}</p>
            {event.roleLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                by <span className="font-medium">
                  {event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : 'System'}
                </span>
                <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0">
                  {event.roleLabel}
                </Badge>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(event.date)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(event.date).toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        </div>
        {event.description && (
          <div className="text-xs mt-2">
            {typeof event.description === 'string' ? (
              <div className="p-2 bg-muted/50 rounded-md border">
                <p className="text-muted-foreground">{event.description}</p>
              </div>
            ) : Array.isArray(event.description) ? (
              <div className="p-2 bg-muted/50 rounded-md border space-y-1">
                {event.description.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-muted-foreground font-medium min-w-[100px]">{item.key}:</span>
                    <span className="font-semibold flex-1">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions
function buildTimeline(request: RequestDetail, isAdmin: boolean): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Add initial submission event using request createdAt
  const submissionDate = request.createdAt || 
    (request.requestHistory && request.requestHistory.length > 0
      ? request.requestHistory[0].createdAt
      : new Date().toISOString());
    
  events.push({
    id: `submitted-${request.id}`,
    date: submissionDate,
    type: 'history',
    title: 'Request Submitted',
    action: 'REQUEST_SUBMITTED',
    actor: request.customer || null,
    roleLabel: 'Customer',
    description: [
      { key: 'Asset Type', value: request.assetType || 'N/A' },
      { key: 'Requested Amount', value: `₹${request.requestedAmount.toLocaleString()}` },
      { key: 'District', value: request.district },
    ],
  });

  // Process request history with enhanced status change detection
  (request.requestHistory || []).forEach((h) => {
    const actor = h.actor || null;
    let roleLabel = '';
    if (actor && Array.isArray(actor.roles)) {
      if (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN)) {
        roleLabel = 'Admin';
      } else if (actor.roles.includes(ROLES.AGENT)) {
        roleLabel = 'Agent';
      } else if (actor.roles.includes(ROLES.CUSTOMER)) {
        roleLabel = 'Customer';
      }
    } else if (!actor) {
      // System actions have null actor
      roleLabel = 'System';
    }

    const metadata = (h.metadata || {}) as Record<string, any>;
    const fromStatus = metadata.fromStatus;
    const toStatus = metadata.toStatus;
    
    // Build title with status transition if available
    let title = h.action?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || 'Action';
    
    // Override title for status changes: show previous -> new in a single line (e.g. "Pending → Under Review")
    // The description/body will not repeat the previous/new status to keep the history compact.
    if (fromStatus && toStatus) {
      const fromLabel = formatStatusLabel(fromStatus);
      const toLabel = formatStatusLabel(toStatus);
      title = `${fromLabel} → ${toLabel}`;
    } else if (toStatus === REQUEST_STATUS.MORE_INFO_REQUIRED || h.action === REQUEST_STATUS.MORE_INFO_REQUIRED) {
      // Admin requested more info: show a clear title and include structured fields/note
      title = 'Additional Information Requested';
    } else if (h.action === 'ASSIGNED_AGENT' && metadata.agentName) {
      title = `Agent Assigned: ${metadata.agentName}`;
    } else if (h.action === 'LOAN_CREATED') {
      title = 'Loan Created & EMI Schedule Generated';
    } else if (h.action === 'OFFER_SENT') {
      title = 'Loan Offer Sent to Customer';
    } else if (h.action === 'DOCUMENT_UPLOADED' || h.action === 'DOCUMENTS_UPLOADED') {
      // Document upload events
      const fileNames = metadata.fileNames || metadata.fileName || [];
      const fileNameArray = Array.isArray(fileNames) ? fileNames : [fileNames].filter(Boolean);
      const count = fileNameArray.length;
      if (count === 1) {
        title = `Document Uploaded: ${fileNameArray[0]}`;
      } else if (count > 1) {
        title = `${count} Documents Uploaded`;
      } else {
        title = 'Documents Uploaded';
      }
    }

    // Build description based on action type
    let description: string | HistoryEventDescription[] | undefined;
    
    if (h.action === 'OFFER_SENT') {
      // Special formatting for offer details
      const descItems: HistoryEventDescription[] = [];
      if (metadata.amount) descItems.push({ key: 'Offered Amount', value: `₹${Number(metadata.amount).toLocaleString()}` });
      if (metadata.tenureMonths) descItems.push({ key: 'Tenure', value: `${metadata.tenureMonths} months` });
      if (metadata.interestRate) descItems.push({ key: 'Interest Rate', value: `${metadata.interestRate}% per annum` });
      if (metadata.penaltyPercentage) descItems.push({ key: 'Penalty Rate', value: `${metadata.penaltyPercentage}%` });
      if (metadata.lateFeePercentage) descItems.push({ key: 'Late Fee', value: `${metadata.lateFeePercentage}%` });
      if (metadata.notes) descItems.push({ key: 'Note', value: String(metadata.notes) });
      description = descItems.length > 0 ? descItems : undefined;
    } else if (h.action === 'ASSIGNED_AGENT') {
      // Agent assignment details
      const descItems: HistoryEventDescription[] = [];
      if (metadata.agentName) descItems.push({ key: 'Agent', value: metadata.agentName });
      if (metadata.inspectionScheduledAt) {
        try {
          const scheduleDate = new Date(metadata.inspectionScheduledAt);
          descItems.push({ key: 'Inspection Scheduled', value: scheduleDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) });
        } catch (e) {
          descItems.push({ key: 'Inspection Scheduled', value: String(metadata.inspectionScheduledAt) });
        }
      }
      description = descItems.length > 0 ? descItems : undefined;
    } else if (h.action === 'DOCUMENT_UPLOADED' || h.action === 'DOCUMENTS_UPLOADED') {
      // Document upload details - show file names and uploader info
      const descItems: HistoryEventDescription[] = [];
      
      // Show file names
      const fileNames = metadata.fileNames || metadata.fileName || [];
      const fileNameArray = Array.isArray(fileNames) ? fileNames : [fileNames].filter(Boolean);
      if (fileNameArray.length > 0) {
        if (fileNameArray.length === 1) {
          descItems.push({ key: 'File', value: fileNameArray[0] });
        } else {
          descItems.push({ key: 'Files', value: fileNameArray.join(', ') });
        }
      }
      
      // Show document types for admins
      if (isAdmin && metadata.documentTypes) {
        const docTypes = Array.isArray(metadata.documentTypes) ? metadata.documentTypes : [metadata.documentTypes].filter(Boolean);
        if (docTypes.length > 0) {
          descItems.push({ key: 'Type', value: docTypes.join(', ') });
        }
      }
      
      // Show uploader role for admins
      if (isAdmin && metadata.uploaderRoles) {
        const roles = Array.isArray(metadata.uploaderRoles) ? metadata.uploaderRoles : [metadata.uploaderRoles].filter(Boolean);
        if (roles.length > 0) {
          const roleLabels = roles.map((role: string) => {
            switch (role) {
              case 'ADMIN_SUBMITTED': return 'Admin';
              case 'AGENT_SUBMITTED': return 'Agent';
              case 'USER_SUBMITTED': return 'Customer';
              default: return role;
            }
          });
          descItems.push({ key: 'Uploaded by', value: roleLabels.join(', ') });
        }
      }
      
      description = descItems.length > 0 ? descItems : undefined;
    } else if (toStatus === REQUEST_STATUS.MORE_INFO_REQUIRED || h.action === REQUEST_STATUS.MORE_INFO_REQUIRED) {
      // Structured Admin Requested Info — admins see full metadata; non-admins see only the note (if allowed)
      const descItems: HistoryEventDescription[] = [];
      if (isAdmin) {
        if (metadata.requestedByName) descItems.push({ key: 'Requested By', value: String(metadata.requestedByName) });
        if (metadata.requestedByRole) descItems.push({ key: 'Requested Role', value: String(metadata.requestedByRole) });
        if (Array.isArray(metadata.fields) && metadata.fields.length) descItems.push({ key: 'Requested Fields', value: String(metadata.fields.join(', ')) });
        if (metadata.dueBy) {
          try {
            const d = new Date(metadata.dueBy);
            descItems.push({ key: 'Due By', value: d.toLocaleDateString('en-IN') });
          } catch (e) {
            descItems.push({ key: 'Due By', value: String(metadata.dueBy) });
          }
        }
        if (metadata.note) descItems.push({ key: 'Note', value: String(metadata.note) });
      } else {
        // Non-admins: show only the note (if present) — do not expose role/fields/due date
        if (metadata.note) descItems.push({ key: 'Note', value: String(metadata.note) });
      }
      description = descItems.length > 0 ? descItems : undefined;
    } else if (fromStatus && toStatus) {
      // Status change: to avoid repeating the same info in title + body, we only include the note (if any)
      // Admins and non-admins follow the same non-repeating presentation; notes are shown based on the PUBLIC_NOTE_STATUSES list.
      const PUBLIC_NOTE_STATUSES = new Set([REQUEST_STATUS.MORE_INFO_REQUIRED, REQUEST_STATUS.REJECTED, REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.PENDING_BANK_DETAILS, REQUEST_STATUS.PENDING_SIGNATURE, REQUEST_STATUS.OFFER_SENT]);
      const descItems: HistoryEventDescription[] = [];

      if (isAdmin) {
        // Admins can see notes for all transitions where provided (skip auto-transition placeholder notes)
        if (metadata.note && metadata.note !== 'Auto-transitioned to signature collection') {
          descItems.push({ key: 'Note', value: String(metadata.note) });
        }
      } else {
        // Non-admins: only include note when the new status is in the public list
        if (PUBLIC_NOTE_STATUSES.has(toStatus) && metadata.note && metadata.note !== 'Auto-transitioned to signature collection') {
          descItems.push({ key: 'Note', value: String(metadata.note) });
        }
      }

      description = descItems.length > 0 ? descItems : undefined;
    } else {
      // Generic metadata display
      if (isAdmin) {
        const filteredMetadata = Object.entries(metadata)
          .filter(([key]) => !['agentId', 'fromStatus', 'toStatus'].includes(key))
          .map(([key, value]) => {
            let displayValue = String(value);
            
            // Format currency values
            if (key.toLowerCase().includes('amount') && !isNaN(Number(value))) {
              displayValue = `₹${Number(value).toLocaleString()}`;
            }
            
            // Format percentage values
            if ((key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage')) && !isNaN(Number(value))) {
              displayValue = `${value}%`;
            }
            
            // Format tenure
            if (key.toLowerCase().includes('tenure') && !isNaN(Number(value))) {
              displayValue = `${value} months`;
            }
            
            return { 
              key: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim(),
              value: displayValue 
            };
          });
        
        description = filteredMetadata.length > 0 ? filteredMetadata : undefined;
      } else {
        // Non-admins: do not show generic metadata
        description = undefined;
      }
    }

    events.push({
      id: `h-${h.id}`,
      date: h.createdAt,
      type: 'history',
      title,
      action: h.action,
      actor,
      roleLabel,
      description,
    });
  });

  // Process comments
  (request.comments || []).forEach((c) => {
    const actor = c.author || null;
    let roleLabel = '';
    if (actor && Array.isArray(actor.roles)) {
      if (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN)) {
        roleLabel = 'Admin';
      } else if (actor.roles.includes(ROLES.AGENT)) {
        roleLabel = 'Agent';
      } else if (actor.roles.includes(ROLES.CUSTOMER)) {
        roleLabel = 'Customer';
      }
    }

    events.push({
      id: `c-${c.id}`,
      date: c.createdAt,
      type: 'comment',
      title: 'Comment Added',
      action: 'COMMENT',
      actor,
      roleLabel,
      description: c.content,
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

// Format status labels to be human-readable
function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-IN', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}
