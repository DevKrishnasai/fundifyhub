'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  MoreHorizontal, 
  RefreshCw,
  Share2,
  Printer,
  Loader2,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { useRazorpay } from '@/hooks/use-razorpay';
import { useToast } from '@/hooks/use-toast';
import type { EMIScheduleType } from '@fundifyhub/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { REQUEST_STATUS, WORKFLOW_EVENTS, ROLES } from '@fundifyhub/types';
import { ACTION_CONFIG } from '@fundifyhub/utils';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

// Contexts
import { useRequest } from './context/RequestContext';
import { useRequestActions } from './context/RequestActionContext';
import { useAuth } from '@/contexts/AuthContext';

// Layout & Guards
import { RequestSkeleton } from './layout/RequestSkeleton';
import { SectionErrorBoundary } from './guards/SectionErrorBoundary';

// Status
import { StatusBanner } from './status/StatusBanner';
import { UploadDocumentModal } from './modals/UploadDocumentModal';
import { DocumentPreviewModal } from './modals/DocumentPreviewModal';
import type { DocumentType } from '@fundifyhub/types';

// Sections
import { AssetSection } from './sections/AssetSection';
import { OfferSection } from './sections/OfferSection';
import { InspectionSection } from './sections/InspectionSection';
import { DocumentsSection } from './sections/DocumentsSection';
import { LoanSection } from './sections/LoanSection';
import { CommentsSection } from './sections/CommentsSection';
import { BankDetailsSection } from './sections/BankDetailsSection';
import { SignatureSection } from './sections/SignatureSection';
import { RequestHero } from './sections/RequestHero';

import { ResponseSection } from './sections/ResponseSection';

// Sidebar
import { PeopleSidebar } from './sidebar/PeopleSidebar';
import { TimelineSidebar } from './sidebar/TimelineSidebar';

// Workflow
import { WorkflowActionBar } from './workflow/WorkflowActionBar';
import type { WorkflowAction as UIWorkflowAction } from './workflow/WorkflowActionBar';

// Icon mapping
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function getIconByName(iconName?: string): LucideIcon | undefined {
  if (!iconName) return undefined;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName];
}

type SectionUserRole = keyof typeof ROLES;
function getSectionUserRole(userRoles: string[]): SectionUserRole {
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return ROLES.SUPER_ADMIN;
  if (userRoles.includes(ROLES.DISTRICT_ADMIN)) return ROLES.DISTRICT_ADMIN;
  if (userRoles.includes(ROLES.AGENT)) return ROLES.AGENT;
  return ROLES.CUSTOMER;
}

export function RequestDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { request, isLoading, error, refresh } = useRequest();
  const { availableActions, isActionLoading, openAction, executeAction } = useRequestActions();
  const { toast, error: toastError } = useToast();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  
  // Razorpay payment hook
  const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpay({
    onSuccess: () => {
      toast('Payment successful! EMI has been marked as paid.');
      refresh();
    },
    onError: (errorMsg) => {
      toastError(errorMsg || 'Payment failed. Please try again.');
    },
    onCancel: () => {
      toast('Payment cancelled.');
    },
  });
  
  // Document Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('OTHER');

  const handleUpload = (category: string) => {
    setUploadCategory(category);
    setUploadModalOpen(true);
  };

  const handlePreview = (doc: DocumentType) => {
    setSelectedDocument(doc);
    setPreviewModalOpen(true);
  };

  const handleDocumentUploaded = async () => {
    setUploadModalOpen(false);
    await refresh();
  };

  // Handle EMI Payment via Razorpay
  const handlePayEmi = useCallback(async (emi: EMIScheduleType) => {
    if (!request?.loan?.id) {
      toastError('Loan information not found');
      return;
    }
    
    await initiatePayment({
      loanId: request.loan.id,
      emiId: emi.id,
      emiNumber: emi.emiNumber,
    });
  }, [request?.loan?.id, initiatePayment, toastError]);

  // Sync local state with request data
  React.useEffect(() => {
    if (request) {
      setCommentsEnabled(request.commentsEnabled ?? true);
    }
  }, [request]);

  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes(ROLES.SUPER_ADMIN) || userRoles.includes(ROLES.DISTRICT_ADMIN);
  const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN);
  const isAgent = userRoles.includes(ROLES.AGENT);
  const isCustomer = userRoles.includes(ROLES.CUSTOMER);
  const userRole = getSectionUserRole(userRoles);
  const isRequestOwner = request?.customerId === user?.id;
  const isAssignedAgent = request?.assignedAgentId === user?.id;
  const isAssignedAdmin = request?.assignedAdminId === user?.id;

  const currentStatus = (request?.currentStatus || '') as REQUEST_STATUS;

  // Find the latest status update reason to display in the banner
  const statusReason = useMemo(() => {
    if (!request?.requestHistory) return undefined;
    // Find the most recent history item that transitioned TO the current status
    const historyItem = request.requestHistory.find(
      (h) => {
        const meta = h.metadata as any;
        // Check for both action types (mapped vs raw) and status field location
        return (h.action === 'STATUS_UPDATED' || h.action === 'REQUEST_STATUS_CHANGED') && 
               (meta?.toStatus === currentStatus || meta?.status === currentStatus);
      }
    );
    
    if (!historyItem) return undefined;
    const meta = historyItem.metadata as any;
    return meta?.reason || meta?.note || meta?.message;
  }, [request, currentStatus]);

  // Convert available actions to UI actions
  const uiActions: UIWorkflowAction[] = useMemo(() => {
    if (!request || !user) return [];
    
    return availableActions.map((action) => {
      const Icon = getIconByName(action.icon);
      
      return {
        id: action.id,
        label: action.label,
        icon: Icon,
        variant: action.variant || 'default',
        isPrimary: (action.priority || 99) <= 2,
        isDisabled: isActionLoading,
        onClick: () => {
          // If the action requires a modal (has inputs), open it
          // Otherwise, execute it directly (or with confirmation)
          // For now, we rely on the ActionModalManager to handle specific IDs
          // But some actions might be direct execution
          
          // List of actions that definitely need modals
          const modalActions: string[] = Object.entries(ACTION_CONFIG)
            .filter(([_, config]) => config.modalComponent)
            .map(([eventId]) => eventId);

          if (modalActions.includes(action.id) || action.requiresConfirmation) {
            openAction(action.id);
          } else {
            // Direct execution
            executeAction(action.id);
          }
        },
        confirmRequired: action.requiresConfirmation,
        confirmMessage: action.description,
        tooltip: action.tooltip,
      };
    });
  }, [availableActions, isActionLoading, openAction, executeAction, request, user]);

  // Section visibility logic
  const showOfferSection = request?.adminOfferedAmount || [
    REQUEST_STATUS.OFFER_SENT, REQUEST_STATUS.OFFER_ACCEPTED, REQUEST_STATUS.OFFER_DECLINED,
    REQUEST_STATUS.INSPECTION_SCHEDULED, REQUEST_STATUS.INSPECTION_IN_PROGRESS,
    REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_SIGNATURE,
    REQUEST_STATUS.PENDING_BANK_DETAILS, REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
    REQUEST_STATUS.TRANSFER_FAILED, REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.ACTIVE,
  ].includes(currentStatus);

  const showInspectionSection = [
    REQUEST_STATUS.INSPECTION_SCHEDULED, REQUEST_STATUS.INSPECTION_IN_PROGRESS,
    REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
    REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE, REQUEST_STATUS.ASSET_MISMATCH, REQUEST_STATUS.AGENT_NOT_AVAILABLE,
    REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_SIGNATURE, REQUEST_STATUS.PENDING_BANK_DETAILS,
    REQUEST_STATUS.BANK_DETAILS_SUBMITTED, REQUEST_STATUS.TRANSFER_FAILED,
    REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.ACTIVE,
  ].includes(currentStatus) || request?.assignedAgentId;

  const showSignatureSection = [
    REQUEST_STATUS.APPROVED, REQUEST_STATUS.PENDING_SIGNATURE, REQUEST_STATUS.PENDING_BANK_DETAILS,
    REQUEST_STATUS.BANK_DETAILS_SUBMITTED, REQUEST_STATUS.TRANSFER_FAILED,
    REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.ACTIVE,
  ].includes(currentStatus);

  const showBankDetailsSection = [
    REQUEST_STATUS.PENDING_BANK_DETAILS, REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
    REQUEST_STATUS.TRANSFER_FAILED, REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.ACTIVE,
  ].includes(currentStatus) || request?.bankAccountNumber;

  const showLoanSection = request?.loan || [
    REQUEST_STATUS.AMOUNT_DISBURSED, REQUEST_STATUS.ACTIVE, REQUEST_STATUS.PAYMENT_OVERDUE, REQUEST_STATUS.COMPLETED,
  ].includes(currentStatus);

  // Permissions
  // Document upload restricted to:
  // - Customer (owner) in allowed statuses
  // - Assigned admin for this request
  // - Super admin (can upload for any request)
  const canUploadDocuments = (isCustomer && isRequestOwner) || 
    isSuperAdmin || 
    (isAssignedAdmin);
  const canSign = isCustomer && isRequestOwner && currentStatus === REQUEST_STATUS.PENDING_SIGNATURE;
  const canSubmitBankDetails = isCustomer && isRequestOwner && currentStatus === REQUEST_STATUS.PENDING_BANK_DETAILS;
  const canPayEmi = isCustomer && isRequestOwner && [REQUEST_STATUS.ACTIVE, REQUEST_STATUS.PAYMENT_OVERDUE].includes(currentStatus);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleCommentsToggle = async (enabled: boolean) => {
    setCommentsEnabled(enabled);
    await executeAction(WORKFLOW_EVENTS.TOGGLE_COMMENTS, { notes: enabled ? 'enable' : 'disable' });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <Card className="shadow-lg max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view this request.
            </p>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !request || !user) {
    return <RequestSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 -ml-2 h-9 w-9">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{request.requestNumber}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-9 w-9">
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>

              {isAdmin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Admin Settings</h4>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label htmlFor="comments-toggle" className="text-sm">Allow Comments</Label>
                        <Switch id="comments-toggle" checked={commentsEnabled} onCheckedChange={handleCommentsToggle} />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefresh}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</DropdownMenuItem>
                  <DropdownMenuItem><Share2 className="mr-2 h-4 w-4" /> Share</DropdownMenuItem>
                  <DropdownMenuItem><Printer className="mr-2 h-4 w-4" /> Print</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Hero Stats */}
        <RequestHero 
          request={request} 
          userRole={userRole} 
          className="mb-6"
          onAction={(action) => {
            if (action === 'pay-emi') {
              // Scroll to loan section or open payment modal
              const loanSection = document.getElementById('loan-section');
              if (loanSection) {
                loanSection.scrollIntoView({ behavior: 'smooth' });
              }
            } else if (action === 'view-offer') {
              const offerSection = document.getElementById('offer-section');
              if (offerSection) {
                offerSection.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
        />

        {/* Status Banner */}
        <StatusBanner
          status={currentStatus}
          userRole={userRole}
          showPhaseProgress={false}
          customDescription={statusReason}
          context={{
            inspectionDate: request.inspectionScheduledAt ? format(new Date(request.inspectionScheduledAt), 'PPp') : undefined,
            agentName: request.assignedAgent ? `${request.assignedAgent.firstName} ${request.assignedAgent.lastName}` : undefined,
          }}
          className="mb-6"
        />

        {/* Workflow Actions */}
        {uiActions.length > 0 && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {isCustomer ? 'Your Actions' : 'Available Actions'}
                </span>
              </div>
              <WorkflowActionBar actions={uiActions} maxVisible={4} isLoading={isActionLoading} />
            </CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Details */}
            <SectionErrorBoundary sectionName="Asset Details">
              <AssetSection request={request} />
            </SectionErrorBoundary>

            {/* Response Section for More Info Required */}
            {isCustomer && isRequestOwner && currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED && (
              <SectionErrorBoundary sectionName="Response">
                <ResponseSection
                  requestId={request.id}
                  currentStatus={currentStatus}
                  adminRequestedInfo={request.adminRequestedInfo}
                  onSuccess={handleRefresh}
                />
              </SectionErrorBoundary>
            )}

            {showOfferSection && (
              <SectionErrorBoundary sectionName="Loan Offer">
                <OfferSection
                  request={request}
                  userRole={userRole}
                  onAcceptOffer={() => openAction(WORKFLOW_EVENTS.ACCEPT_OFFER)}
                  onDeclineOffer={() => openAction(WORKFLOW_EVENTS.DECLINE_OFFER)}
                  onReviseOffer={() => openAction(WORKFLOW_EVENTS.REVISE_OFFER)}
                  isActionLoading={isActionLoading}
                />
              </SectionErrorBoundary>
            )}

            {showInspectionSection && (
              <SectionErrorBoundary sectionName="Inspection">
                <InspectionSection
                  request={request}
                  userRole={userRole}
                  currentUserId={user.id}
                  onStartInspection={() => executeAction(WORKFLOW_EVENTS.START_INSPECTION)}
                  onCompleteInspection={() => openAction(WORKFLOW_EVENTS.COMPLETE_INSPECTION)}
                  onRequestReschedule={() => openAction(WORKFLOW_EVENTS.REQUEST_RESCHEDULE)}
                  onReassignAgent={() => openAction(WORKFLOW_EVENTS.REASSIGN_AGENT)}
                  isActionLoading={isActionLoading}
                />
              </SectionErrorBoundary>
            )}

            {showSignatureSection && (
              <SectionErrorBoundary sectionName="Agreement & Signature">
                <SignatureSection
                  requestId={request.id}
                  currentStatus={currentStatus}
                  agreementUrl={(request as any).agreementUrl}
                  signedAgreementUrl={(request as any).signedAgreementUrl}
                  isCustomer={isCustomer && isRequestOwner}
                  onSign={async (dataUrl) => { await executeAction(WORKFLOW_EVENTS.SIGN_AGREEMENT, { notes: dataUrl }); }}
                  onGenerateAgreement={async () => { await executeAction(WORKFLOW_EVENTS.GENERATE_AGREEMENT); }}
                  isLoading={isActionLoading}
                />
              </SectionErrorBoundary>
            )}

            {showBankDetailsSection && (
              <SectionErrorBoundary sectionName="Bank Details">
                <BankDetailsSection
                  requestId={request.id}
                  currentStatus={currentStatus}
                  bankDetails={{
                    bankAccountNumber: request.bankAccountNumber,
                    bankIfscCode: request.bankIfscCode,
                    bankAccountName: request.bankAccountName,
                    upiId: request.upiId,
                  }}
                  isCustomer={isCustomer && isRequestOwner}
                  onSubmit={async (details) => {
                    await executeAction(WORKFLOW_EVENTS.SUBMIT_BANK_DETAILS, {
                      accountNumber: details.bankAccountNumber || undefined,
                      ifscCode: details.bankIfscCode || undefined,
                      accountHolderName: details.bankAccountName || undefined,
                      upiId: details.upiId || undefined,
                    });
                  }}
                  isLoading={isActionLoading}
                />
              </SectionErrorBoundary>
            )}

            {showLoanSection && (
              <SectionErrorBoundary sectionName="Loan Details">
                <LoanSection
                  request={request}
                  userRole={userRole}
                  onPayEmi={handlePayEmi}
                  isActionLoading={isActionLoading || isPaymentProcessing}
                />
              </SectionErrorBoundary>
            )}

            <SectionErrorBoundary sectionName="Documents">
              <DocumentsSection
                request={request}
                userRole={userRole}
                onUpload={handleUpload}
                onPreview={handlePreview}
                onDelete={(doc) => console.log('Delete', doc)}
                isActionLoading={isActionLoading}
              />
            </SectionErrorBoundary>

            <SectionErrorBoundary sectionName="Comments">
              <CommentsSection
                request={request}
                currentUser={user}
                userRole={userRole}
                onAddComment={async (content, isInternal) => {
                  await executeAction(WORKFLOW_EVENTS.ADD_COMMENT, { notes: content, isInternal });
                }}
                isActionLoading={isActionLoading}
                disabled={!commentsEnabled}
                disabledMessage="Comments have been disabled by admin"
              />
            </SectionErrorBoundary>
          </div>

          {/* Right Column - Sidebar (1/3) */}
          <div className="space-y-6">
            <PeopleSidebar request={request} currentUserId={user.id} userRole={userRole} />
            <TimelineSidebar request={request} history={request.requestHistory || []} maxItems={5} userRole={userRole} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <UploadDocumentModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        requestId={request.id}
        category={uploadCategory}
        onSuccess={handleDocumentUploaded}
      />

      <DocumentPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        document={selectedDocument}
      />

      {/* Loading Overlay */}
      {/* {isActionLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="shadow-lg">
            <CardContent className="flex items-center gap-3 py-4 px-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Processing...</span>
            </CardContent>
          </Card>
        </div>
      )} */}
    </div>
  );
}

export default RequestDetailPage;
