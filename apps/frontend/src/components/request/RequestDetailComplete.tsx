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
import { REQUEST_STATUS, ROLES, DOCUMENT_MESSAGES, ACTION_MESSAGES, getActionsForUser, canViewRequestDetail, type WorkflowAction, type UserRole, type UserContext, type RequestContext } from '@fundifyhub/types';
import { useRouter } from 'next/navigation';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { executeRequestAction } from '@/lib/request-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadButton } from '@/components/uploadthing-components';
import type { ClientUploadedFileData } from 'uploadthing/types';
import { SignaturePad } from '@/components/SignaturePad';
import { 
  Calendar, 
  MapPin, 
  IndianRupee, 
  FileText, 
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Download,
  Upload,
  Users,
  PenTool,
  CreditCard,
  Send,
  Eye,
  Loader2
} from 'lucide-react';

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
  adminEmiSchedule?: any;
  
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
  requestHistory?: Array<{
    id: string;
    createdAt: string;
    action: string;
    actorId?: string | null;
    metadata?: any;
    actor?: {
      id: string;
      firstName?: string;
      lastName?: string;
      roles?: string[];
    };
  }>;
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
    approvedAmount: number;
    interestRate: number;
    tenureMonths: number;
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
    status: string;
    paidEMIs: number;
    totalPaidAmount: number;
    remainingAmount?: number | null;
    remainingEMIs?: number | null;
    firstEMIDate?: string | null;
    lastEMIDate?: string | null;
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
  
  // Agent assignment
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionTime, setInspectionTime] = useState('');
  
  // Offer creation
  const [offerAmount, setOfferAmount] = useState('');
  const [offerTenure, setOfferTenure] = useState('');
  const [offerRate, setOfferRate] = useState('');
  const [creatingOffer, setCreatingOffer] = useState(false);
  
  // Bank details
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submittingBank, setSubmittingBank] = useState(false);
  
  // Comments
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  
  // Request More Info
  const [requestedInfo, setRequestedInfo] = useState('');
  const [submittingInfo, setSubmittingInfo] = useState(false);
  
  // Modals
  const [showAssignAgent, setShowAssignAgent] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showDisbursement, setShowDisbursement] = useState(false);
  
  // Disbursement form
  const [transactionRef, setTransactionRef] = useState('');
  const [disbursementProof, setDisbursementProof] = useState<string[]>([]);
  const [submittingDisbursement, setSubmittingDisbursement] = useState(false);

  const isCustomer = auth.isCustomer();
  const isAdmin = auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]);
  const isAgent = auth.isAgent();

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
          districts: auth.user.district,
        },
        {
          customerId: request.customerId,
          districtId: request.district,
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
          districts: auth.user.district,
        },
        {
          customerId: request.customerId,
          districtId: request.district,
          agentId: request.assignedAgentId,
        }
      )
    : false;

  // Load request data
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}`, { 
          credentials: 'include' 
        });
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        if (res.ok) {
          if (mounted) {
            setRequest(data.data.request as RequestDetail);
            
            // Debug: Log loan data
            console.log('🔍 Request loaded:', {
              id: data.data.request.id,
              status: data.data.request.currentStatus,
              hasLoan: !!data.data.request.loan,
              loanData: data.data.request.loan,
              hasEmiSchedule: !!data.data.request.loan?.emisSchedule,
              emiCount: data.data.request.loan?.emisSchedule?.length || 0
            });
            
            // Check sessionStorage for upload flag
            const hasUploaded = sessionStorage.getItem(`uploaded_docs_${id}`) === 'true';
            if (hasUploaded) {
              setHasUploadedNewDocs(true);
            }
          }
        } else {
          alert(data.message || 'Failed to load request');
        }
      } catch (err) {
        alert(ACTION_MESSAGES.NETWORK_ERROR);
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
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/agents/${request.district}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setAgents(data.data.agents || []);
      }
    } catch (err) {
      // Silently fail, agents will be empty array
    }
  };

  // Handle agent assignment
  const handleAssignAgent = async () => {
    if (!selectedAgent) {
      alert('Please select an agent');
      return;
    }
    if (!inspectionDate || !inspectionTime) {
      alert('Please set inspection date and time');
      return;
    }
    
    setAssigningAgent(true);
    try {
      const inspectionDateTime = `${inspectionDate}T${inspectionTime}`;
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          agentId: selectedAgent,
          inspectionDateTime 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRequest(data.data.request);
        setShowAssignAgent(false);
        setInspectionDate('');
        setInspectionTime('');
        alert('Agent assigned successfully with inspection scheduled');
      } else {
        alert(data.message || 'Failed to assign agent');
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setAssigningAgent(false);
    }
  };

  // Handle offer creation
  const handleCreateOffer = async () => {
    const amount = parseFloat(offerAmount);
    const tenure = parseInt(offerTenure);
    const rate = parseFloat(offerRate);
    
    if (!amount || !tenure || !rate) {
      alert('Please fill all offer details');
      return;
    }
    
    setCreatingOffer(true);
    try {
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          amount, 
          tenureMonths: tenure, 
          interestRate: rate 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRequest(data.data.request);
        setShowOffer(false);
        alert('Offer sent to customer');
      } else {
        alert(data.message || 'Failed to create offer');
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setCreatingOffer(false);
    }
  };

  // Handle status updates
  const handleStatusUpdate = async (newStatus: string, note?: string) => {
    try {
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, note })
      });
      const data = await res.json();
      if (res.ok) {
        setRequest(data.data.request);
        
        // Clear the upload flag when status changes
        sessionStorage.removeItem(`uploaded_docs_${id}`);
        setHasUploadedNewDocs(false);
        
        alert(ACTION_MESSAGES.SUCCESS);
      } else {
        alert(data.message || ACTION_MESSAGES.ERROR);
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    }
  };

  // Handle bank details submission
  const handleBankDetailsSubmit = async () => {
    if (!accountNumber || !ifscCode || !accountName) {
      alert('Please fill all required fields');
      return;
    }
    
    setSubmittingBank(true);
    try {
      // Submit bank details to backend
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}/bank-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          bankAccountNumber: accountNumber,
          bankIfscCode: ifscCode,
          bankAccountName: accountName,
          upiId: upiId || null,
        })
      });
      
      if (res.ok) {
        setShowBankDetails(false);
        alert('Bank details submitted successfully! Admin will process your loan soon.');
        // Reload to show updated status
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to submit bank details');
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingBank(false);
    }
  };

  // Handle disbursement submission
  const handleDisbursementSubmit = async () => {
    if (!transactionRef.trim()) {
      alert('Please enter transaction reference/UTR number');
      return;
    }
    
    if (disbursementProof.length === 0) {
      alert('Please upload proof of transfer');
      return;
    }
    
    setSubmittingDisbursement(true);
    try {
      // First, create document records for the proof files
      const documentsPayload = disbursementProof.map((fileKey, index) => ({
        fileKey,
        fileName: `Transfer Proof ${index + 1}`,
        fileType: fileKey.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg',
        fileSize: 0, // Size not available from upload response
        documentType: 'TRANSFER_PROOF',
        documentCategory: 'PAYMENT',
        requestId: request?.id, // Database ID
        uploadedBy: auth.user?.id || '',
        description: `Transaction Ref: ${transactionRef}`,
      }));

      const docRes = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/documents/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documents: documentsPayload })
      });

      if (!docRes.ok) {
        console.error('Failed to create document records');
        // Continue anyway, don't block disbursement
      }

      // Then, add a comment with transaction details (no file keys)
      await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/user/request/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content: `💰 Amount Disbursed\nTransaction Ref: ${transactionRef}\n${disbursementProof.length} proof document(s) uploaded`
        })
      });

      // Finally, update status to AMOUNT_DISBURSED
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: REQUEST_STATUS.AMOUNT_DISBURSED,
          note: `Transaction Ref: ${transactionRef}`
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || 'Failed to record disbursement');
        return;
      }
      
      setShowDisbursement(false);
      alert('Disbursement recorded successfully!');
      window.location.reload();
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingDisbursement(false);
    }
  };

  // Handle request more info submission
  const handleRequestMoreInfo = async () => {
    if (!requestedInfo.trim()) {
      alert('Please specify what information you need');
      return;
    }
    
    setSubmittingInfo(true);
    try {
      // Post comment with the requested info
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/user/request/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: `📋 Admin Requested Info: ${requestedInfo}` })
      });
      
      if (res.ok) {
        await handleStatusUpdate(REQUEST_STATUS.MORE_INFO_REQUIRED);
        setShowRequestInfo(false);
        setRequestedInfo('');
        alert('Request sent to customer');
      } else {
        alert('Failed to request more info');
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
    } finally {
      setSubmittingInfo(false);
    }
  };

  // Handle comment posting
  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    
    setPostingComment(true);
    try {
      const res = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/user/request/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentText })
      });
      const data = await res.json();
      if (res.ok) {
        setRequest(prev => prev ? {
          ...prev,
          comments: [data.data, ...(prev.comments || [])]
        } : null);
        setCommentText('');
      } else {
        alert('Failed to post comment');
      }
    } catch (err) {
      alert(ACTION_MESSAGES.NETWORK_ERROR);
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

      const response = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/documents/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documents })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mark that new docs were uploaded (for enabling submit button)
        setHasUploadedNewDocs(true);
        
        // Persist upload state across reloads
        sessionStorage.setItem(`uploaded_docs_${request?.id}`, 'true');
        
        // Refetch request to get updated documents with signed URLs
        const refreshResponse = await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/requests/${id}`, {
          credentials: 'include'
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setRequest(refreshData.data.request);
        }
        
        setUploadProgress('');
        
        // Show success message
        alert(successMessage);
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Failed to save documents');
      }
    } catch (error) {
      setUploadProgress('');
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Get signed URL for document display
  const getSignedUrl = (fileKey: string) => {
    return `${BACKEND_API_CONFIG.BASE_URL}/api/v1/documents/${fileKey}/signed-url?expiresIn=900`;
  };

  // Handle workflow actions
  const handleWorkflowAction = async (action: WorkflowAction) => {
    console.log('🎯 handleWorkflowAction called with:', action.id);
    
    // Special handlers for actions requiring input/modals
    if (action.id === 'make-offer' || action.id === 'revise-offer') {
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
    if (action.id === 'request-reschedule') {
      const reason = prompt('Please provide a reason for rescheduling:');
      if (!reason || !reason.trim()) return;
      
      const preferredDate = prompt('What date would you prefer? (e.g., 15 Nov 2025)');
      if (!preferredDate || !preferredDate.trim()) return;
      
      const preferredTime = prompt('What time would you prefer? (e.g., 10:00 AM)');
      if (!preferredTime || !preferredTime.trim()) return;
      
      // Post comment with reschedule request details
      await fetch(`${BACKEND_API_CONFIG.BASE_URL}/api/v1/user/request/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content: `🔄 Reschedule Request:\nReason: ${reason}\nPreferred Date: ${preferredDate}\nPreferred Time: ${preferredTime}` 
        })
      });
      
      // Change status to INSPECTION_RESCHEDULE_REQUESTED
      handleStatusUpdate(action.targetStatus);
      return;
    }
    
    // For actions with custom handlers (like create-emi-schedule)
    if (action.id === 'create-emi-schedule') {
      console.log('🚀 Executing create-emi-schedule action');
      
      if (action.requiresConfirmation) {
        const confirmed = confirm(`Are you sure you want to ${action.label.toLowerCase()}? This will create the loan and EMI schedule.`);
        if (!confirmed) return;
      }
      
      const success = await executeRequestAction(
        action.id,
        {
          requestId: id,
          onSuccess: (data) => {
            console.log('✅ Action succeeded:', data);
            // Reload the page to show the updated loan data
            window.location.reload();
          },
          onError: (error) => {
            console.error('❌ Action failed:', error);
            alert(error || 'Failed to create loan and EMI schedule');
          }
        }
      );
      
      return;
    }
    
    // For simple status transitions
    if (action.requiresConfirmation) {
      const confirmed = confirm(`Are you sure you want to ${action.label.toLowerCase()}?`);
      if (!confirmed) return;
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

  const timelineEvents = buildTimeline(request);
  const hasOffer = request.adminOfferedAmount && request.adminTenureMonths && request.adminInterestRate;
  const showOfferToCustomer = isCustomer && hasOffer && [
    REQUEST_STATUS.OFFER_SENT,
    REQUEST_STATUS.OFFER_ACCEPTED,
    REQUEST_STATUS.OFFER_DECLINED
  ].includes(request.currentStatus as REQUEST_STATUS);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Request #{request.requestNumber || request.id.slice(0, 8)}</h1>
          <p className="text-muted-foreground mt-1">Track your loan request status</p>
        </div>
        <StatusBadge status={request.currentStatus} />
      </div>

      {/* Action Buttons - Using Centralized Workflow Engine */}
      {availableActions.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              {/* Dynamically render actions from workflow matrix */}
              {availableActions.map((action) => {
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
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Inspection Alert - Points to upload section below */}
      {isAgent && request.currentStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS && (
        <Card className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
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

      {/* Signature Upload Alert - For Customer in PENDING_SIGNATURE status */}
      {isCustomer && request.currentStatus === REQUEST_STATUS.PENDING_SIGNATURE && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-600 rounded-lg shrink-0">
                <PenTool className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 text-lg">
                  ✍️ Signature Required
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                  Your loan has been approved! Please upload your signature document in the <strong>Documents section below</strong> to proceed.
                </p>
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 rounded-lg px-3 py-2">
                  <span className="text-base">↓</span>
                  <span>Scroll down to the <strong>"Upload Signature"</strong> section</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Details Alert - For Customer in PENDING_BANK_DETAILS status */}
      {isCustomer && request.currentStatus === REQUEST_STATUS.PENDING_BANK_DETAILS && (
        <Card className="mb-6 border-purple-500 bg-purple-50 dark:bg-purple-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-600 rounded-lg shrink-0">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 text-lg">
                  🏦 Bank Details Required
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  Almost done! Please provide your bank account details for loan disbursement.
                </p>
                <Button 
                  onClick={() => setShowBankDetails(true)}
                  className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Submit Bank Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Requested Info Alert - For Customer */}
      {isCustomer && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED && (
        <Card className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Additional Information Required
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                  {/* Show the most recent comment from admin with requested info */}
                  {request.comments
                    ?.filter(c => c.content.includes('Admin Requested Info'))
                    ?.slice(-1)[0]
                    ?.content.replace('📋 Admin Requested Info: ', '') || 
                    'Please submit the requested information or documents.'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  💡 Click "Upload requested documents" button above to submit the required files.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden Modals for actions requiring input */}
      {/* Bank Details Modal */}
      <Dialog open={showBankDetails} onOpenChange={setShowBankDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
            <DialogDescription>Provide your bank details for loan disbursement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Number *</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" />
            </div>
            <div>
              <Label>IFSC Code *</Label>
              <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="SBIN0001234" />
            </div>
            <div>
              <Label>Account Holder Name *</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>UPI ID (Optional)</Label>
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" />
            </div>
            <Button onClick={handleBankDetailsSubmit} disabled={submittingBank} className="w-full">
              {submittingBank ? 'Submitting...' : 'Submit Details'}
            </Button>
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
          <div className="space-y-4">
            {/* Show customer bank details */}
            {request?.bankAccountNumber && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold mb-2">Customer Bank Details:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Account Name:</span>
                    <p className="font-medium">{request.bankAccountName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account Number:</span>
                    <p className="font-mono font-medium">{request.bankAccountNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IFSC Code:</span>
                    <p className="font-mono font-medium">{request.bankIfscCode}</p>
                  </div>
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
              <Label>Transaction Reference / UTR Number *</Label>
              <Input 
                value={transactionRef} 
                onChange={(e) => setTransactionRef(e.target.value)} 
                placeholder="Enter transaction reference or UTR number"
              />
            </div>

            <div>
              <Label>Upload Transfer Proof * (Screenshot/Document)</Label>
              <div className="mt-2">
                <UploadButton
                  endpoint="requestDocument"
                  onClientUploadComplete={(res: ClientUploadedFileData<{ uploadedBy: string }>[]) => {
                    if (res && res.length > 0) {
                      const fileKeys = res.map(f => f.key);
                      setDisbursementProof(prev => [...prev, ...fileKeys]);
                      alert(`${res.length} file(s) uploaded successfully!`);
                    }
                  }}
                  onUploadError={(error: Error) => {
                    alert(`Upload failed: ${error.message}`);
                  }}
                />
              </div>
              {disbursementProof.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">Uploaded: {disbursementProof.length} file(s)</p>
                  {disbursementProof.map((key, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="font-mono">{key.slice(0, 30)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={handleDisbursementSubmit} 
              disabled={submittingDisbursement} 
              className="w-full"
            >
              {submittingDisbursement ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm Disbursement
                </>
              )}
            </Button>
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
              <Label>Required Information *</Label>
              <Textarea 
                value={requestedInfo} 
                onChange={(e) => setRequestedInfo(e.target.value)} 
                placeholder="E.g., Please upload clearer photos of the asset, provide purchase invoice, add ID proof..."
                rows={5}
              />
            </div>
            <Button onClick={handleRequestMoreInfo} disabled={submittingInfo} className="w-full">
              {submittingInfo ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Creation Modal */}
      <Dialog open={showOffer} onOpenChange={setShowOffer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Loan Offer</DialogTitle>
            <DialogDescription>Set terms for this loan request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Offered Amount (₹) *</Label>
              <Input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="50000" />
            </div>
            <div>
              <Label>Tenure (Months) *</Label>
              <Input type="number" value={offerTenure} onChange={(e) => setOfferTenure(e.target.value)} placeholder="12" />
            </div>
            <div>
              <Label>Interest Rate (% per annum) *</Label>
              <Input type="number" step="0.1" value={offerRate} onChange={(e) => setOfferRate(e.target.value)} placeholder="10.5" />
            </div>
            <Button onClick={handleCreateOffer} disabled={creatingOffer} className="w-full">
              {creatingOffer ? 'Creating...' : 'Send Offer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Assignment Modal */}
      <Dialog open={showAssignAgent} onOpenChange={(open) => {
        setShowAssignAgent(open);
        if (open) loadAgents();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {request.assignedAgentId ? 'Reassign Agent' : 'Assign Agent for Inspection'}
            </DialogTitle>
            <DialogDescription>
              {request.assignedAgentId 
                ? `Currently assigned: ${request.assignedAgent?.firstName} ${request.assignedAgent?.lastName}. Select a different agent in ${request.district}`
                : `Select an agent in ${request.district}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Agent *</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName} {agent.phoneNumber && `(${agent.phoneNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agents.length === 0 && <p className="text-sm text-muted-foreground mt-1">No available agents in this district</p>}
            </div>
            
            <div>
              <Label>Inspection Date *</Label>
              <Input 
                type="date" 
                value={inspectionDate} 
                onChange={(e) => setInspectionDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label>Inspection Time *</Label>
              <Input 
                type="time" 
                value={inspectionTime} 
                onChange={(e) => setInspectionTime(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleAssignAgent} 
              disabled={assigningAgent || !selectedAgent || !inspectionDate || !inspectionTime} 
              className="w-full"
            >
              {assigningAgent ? 'Assigning...' : 'Assign Agent & Schedule Inspection'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Asset Type" value={request.assetType || '—'} />
                <InfoItem label="Condition" value={request.assetCondition || '—'} />
                <InfoItem label="Brand" value={request.assetBrand || '—'} />
                <InfoItem label="Model" value={request.assetModel || '—'} />
                {request.purchaseYear && (
                  <InfoItem label="Purchase Year" value={request.purchaseYear.toString()} />
                )}
              </div>
              
              {/* Amount Comparison - Show both requested and offered */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1 text-muted-foreground">Customer Requested</p>
                    <p className={`text-lg font-bold flex items-center gap-2 ${hasOffer ? 'line-through text-muted-foreground' : 'text-primary'}`}>
                      <IndianRupee className="h-4 w-4" />
                      {request.requestedAmount.toLocaleString()}
                    </p>
                  </div>
                  {hasOffer && (
                    <div>
                      <p className="text-sm font-medium mb-1 text-muted-foreground">Admin Offered</p>
                      <p className="text-lg font-bold text-primary flex items-center gap-2">
                        <IndianRupee className="h-4 w-4" />
                        {request.adminOfferedAmount?.toLocaleString()}
                        {request.adminOfferedAmount !== request.requestedAmount && (
                          <span className={`text-xs font-normal px-2 py-1 rounded-full ${
                            (request.adminOfferedAmount || 0) > request.requestedAmount 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {(request.adminOfferedAmount || 0) > request.requestedAmount ? '+' : ''}
                            {(((request.adminOfferedAmount || 0) - request.requestedAmount) / request.requestedAmount * 100).toFixed(1)}%
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {request.AdditionalDescription && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Description</p>
                  <p className="text-sm text-muted-foreground">{request.AdditionalDescription}</p>
                </div>
              )}
              
              {/* Inspection Details - Show when agent is assigned */}
              {request.assignedAgent && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Inspection Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Assigned Agent</p>
                      <p className="text-sm font-medium">{request.assignedAgent.firstName} {request.assignedAgent.lastName}</p>
                      {request.assignedAgent.phoneNumber && (
                        <p className="text-xs text-muted-foreground">{request.assignedAgent.phoneNumber}</p>
                      )}
                    </div>
                    {request.inspectionScheduledAt && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scheduled Date & Time</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(request.inspectionScheduledAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(request.inspectionScheduledAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offer Details - Customer Only */}
          {showOfferToCustomer && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Loan Offer Details
                </CardTitle>
                <CardDescription>Review the offer from our team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                    <p className="text-2xl font-bold text-primary">₹{request.adminOfferedAmount?.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Tenure</p>
                    <p className="text-2xl font-bold">{request.adminTenureMonths} months</p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Interest</p>
                    <p className="text-2xl font-bold">{request.adminInterestRate}%</p>
                  </div>
                </div>

                {request.adminEmiSchedule && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-4">EMI Schedule</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left p-3 font-medium">EMI #</th>
                              <th className="text-left p-3 font-medium">Due Date</th>
                              <th className="text-right p-3 font-medium">Amount</th>
                              <th className="text-right p-3 font-medium">Principal</th>
                              <th className="text-right p-3 font-medium">Interest</th>
                            </tr>
                          </thead>
                          <tbody>
                            {request.adminEmiSchedule.emiSchedule?.map((emi: any, idx: number) => (
                              <tr key={idx} className="border-t hover:bg-muted/50">
                                <td className="p-3">{emi.installment}</td>
                                <td className="p-3">{new Date(emi.paymentDate).toLocaleDateString('en-IN')}</td>
                                <td className="p-3 text-right font-medium">₹{Number(emi.paymentAmount).toLocaleString()}</td>
                                <td className="p-3 text-right">₹{Number(emi.principal).toLocaleString()}</td>
                                <td className="p-3 text-right">₹{Number(emi.interest).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Uploaded documents for this request</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Customer Upload - Only when admin requests more info */}
              {isCustomer && request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED && (
                <div className="mb-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-primary transition-colors">
                  <div className="text-center">
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <h4 className="font-medium mb-2">
                      {request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED 
                        ? '📋 Upload Additional Documents' 
                        : 'Upload Asset Photos'}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {request.currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED 
                        ? 'Upload the documents requested by admin (max 5 images, 4MB each)'
                        : 'Add photos of your asset (max 5 images, 4MB each)'}
                    </p>
                    {uploadProgress ? (
                      <div className="bg-primary/10 rounded-lg p-4">
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm font-medium">{uploadProgress}</p>
                        </div>
                      </div>
                    ) : (
                      <UploadButton
                        endpoint="assetImageUploader"
                        appearance={{
                          button: "bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-md font-medium",
                        }}
                        content={{
                          button: "Select Photos",
                        }}
                        onBeforeUploadBegin={(files: File[]) => {
                          setUploadProgress(`Uploading ${files.length} photo(s)...`);
                          return files;
                        }}
                        onClientUploadComplete={async (res: ClientUploadedFileData<{ fileKey: string; uploadedBy: string; fileName: string; fileSize: number; fileType: string }>[]) => {
                          if (res && res.length > 0) {
                            await handleDocumentUpload(
                              res,
                              'ASSET_PHOTO',
                              'ASSET',
                              `✅ ${res.length} photo(s) uploaded successfully!`
                            );
                          }
                        }}
                        onUploadError={(error: Error) => {
                          setUploadProgress('');
                          alert(DOCUMENT_MESSAGES.UPLOAD_ERROR);
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Digital Signature - For Customer in PENDING_SIGNATURE status */}
              {isCustomer && request.currentStatus === REQUEST_STATUS.PENDING_SIGNATURE && (
                <div className="mb-6">
                  <SignaturePad 
                    requestId={request.id}
                    requestNumber={request.requestNumber || request.id}
                    onSave={async (signatureDataUrl: string) => {
                      try {
                        setUploadProgress('Processing signature...');
                        
                        // Import pdf-lib dynamically (client-side only)
                        const { PDFDocument } = await import('pdf-lib');
                        
                        // Step 1: Download the generated PDF from backend
                        setUploadProgress('Downloading agreement...');
                        const pdfResponse = await fetch(
                          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${request.id}/generate-agreement`,
                          { credentials: 'include' }
                        );
                        
                        if (!pdfResponse.ok) {
                          throw new Error('Failed to generate agreement PDF');
                        }
                        
                        const pdfBlob = await pdfResponse.blob();
                        
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
                        
                        // Step 4: Send to backend to upload to UploadThing and save
                        setUploadProgress('Uploading signed agreement...');
                        const uploadResponse = await fetch(
                          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${request.id}/upload-signed-agreement`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              pdfBase64: base64Pdf,
                              fileName: `signed-agreement-${request.requestNumber || request.id}.pdf`,
                            }),
                          }
                        );
                        
                        if (!uploadResponse.ok) {
                          const errorData = await uploadResponse.json().catch(() => ({}));
                          throw new Error(errorData.error || 'Failed to upload signed document');
                        }
                        
                        // Step 5: Transition to PENDING_BANK_DETAILS
                        setUploadProgress('Completing signature process...');
                        await handleStatusUpdate(REQUEST_STATUS.PENDING_BANK_DETAILS);
                        
                        setUploadProgress('');
                        alert('✅ Agreement signed successfully! Please submit your bank details.');
                        
                        // Reload to show updated status
                        window.location.reload();
                        
                      } catch (error) {
                        console.error('Signature process failed:', error);
                        setUploadProgress('');
                        alert(error instanceof Error ? error.message : 'Failed to process signature. Please try again.');
                      }
                    }}
                  />
                  
                  {uploadProgress && (
                    <div className="mt-4 bg-green-100 dark:bg-green-900 rounded-lg p-4 border-2 border-green-600">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">{uploadProgress}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Agent Upload - During inspection */}
              {isAgent && request.currentStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS && (
                <div className="mb-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 bg-blue-50 dark:bg-blue-950 hover:border-blue-500 transition-colors">
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
                              await handleDocumentUpload(
                                res,
                                'INSPECTION_PHOTO',
                                'INSPECTION',
                                `✅ ${res.length} inspection photo(s) uploaded successfully!`
                              );
                            }
                          }}
                          onUploadError={(error: Error) => {
                            setUploadProgress('');
                            alert(`Upload failed: ${error.message}`);
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
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Document Grid */}
              {request.documents && request.documents.length > 0 ? (
                <>
                  {/* Customer Asset Photos */}
                  {request.documents.filter(doc => doc.documentCategory === 'ASSET').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Customer Asset Photos
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {request.documents.filter(doc => doc.documentCategory === 'ASSET').map((doc) => {
                          const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf');
                          const signedUrl = doc.fileKey ? getSignedUrl(doc.fileKey) : null;
                          
                          return (
                            <div key={doc.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                              {doc.fileKey && (
                                <div className="w-full h-48 bg-muted flex items-center justify-center relative group">
                                  {isPdf ? (
                                    <div className="flex flex-col items-center justify-center p-4">
                                      <FileText className="h-16 w-16 text-muted-foreground mb-2" />
                                      <p className="text-xs text-center text-muted-foreground">PDF Document</p>
                                      <a 
                                        href={signedUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View PDF
                                      </a>
                                    </div>
                                  ) : (
                                    <>
                                      <img 
                                        src={signedUrl || ''} 
                                        alt={doc.fileName || 'Document'} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs text-muted-foreground mt-2">Failed to load</p></div>';
                                          }
                                        }}
                                      />
                                      <a 
                                        href={signedUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                      >
                                        <Eye className="h-8 w-8 text-white" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}
                              <div className="p-3 border-t bg-background">
                                <p className="text-sm font-medium truncate" title={doc.fileName || 'Document'}>
                                  {doc.fileName || 'Document'}
                                </p>
                                <p className="text-xs text-muted-foreground">{doc.documentType || 'General'}</p>
                                {doc.isVerified && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Agent Inspection Photos */}
                  {request.documents.filter(doc => doc.documentCategory === 'INSPECTION').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <User className="h-4 w-4" />
                        Agent Inspection Photos
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {request.documents.filter(doc => doc.documentCategory === 'INSPECTION').map((doc) => {
                          const signedUrl = doc.fileKey ? getSignedUrl(doc.fileKey) : null;
                          
                          return (
                            <div key={doc.id} className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                              {doc.fileKey && (
                                <div className="w-full h-48 bg-muted flex items-center justify-center relative group">
                                  <img 
                                    src={signedUrl || ''} 
                                    alt={doc.fileName || 'Inspection Photo'} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs text-muted-foreground mt-2">Failed to load</p></div>';
                                      }
                                    }}
                                  />
                                  <a 
                                    href={signedUrl || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <Eye className="h-8 w-8 text-white" />
                                  </a>
                                </div>
                              )}
                              <div className="p-3 border-t bg-blue-50 dark:bg-blue-950">
                                <p className="text-sm font-medium truncate" title={doc.fileName || 'Inspection Photo'}>
                                  {doc.fileName || 'Inspection Photo'}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Inspection Photo</p>
                                {doc.isVerified && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Disbursement Proof - Show transfer proof documents */}
                  {request.documents.filter(doc => doc.documentCategory === 'PAYMENT').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Send className="h-4 w-4" />
                        Disbursement Proof ({request.documents.filter(doc => doc.documentCategory === 'PAYMENT').length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {request.documents.filter(doc => doc.documentCategory === 'PAYMENT').map((doc) => {
                          const signedUrl = doc.fileKey ? getSignedUrl(doc.fileKey) : null;
                          const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf');
                          
                          return (
                            <div key={doc.id} className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                              {doc.fileKey && (
                                <div className="w-full h-48 bg-muted flex items-center justify-center relative group">
                                  {isPdf ? (
                                    <div className="flex flex-col items-center justify-center p-4">
                                      <FileText className="h-16 w-16 text-green-600 mb-2" />
                                      <p className="text-xs text-center text-muted-foreground">Transfer Proof PDF</p>
                                      <a 
                                        href={signedUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View PDF
                                      </a>
                                    </div>
                                  ) : (
                                    <>
                                      <img 
                                        src={signedUrl || ''} 
                                        alt={doc.fileName || 'Transfer Proof'} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs text-muted-foreground mt-2">Failed to load</p></div>';
                                          }
                                        }}
                                      />
                                      <a 
                                        href={signedUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                      >
                                        <Eye className="h-8 w-8 text-white" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}
                              <div className="p-3 border-t bg-green-50 dark:bg-green-950">
                                <p className="text-sm font-medium truncate" title={doc.fileName || 'Transfer Proof'}>
                                  {doc.fileName || 'Transfer Proof'}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  Disbursement Document
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs border-green-600 text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Other Documents */}
                  {request.documents.filter(doc => doc.documentCategory !== 'ASSET' && doc.documentCategory !== 'INSPECTION' && doc.documentCategory !== 'PAYMENT').length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Other Documents
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {request.documents.filter(doc => doc.documentCategory !== 'ASSET' && doc.documentCategory !== 'INSPECTION').map((doc) => {
                          const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf');
                          const signedUrl = doc.fileKey ? getSignedUrl(doc.fileKey) : null;
                          
                          return (
                            <div key={doc.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                              {doc.fileKey && (
                                <div className="w-full h-48 bg-muted flex items-center justify-center relative group">
                                  {isPdf ? (
                                    <div className="flex flex-col items-center justify-center p-4">
                                      <FileText className="h-16 w-16 text-muted-foreground mb-2" />
                                      <p className="text-xs text-center text-muted-foreground">PDF Document</p>
                                      <a 
                                        href={signedUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View PDF
                                      </a>
                                    </div>
                                  ) : (
                                    <>
                                      <img 
                                        src={signedUrl || ''} 
                                        alt={doc.fileName || 'Document'} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs text-muted-foreground mt-2">Failed to load</p></div>';
                                          }
                                        }}
                                      />
                                      <a 
                                        href={signedUrl || '#'} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                      >
                                        <Eye className="h-8 w-8 text-white" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              )}
                              <div className="p-3 border-t bg-background">
                                <p className="text-sm font-medium truncate" title={doc.fileName || 'Document'}>
                                  {doc.fileName || 'Document'}
                                </p>
                                <p className="text-xs text-muted-foreground">{doc.documentType || 'General'}</p>
                                {doc.isVerified && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{DOCUMENT_MESSAGES.NO_DOCUMENTS}</p>
              )}
            </CardContent>
          </Card>

          {/* EMI Schedule - Show from OFFER_SENT onwards */}
          {/* If loan exists (ACTIVE status), show actual loan data. Otherwise show preview from adminEmiSchedule */}
          {(request.loan || request.adminEmiSchedule) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {request.loan ? 'EMI Schedule' : 'EMI Schedule Preview'}
                </CardTitle>
                <CardDescription>
                  {request.loan 
                    ? 'Monthly payment schedule for this loan' 
                    : 'Proposed monthly payment schedule - dates will be set after disbursement'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Show actual loan if exists, otherwise show preview */}
                {request.loan && request.loan.emisSchedule && request.loan.emisSchedule.length > 0 ? (
                  <>
                    {/* Actual Loan Summary */}
                    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
                        <p className="text-lg font-bold">₹{request.loan.approvedAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                        <p className="text-lg font-bold">₹{request.loan.emiAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                        <p className="text-lg font-bold">{request.loan.interestRate}% p.a.</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                        <p className="text-lg font-bold">{request.loan.tenureMonths} months</p>
                      </div>
                    </div>

                    {/* Actual EMI Schedule Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-semibold">#</th>
                            <th className="text-left p-2 font-semibold">Due Date</th>
                            <th className="text-right p-2 font-semibold">EMI Amount</th>
                            <th className="text-right p-2 font-semibold">Principal</th>
                            <th className="text-right p-2 font-semibold">Interest</th>
                            <th className="text-center p-2 font-semibold">Status</th>
                            {(auth.user?.roles?.includes(ROLES.SUPER_ADMIN) || auth.user?.roles?.includes(ROLES.DISTRICT_ADMIN)) && (
                              <th className="text-center p-2 font-semibold">Action</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {request.loan.emisSchedule.map((emi: any) => {
                            const isPending = emi.status === 'PENDING';
                            const isPaid = emi.status === 'PAID';
                            const isOverdue = emi.status === 'OVERDUE';
                            const dueDate = new Date(emi.dueDate);
                            const isUpcoming = dueDate > new Date();
                            
                            return (
                              <tr key={emi.id} className={`border-b hover:bg-muted/50 ${isPaid ? 'bg-green-50 dark:bg-green-950/20' : isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                                <td className="p-2 font-medium">#{emi.emiNumber}</td>
                                <td className="p-2">
                                  <div className="flex flex-col">
                                    <span>{dueDate.toLocaleDateString()}</span>
                                    {isUpcoming && isPending && (
                                      <span className="text-xs text-muted-foreground">
                                        ({Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 text-right font-semibold">₹{emi.emiAmount.toLocaleString()}</td>
                                <td className="p-2 text-right text-muted-foreground">₹{emi.principalAmount.toLocaleString()}</td>
                                <td className="p-2 text-right text-muted-foreground">₹{emi.interestAmount.toLocaleString()}</td>
                                <td className="p-2 text-center">
                                  {isPaid && (
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 border-green-300">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Paid
                                    </Badge>
                                  )}
                                  {isOverdue && (
                                    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border-red-300">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Overdue
                                    </Badge>
                                  )}
                                  {isPending && !isOverdue && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-300">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                </td>
                                {(auth.user?.roles?.includes(ROLES.SUPER_ADMIN) || auth.user?.roles?.includes(ROLES.DISTRICT_ADMIN)) && (
                                  <td className="p-2 text-center">
                                    {isPending && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => {
                                          // TODO: Implement payment recording
                                          alert('Payment recording will be implemented next!');
                                        }}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Mark Paid
                                      </Button>
                                    )}
                                    {isPaid && emi.paidDate && (
                                      <span className="text-xs text-muted-foreground">
                                        Paid on {new Date(emi.paidDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Loan Summary */}
                    <div className="mt-6 p-4 bg-muted rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-base font-bold">₹{request.loan.totalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Paid EMIs</p>
                        <p className="text-base font-bold text-green-600">{request.loan.paidEMIs}/{request.loan.tenureMonths}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
                        <p className="text-base font-bold text-green-600">₹{request.loan.totalPaidAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                        <p className="text-base font-bold text-orange-600">₹{(request.loan.remainingAmount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                ) : request.adminEmiSchedule ? (
                  <>
                    {/* Preview from adminEmiSchedule */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Preview:</span> This is the proposed EMI schedule. Actual payment dates will start after amount disbursement.
                      </p>
                    </div>

                    {/* Preview Summary */}
                    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
                        <p className="text-lg font-bold">₹{request.adminOfferedAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                        <p className="text-lg font-bold">₹{request.adminEmiSchedule.monthlyPayment?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                        <p className="text-lg font-bold">{request.adminInterestRate}% p.a.</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                        <p className="text-lg font-bold">{request.adminTenureMonths} months</p>
                      </div>
                    </div>

                    {/* Preview EMI Table - Without dates */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-semibold">Installment</th>
                            <th className="text-right p-2 font-semibold">EMI Amount</th>
                            <th className="text-right p-2 font-semibold">Principal</th>
                            <th className="text-right p-2 font-semibold">Interest</th>
                            <th className="text-right p-2 font-semibold">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {request.adminEmiSchedule.emiSchedule?.map((emi: any, idx: number) => (
                            <tr key={idx} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">#{emi.installment}</td>
                              <td className="p-2 text-right font-semibold">₹{emi.paymentAmount?.toLocaleString()}</td>
                              <td className="p-2 text-right text-muted-foreground">₹{emi.principal?.toLocaleString()}</td>
                              <td className="p-2 text-right text-muted-foreground">₹{emi.interest?.toLocaleString()}</td>
                              <td className="p-2 text-right text-muted-foreground">₹{emi.remainingBalance?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Preview Summary */}
                    <div className="mt-6 p-4 bg-muted rounded-lg grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                        <p className="text-base font-bold text-orange-600">₹{request.adminEmiSchedule.totalInterest?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Repayment</p>
                        <p className="text-base font-bold">₹{request.adminEmiSchedule.totalPayment?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Number of EMIs</p>
                        <p className="text-base font-bold">{request.adminEmiSchedule.emiSchedule?.length || 0} payments</p>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea 
                    value={commentText} 
                    onChange={(e) => setCommentText(e.target.value)} 
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <Button onClick={handlePostComment} disabled={postingComment || !commentText.trim()}>
                    {postingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>

                {request.comments && request.comments.length > 0 ? (
                  <div className="space-y-3">
                    {request.comments.map((c) => (
                      <div key={c.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium">
                            {c.author?.firstName} {c.author?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem 
                label="District" 
                value={request.district}
                icon={<MapPin className="h-4 w-4" />}
              />
              {request.offerMadeDate && (
                <InfoItem 
                  label="Offer Date" 
                  value={new Date(request.offerMadeDate).toLocaleDateString('en-IN')}
                  icon={<Calendar className="h-4 w-4" />}
                />
              )}
              
              {(isAdmin || isAgent) && request.customer && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{request.customer.firstName} {request.customer.lastName}</p>
                    {request.customer.email && <p>{request.customer.email}</p>}
                    {request.customer.phoneNumber && <p>{request.customer.phoneNumber}</p>}
                  </div>
                </div>
              )}

              {request.assignedAgent && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned Agent
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{request.assignedAgent.firstName} {request.assignedAgent.lastName}</p>
                    {request.assignedAgent.phoneNumber && <p>{request.assignedAgent.phoneNumber}</p>}
                    {request.inspectionScheduledAt && (
                      <p className="flex items-center gap-1 text-xs pt-2 border-t mt-2">
                        <Calendar className="h-3 w-3" />
                        Scheduled: {new Date(request.inspectionScheduledAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Details Section - Show to Admin/Agent or Customer (if submitted) */}
              {request.bankAccountNumber && request.bankDetailsSubmittedAt && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Bank Details
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span className="font-medium">Account Name:</span>
                      <span>{request.bankAccountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Account Number:</span>
                      <span className="font-mono">
                        {isCustomer 
                          ? `**** **** ${request.bankAccountNumber.slice(-4)}`
                          : request.bankAccountNumber
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">IFSC Code:</span>
                      <span className="font-mono">{request.bankIfscCode}</span>
                    </div>
                    {request.upiId && (
                      <div className="flex justify-between">
                        <span className="font-medium">UPI ID:</span>
                        <span className="font-mono">{request.upiId}</span>
                      </div>
                    )}
                    <p className="flex items-center gap-1 text-xs pt-2 border-t mt-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      Submitted: {new Date(request.bankDetailsSubmittedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
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
    <Badge variant={getVariant() as any} className="px-4 py-2 text-sm flex items-center gap-2 w-fit">
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

function TimelineEvent({ event, isLast }: { event: any; isLast: boolean }) {
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
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="relative pl-8 pb-4">
      {!isLast && (
        <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border"></div>
      )}
      <div className="absolute left-0 top-0 bg-background p-0.5">
        {getIcon()}
      </div>
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm">{event.title}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(event.date)}
          </p>
        </div>
        {event.actor && (
          <p className="text-xs text-muted-foreground">
            by {event.actor.firstName} {event.actor.lastName}
            {event.roleLabel && ` (${event.roleLabel})`}
          </p>
        )}
        {event.description && (
          <div className="text-xs text-muted-foreground mt-2">
            {typeof event.description === 'string' ? (
              <p>{event.description}</p>
            ) : Array.isArray(event.description) ? (
              <ul className="list-disc list-inside space-y-1">
                {event.description.map((item: any, idx: number) => (
                  <li key={idx}>
                    <strong>{item.key}:</strong> {item.value}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions
function buildTimeline(request: RequestDetail) {
  const events: any[] = [];

  // Add initial submission event using request createdAt
  // Fallback to earliest history entry if createdAt not available
  const submissionDate = request.createdAt || 
    (request.requestHistory && request.requestHistory.length > 0
      ? request.requestHistory[0].createdAt // First item (oldest) since history is sorted by asc
      : new Date().toISOString());
    
  events.push({
    id: `submitted-${request.id}`,
    date: submissionDate,
    type: 'history',
    title: 'Request Submitted',
    action: 'REQUEST_SUBMITTED',
    actor: request.customer,
    roleLabel: 'Customer',
    description: [
      { key: 'Asset Type', value: request.assetType },
      { key: 'Requested Amount', value: `₹${request.requestedAmount.toLocaleString()}` },
      { key: 'District', value: request.district },
    ],
  });

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
    }

    const title = h.action?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || 'Action';
    const metadata = h.metadata ? 
      Object.entries(h.metadata)
        .filter(([key]) => key !== 'agentId') // Skip agentId, we have agentName
        .map(([key, value]) => ({ 
          key: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), 
          value: String(value) 
        })) : undefined;

    events.push({
      id: `h-${h.id}`,
      date: h.createdAt,
      type: 'history',
      title,
      action: h.action,
      actor,
      roleLabel,
      description: metadata,
    });
  });

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
      title: 'Comment',
      action: 'COMMENT',
      actor,
      roleLabel,
      description: c.content,
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
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
