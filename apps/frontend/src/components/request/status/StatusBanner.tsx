'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  FileSearch,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Wallet,
  AlertCircle,
  ArrowRight,
  Info,
  Timer,
  Banknote,
  PenLine,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  CUSTOMER_ACTION_REQUIRED,
  ADMIN_ACTION_REQUIRED,
  AGENT_ACTION_REQUIRED,
  WORKFLOW_MATRIX,
} from '@fundifyhub/types';

/**
 * Status Banner System
 * 
 * Displays contextual, status-aware banners that guide users through the workflow.
 * Shows what's happening, what's expected, and who needs to take action.
 */

// ============================================
// TYPES
// ============================================

export type BannerVariant = 'info' | 'warning' | 'success' | 'error' | 'neutral';

interface BannerConfig {
  icon: LucideIcon;
  variant: BannerVariant;
  title: string;
  description: string | Record<'CUSTOMER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'AGENT', string>;
  actionLabel?: string;
  showProgress?: boolean;
  phase?: number; // 1-6 for workflow phases
}

// ============================================
// STATUS TO BANNER MAPPING
// ============================================

const STATUS_BANNER_CONFIG: Record<REQUEST_STATUS, BannerConfig> = {
  // Phase 1: Submission & Review
  [REQUEST_STATUS.PENDING]: {
    icon: Clock,
    variant: 'info',
    title: 'Awaiting Review',
    description: {
      CUSTOMER: 'Your request has been submitted and is waiting for an admin to review it.',
      DISTRICT_ADMIN: 'New loan request awaiting your review and approval.',
      SUPER_ADMIN: 'New loan request awaiting review and approval.',
      AGENT: 'New loan request has been submitted for admin review.',
    },
    phase: 1,
  },
  [REQUEST_STATUS.UNDER_REVIEW]: {
    icon: FileSearch,
    variant: 'info',
    title: 'Under Review',
    description: {
      CUSTOMER: 'An admin is currently reviewing your request and asset details.',
      DISTRICT_ADMIN: 'You are currently reviewing this request and asset details.',
      SUPER_ADMIN: 'You are currently reviewing this request and asset details.',
      AGENT: 'This request is currently under admin review.',
    },
    phase: 1,
  },
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: {
    icon: FileText,
    variant: 'warning',
    title: 'Additional Information Required',
    description: {
      CUSTOMER: 'Please provide the requested documents or information to proceed.',
      DISTRICT_ADMIN: 'Customer needs to provide additional documents or information.',
      SUPER_ADMIN: 'Customer needs to provide additional documents or information.',
      AGENT: 'Customer needs to provide additional documents or information.',
    },
    actionLabel: 'View Requirements',
    phase: 1,
  },

  // Phase 2: Offer & Negotiation
  [REQUEST_STATUS.OFFER_SENT]: {
    icon: Send,
    variant: 'info',
    title: 'Offer Awaiting Response',
    description: {
      CUSTOMER: 'Review the loan offer and decide whether to accept or decline.',
      DISTRICT_ADMIN: 'Loan offer sent to customer. Awaiting their response.',
      SUPER_ADMIN: 'Loan offer sent to customer. Awaiting their response.',
      AGENT: 'Loan offer has been sent to the customer for review.',
    },
    actionLabel: 'Review Offer',
    phase: 2,
  },
  [REQUEST_STATUS.OFFER_ACCEPTED]: {
    icon: CheckCircle,
    variant: 'success',
    title: 'Offer Accepted',
    description: {
      CUSTOMER: 'Great! Your offer has been accepted. An agent will be assigned for inspection.',
      DISTRICT_ADMIN: 'Customer accepted the offer. Assign an agent for inspection.',
      SUPER_ADMIN: 'Customer accepted the offer. Assign an agent for inspection.',
      AGENT: 'Customer accepted the offer. You may be assigned for inspection.',
    },
    phase: 2,
  },
  [REQUEST_STATUS.OFFER_DECLINED]: {
    icon: XCircle,
    variant: 'neutral',
    title: 'Offer Declined',
    description: 'The previous offer was declined. A new offer may be made.',
    phase: 2,
  },
  [REQUEST_STATUS.OFFER_EXPIRED]: {
    icon: Timer,
    variant: 'warning',
    title: 'Offer Expired',
    description: 'The offer has expired due to no response. Contact admin for a new offer.',
    phase: 2,
  },

  // Phase 3: Inspection
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: {
    icon: Calendar,
    variant: 'info',
    title: 'Inspection Scheduled',
    description: {
      CUSTOMER: 'An agent has been assigned and will visit for asset inspection. Please be available at the scheduled time.',
      DISTRICT_ADMIN: 'Agent assigned for inspection. Monitor progress and handle any rescheduling requests.',
      SUPER_ADMIN: 'Agent assigned for inspection. Monitor progress and handle any rescheduling requests.',
      AGENT: 'You have been assigned for inspection. Visit the customer at the scheduled time.',
    },
    showProgress: true,
    phase: 3,
  },
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: {
    icon: RefreshCw,
    variant: 'warning',
    title: 'Reschedule Requested',
    description: {
      CUSTOMER: 'Your reschedule request has been submitted. Admin will confirm a new date.',
      DISTRICT_ADMIN: 'Customer requested to reschedule inspection. Review and confirm new date.',
      SUPER_ADMIN: 'Customer requested to reschedule inspection. Review and confirm new date.',
      AGENT: 'Customer requested to reschedule inspection. Admin will confirm new date.',
    },
    phase: 3,
  },
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: {
    icon: UserCheck,
    variant: 'info',
    title: 'Inspection In Progress',
    description: {
      CUSTOMER: 'The agent is currently inspecting and verifying your asset. Please cooperate with the inspection.',
      DISTRICT_ADMIN: 'Agent is currently conducting the inspection. Monitor for completion.',
      SUPER_ADMIN: 'Agent is currently conducting the inspection. Monitor for completion.',
      AGENT: 'You are currently conducting the inspection. Complete verification and submit your decision.',
    },
    showProgress: true,
    phase: 3,
  },
  [REQUEST_STATUS.INSPECTION_COMPLETED]: {
    icon: CheckCircle,
    variant: 'success',
    title: 'Inspection Completed',
    description: {
      CUSTOMER: 'Inspection is complete. The agent will make a final decision on your loan request.',
      DISTRICT_ADMIN: 'Inspection completed. Agent will submit their approval/rejection decision.',
      SUPER_ADMIN: 'Inspection completed. Agent will submit their approval/rejection decision.',
      AGENT: 'Inspection completed. Submit your final decision to approve or reject the loan request.',
    },
    phase: 3,
  },
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: {
    icon: User,
    variant: 'warning',
    title: 'Missed Inspection',
    description: {
      CUSTOMER: 'The inspection could not be completed as you were not available. Please reschedule immediately.',
      DISTRICT_ADMIN: 'Customer was not available for inspection. Coordinate rescheduling with the agent.',
      SUPER_ADMIN: 'Customer was not available for inspection. Coordinate rescheduling with the agent.',
      AGENT: 'Customer was not available for inspection. Coordinate with admin for rescheduling.',
    },
    actionLabel: 'Reschedule',
    phase: 3,
  },
  [REQUEST_STATUS.ASSET_MISMATCH]: {
    icon: AlertTriangle,
    variant: 'error',
    title: 'Asset Discrepancy',
    description: {
      CUSTOMER: 'The asset does not match the provided description. Please provide explanation or updated details.',
      DISTRICT_ADMIN: 'Asset does not match description. Review agent findings and decide on next steps.',
      SUPER_ADMIN: 'Asset does not match description. Review agent findings and decide on next steps.',
      AGENT: 'Asset discrepancy found. Document findings and submit recommendation to admin.',
    },
    phase: 3,
  },
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: {
    icon: User,
    variant: 'warning',
    title: 'Agent Unavailable',
    description: {
      CUSTOMER: 'The assigned agent is unavailable. A new agent will be assigned for your inspection.',
      DISTRICT_ADMIN: 'Assigned agent is unavailable. Reassign to a different agent for inspection.',
      SUPER_ADMIN: 'Assigned agent is unavailable. Reassign to a different agent for inspection.',
      AGENT: 'You are unavailable for the scheduled inspection. Admin will reassign to another agent.',
    },
    phase: 3,
  },

  // Phase 4: Approval & Documentation
  [REQUEST_STATUS.APPROVED]: {
    icon: CheckCircle,
    variant: 'success',
    title: 'Request Approved!',
    description: 'Your loan request has been approved. Proceeding to documentation.',
    phase: 4,
  },
  [REQUEST_STATUS.PENDING_SIGNATURE]: {
    icon: PenLine,
    variant: 'warning',
    title: 'Signature Required',
    description: 'Please review and sign the loan agreement to proceed.',
    actionLabel: 'Sign Agreement',
    phase: 4,
  },
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: {
    icon: Wallet,
    variant: 'warning',
    title: 'Bank Details Required',
    description: 'Provide your bank account or UPI details for disbursement.',
    actionLabel: 'Add Bank Details',
    phase: 4,
  },

  // Phase 5: Disbursement
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: {
    icon: Clock,
    variant: 'info',
    title: 'Processing Disbursement',
    description: 'Bank details received. Amount will be disbursed shortly.',
    phase: 5,
  },
  [REQUEST_STATUS.TRANSFER_FAILED]: {
    icon: AlertCircle,
    variant: 'error',
    title: 'Transfer Failed',
    description: 'The transfer could not be completed. Please update your bank details.',
    actionLabel: 'Update Details',
    phase: 5,
  },
  [REQUEST_STATUS.AMOUNT_DISBURSED]: {
    icon: Banknote,
    variant: 'success',
    title: 'Amount Disbursed!',
    description: 'The loan amount has been successfully transferred to your account.',
    phase: 5,
  },

  // Phase 6: Active Loan
  [REQUEST_STATUS.ACTIVE]: {
    icon: CheckCircle,
    variant: 'success',
    title: 'Loan Active',
    description: 'Your loan is active. Make sure to pay EMIs on time.',
    phase: 6,
  },
  [REQUEST_STATUS.PAYMENT_OVERDUE]: {
    icon: AlertTriangle,
    variant: 'error',
    title: 'Payment Overdue',
    description: 'You have overdue EMI payments. Pay now to avoid penalties.',
    actionLabel: 'Pay Now',
    phase: 6,
  },
  [REQUEST_STATUS.DEFAULTED]: {
    icon: XCircle,
    variant: 'error',
    title: 'Loan Defaulted',
    description: 'Multiple payments have been missed. Contact support immediately.',
    phase: 6,
  },
  [REQUEST_STATUS.COMPLETED]: {
    icon: CheckCircle,
    variant: 'success',
    title: 'Loan Completed',
    description: 'Congratulations! All payments completed. Thank you for your business.',
    phase: 6,
  },

  // Terminal States
  [REQUEST_STATUS.REJECTED]: {
    icon: XCircle,
    variant: 'error',
    title: 'Request Rejected',
    description: 'Unfortunately, this request has been rejected.',
    phase: 0,
  },
  [REQUEST_STATUS.CANCELLED]: {
    icon: XCircle,
    variant: 'neutral',
    title: 'Request Cancelled',
    description: 'This request has been cancelled.',
    phase: 0,
  },
};

// ============================================
// VARIANT STYLES
// ============================================

const VARIANT_STYLES: Record<BannerVariant, { bg: string; border: string; icon: string; title: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-900 dark:text-emerald-100',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
  },
  neutral: {
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'text-gray-500 dark:text-gray-400',
    title: 'text-gray-900 dark:text-gray-100',
  },
};

// ============================================
// COMPONENTS
// ============================================

interface StatusBannerProps {
  status: REQUEST_STATUS;
  userRole: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
  onActionClick?: () => void;
  customDescription?: string;
  showPhaseProgress?: boolean;
  className?: string;
  /** Additional context like inspection date, agent name, etc. */
  context?: {
    inspectionDate?: string;
    agentName?: string;
    dueDate?: string;
    overdueAmount?: number;
  };
}

/**
 * Main status banner component - shows contextual information based on status
 */
export function StatusBanner({
  status,
  userRole,
  onActionClick,
  customDescription,
  showPhaseProgress = false,
  className,
  context,
}: StatusBannerProps) {
  const config = STATUS_BANNER_CONFIG[status];
  if (!config) return null;

  const styles = VARIANT_STYLES[config.variant];
  const Icon = config.icon;
  
  // Determine if current user needs to take action
  const isCustomerAction = CUSTOMER_ACTION_REQUIRED.includes(status) && userRole === 'CUSTOMER';
  const isAdminAction = ADMIN_ACTION_REQUIRED.includes(status) && 
    (userRole === 'DISTRICT_ADMIN' || userRole === 'SUPER_ADMIN');
  const isAgentAction = AGENT_ACTION_REQUIRED.includes(status) && userRole === 'AGENT';
  const actionRequired = isCustomerAction || isAdminAction || isAgentAction;

  // Build contextual description
  let baseDescription = config.description;
  if (typeof baseDescription === 'object') {
    baseDescription = baseDescription[userRole] || baseDescription.CUSTOMER || '';
  }
  let description = customDescription || baseDescription;
  if (context?.inspectionDate && status === REQUEST_STATUS.INSPECTION_SCHEDULED) {
    description = `Scheduled for ${context.inspectionDate}${context.agentName ? ` with ${context.agentName}` : ''}.`;
  }
  if (context?.overdueAmount && status === REQUEST_STATUS.PAYMENT_OVERDUE) {
    description = `You have ₹${context.overdueAmount.toLocaleString()} in overdue payments. Pay now to avoid additional penalties.`;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Phase Progress Indicator */}
      {showPhaseProgress && config.phase && config.phase > 0 && (
        <PhaseProgressBar currentPhase={config.phase} />
      )}
      
      {/* Main Banner */}
      <Alert className={cn(styles.bg, styles.border, 'border')}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
        <AlertTitle className={cn('font-semibold', styles.title)}>
          {config.title}
          {actionRequired && (
            <Badge variant="outline" className="ml-2 text-xs">
              Action Required
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="mt-1">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          {/* Action button if applicable */}
          {config.actionLabel && onActionClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onActionClick}
              className="mt-3"
            >
              {config.actionLabel}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Phase progress bar showing workflow stages
 */
interface PhaseProgressBarProps {
  currentPhase: number;
  className?: string;
}

const PHASES = [
  { phase: 1, label: 'Review', icon: FileSearch },
  { phase: 2, label: 'Offer', icon: Send },
  { phase: 3, label: 'Inspection', icon: UserCheck },
  { phase: 4, label: 'Documentation', icon: PenLine },
  { phase: 5, label: 'Disbursement', icon: Banknote },
  { phase: 6, label: 'Active', icon: CheckCircle },
];

export function PhaseProgressBar({ currentPhase, className }: PhaseProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Compact view */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-xs text-muted-foreground">
          Phase {currentPhase} of 6
        </span>
        <div className="flex gap-1">
          {PHASES.map(({ phase }) => (
            <div
              key={phase}
              className={cn(
                'h-1.5 w-6 rounded-full transition-colors',
                phase < currentPhase
                  ? 'bg-emerald-500'
                  : phase === currentPhase
                  ? 'bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Full progress bar */}
      <div className="hidden sm:flex items-center justify-between">
        {PHASES.map(({ phase, label, icon: PhaseIcon }, idx) => (
          <React.Fragment key={phase}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  phase < currentPhase
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : phase === currentPhase
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                    : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                )}
              >
                {phase < currentPhase ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <PhaseIcon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  phase <= currentPhase
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2',
                  phase < currentPhase
                    ? 'bg-emerald-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact status indicator for cards/lists
 */
interface CompactStatusIndicatorProps {
  status: REQUEST_STATUS;
  showLabel?: boolean;
  className?: string;
}

export function CompactStatusIndicator({ 
  status, 
  showLabel = true, 
  className 
}: CompactStatusIndicatorProps) {
  const config = STATUS_BANNER_CONFIG[status];
  const colors = REQUEST_STATUS_COLORS[status];
  const label = REQUEST_STATUS_LABELS[status];
  
  if (!config) return null;
  
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex h-6 w-6 items-center justify-center rounded-full',
        colors.bg
      )}>
        <Icon className={cn('h-3.5 w-3.5', colors.text)} />
      </div>
      {showLabel && (
        <span className={cn('text-sm font-medium', colors.text)}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Who needs to act indicator
 */
interface ActionRequiredIndicatorProps {
  status: REQUEST_STATUS;
  className?: string;
}

export function ActionRequiredIndicator({ status, className }: ActionRequiredIndicatorProps) {
  const isCustomer = CUSTOMER_ACTION_REQUIRED.includes(status);
  const isAdmin = ADMIN_ACTION_REQUIRED.includes(status);
  const isAgent = AGENT_ACTION_REQUIRED.includes(status);

  if (!isCustomer && !isAdmin && !isAgent) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        No action required
      </span>
    );
  }

  const actors = [];
  if (isCustomer) actors.push('Customer');
  if (isAdmin) actors.push('Admin');
  if (isAgent) actors.push('Agent');

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Info className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Waiting on {actors.join(' / ')}
      </span>
    </div>
  );
}

/**
 * Get banner config for external use
 */
export function getStatusBannerConfig(status: REQUEST_STATUS): BannerConfig | undefined {
  return STATUS_BANNER_CONFIG[status];
}

export default StatusBanner;
