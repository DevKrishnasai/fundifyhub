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
  FileEdit,
  Mail,
  UserPlus,
  ClipboardList,
  ClipboardCheck,
  ThumbsUp,
  UserX,
  UserMinus,
  FileSignature,
  FileCheck,
  Building2,
  Loader2,
  TrendingUp,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import {
  REQUEST_STAGE,
  SUB_STATUS,
  STAGE_COLORS,
  SUB_STATUS_DISPLAY,
  calculateActionFlags,
  getStatusDisplay,
  getStageNumber,
} from '@fundifyhub/types';

/**
 * Status Banner System (Stage-Based)
 * 
 * Displays contextual, stage-aware banners that guide users through the workflow.
 * Shows what's happening, what's expected, and who needs to take action.
 */

// ============================================
// TYPES
// ============================================

export type BannerVariant = 'info' | 'warning' | 'success' | 'error' | 'neutral';

/** Union type for all user roles */
type UserRoleKey = 'CUSTOMER' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'SUPER_ADMIN' | 'AGENT';

interface StageBannerConfig {
  icon: LucideIcon;
  variant: BannerVariant;
  title: string;
  description: string | Partial<Record<UserRoleKey, string>>;
  actionLabel?: string;
  showProgress?: boolean;
}

// Icon mapping from string to LucideIcon
const ICON_MAP: Record<string, LucideIcon> = {
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
  Timer,
  Banknote,
  PenLine,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  FileEdit,
  Mail,
  UserPlus,
  ClipboardList,
  ClipboardCheck,
  ThumbsUp,
  UserX,
  UserMinus,
  FileSignature,
  FileCheck,
  Building2,
  Loader2,
  TrendingUp,
  Ban,
  CalendarClock: Calendar, // Fallback
};

// ============================================
// STAGE-BASED BANNER CONFIGURATION
// ============================================

function getStageBannerConfig(stage: REQUEST_STAGE, subStatus: string | null): StageBannerConfig {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  const display = key && SUB_STATUS_DISPLAY[key] ? SUB_STATUS_DISPLAY[key] : getStatusDisplay(stage, subStatus);
  const Icon = ICON_MAP[display.icon] || Clock;

  // Determine variant based on stage and subStatus
  let variant: BannerVariant = 'info';
  if (stage === REQUEST_STAGE.COMPLETED) {
    variant = 'success';
  } else if (stage === REQUEST_STAGE.REJECTED || stage === REQUEST_STAGE.CANCELLED) {
    variant = stage === REQUEST_STAGE.REJECTED ? 'error' : 'neutral';
  } else if (display.isBlocking) {
    variant = 'error';
  } else if (display.requiresAction === 'customer') {
    variant = 'warning';
  } else if (stage === REQUEST_STAGE.ACTIVE) {
    if (subStatus === SUB_STATUS.ACTIVE.OVERDUE) {
      variant = 'error';
    } else if (subStatus === SUB_STATUS.ACTIVE.DEFAULTED) {
      variant = 'error';
    } else {
      variant = 'success';
    }
  }

  // Build role-specific descriptions
  const baseDescription = display.description;
  const descriptions: Partial<Record<UserRoleKey, string>> = {};

  // Add role-specific context for key stages
  switch (`${stage}:${subStatus}`) {
    case `${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.PENDING}`:
      descriptions.CUSTOMER = 'Your request has been submitted and is waiting for an admin to review it.';
      descriptions.DISTRICT_ADMIN = 'New loan request awaiting your review and approval.';
      descriptions.SUPER_ADMIN = 'New loan request awaiting review and approval.';
      break;
    case `${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.IN_REVIEW}`:
      descriptions.CUSTOMER = 'An admin is currently reviewing your request and asset details.';
      descriptions.DISTRICT_ADMIN = 'You are currently reviewing this request and asset details.';
      descriptions.SUPER_ADMIN = 'You are currently reviewing this request and asset details.';
      break;
    case `${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_REQUIRED}`:
      descriptions.CUSTOMER = 'Please provide the requested documents or information to proceed.';
      descriptions.DISTRICT_ADMIN = 'Customer needs to provide additional documents or information.';
      descriptions.SUPER_ADMIN = 'Customer needs to provide additional documents or information.';
      break;
    case `${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.SENT}`:
      descriptions.CUSTOMER = 'Review the loan offer and decide whether to accept or decline.';
      descriptions.DISTRICT_ADMIN = 'Loan offer sent to customer. Awaiting their response.';
      descriptions.SUPER_ADMIN = 'Loan offer sent to customer. Awaiting their response.';
      break;
    case `${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.SCHEDULED}`:
      descriptions.CUSTOMER = 'An agent has been assigned and will visit for asset inspection. Please be available at the scheduled time.';
      descriptions.DISTRICT_ADMIN = 'Agent assigned for inspection. Monitor progress and handle any rescheduling requests.';
      descriptions.AGENT = 'You have been assigned for inspection. Visit the customer at the scheduled time.';
      break;
    case `${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.IN_PROGRESS}`:
      descriptions.CUSTOMER = 'The agent is currently inspecting and verifying your asset.';
      descriptions.AGENT = 'You are currently conducting the inspection. Complete verification and submit your decision.';
      break;
    case `${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE}`:
      descriptions.CUSTOMER = 'Please review and sign the loan agreement to proceed.';
      descriptions.DISTRICT_ADMIN = 'Waiting for customer to sign the loan agreement.';
      break;
    case `${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS}`:
      descriptions.CUSTOMER = 'Provide your bank account or UPI details for disbursement.';
      descriptions.DISTRICT_ADMIN = 'Waiting for customer to provide bank details.';
      break;
    case `${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.PROCESSING}`:
      descriptions.CUSTOMER = 'Your loan amount is being transferred to your account.';
      descriptions.DISTRICT_ADMIN = 'Disbursement is in progress.';
      break;
    case `${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.FAILED}`:
      descriptions.CUSTOMER = 'The transfer could not be completed. Please update your bank details.';
      descriptions.DISTRICT_ADMIN = 'Transfer failed. Customer needs to update bank details.';
      break;
    case `${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.CURRENT}`:
      descriptions.CUSTOMER = 'Your loan is active. Make sure to pay EMIs on time.';
      descriptions.DISTRICT_ADMIN = 'Loan is active with payments on track.';
      break;
    case `${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.OVERDUE}`:
      descriptions.CUSTOMER = 'You have overdue EMI payments. Pay now to avoid penalties.';
      descriptions.DISTRICT_ADMIN = 'Customer has overdue payments.';
      break;
    case `${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.DEFAULTED}`:
      descriptions.CUSTOMER = 'Multiple payments have been missed. Contact support immediately.';
      descriptions.DISTRICT_ADMIN = 'Loan is in default status. Multiple payments missed.';
      break;
  }

  // Determine action label
  let actionLabel: string | undefined;
  if (display.requiresAction === 'customer') {
    switch (`${stage}:${subStatus}`) {
      case `${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_REQUIRED}`:
        actionLabel = 'Submit Information';
        break;
      case `${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.SENT}`:
        actionLabel = 'Review Offer';
        break;
      case `${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE}`:
        actionLabel = 'Sign Agreement';
        break;
      case `${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS}`:
        actionLabel = 'Add Bank Details';
        break;
      case `${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.FAILED}`:
        actionLabel = 'Update Details';
        break;
      case `${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.OVERDUE}`:
        actionLabel = 'Pay Now';
        break;
    }
  }

  return {
    icon: Icon,
    variant,
    title: display.label,
    description: Object.keys(descriptions).length > 0 ? descriptions : baseDescription,
    actionLabel,
    showProgress: stage === REQUEST_STAGE.INSPECTION && subStatus === SUB_STATUS.INSPECTION.IN_PROGRESS,
  };
}

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
  stage: REQUEST_STAGE;
  subStatus: string | null;
  userRole: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
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
 * Main status banner component - shows contextual information based on stage
 */
export function StatusBanner({
  stage,
  subStatus,
  userRole,
  onActionClick,
  customDescription,
  showPhaseProgress = false,
  className,
  context,
}: StatusBannerProps) {
  const config = getStageBannerConfig(stage, subStatus);
  const styles = VARIANT_STYLES[config.variant];
  const Icon = config.icon;
  
  // Calculate action flags
  const flags = calculateActionFlags(stage, subStatus);
  
  // Determine if current user needs to take action
  const isCustomerAction = flags.requiresCustomerAction && userRole === 'CUSTOMER';
  const isAdminAction = flags.requiresAdminAction && 
    (userRole === 'DISTRICT_ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'STATE_ADMIN');
  const isAgentAction = flags.requiresAgentAction && userRole === 'AGENT';
  const actionRequired = isCustomerAction || isAdminAction || isAgentAction;

  // Build contextual description
  let baseDescription = config.description;
  if (typeof baseDescription === 'object') {
    baseDescription = baseDescription[userRole] || baseDescription.CUSTOMER || '';
  }
  let description = customDescription || baseDescription;
  
  // Add context-specific information
  if (context?.inspectionDate && stage === REQUEST_STAGE.INSPECTION && subStatus === SUB_STATUS.INSPECTION.SCHEDULED) {
    description = `Scheduled for ${context.inspectionDate}${context.agentName ? ` with ${context.agentName}` : ''}.`;
  }
  if (context?.overdueAmount && stage === REQUEST_STAGE.ACTIVE && subStatus === SUB_STATUS.ACTIVE.OVERDUE) {
    description = `You have ₹${context.overdueAmount.toLocaleString()} in overdue payments. Pay now to avoid additional penalties.`;
  }

  const currentPhase = getStageNumber(stage);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Phase Progress Indicator */}
      {showPhaseProgress && currentPhase > 0 && (
        <PhaseProgressBar currentPhase={currentPhase} />
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
  stage: REQUEST_STAGE;
  subStatus: string | null;
  showLabel?: boolean;
  className?: string;
}

export function CompactStatusIndicator({ 
  stage, 
  subStatus,
  showLabel = true, 
  className 
}: CompactStatusIndicatorProps) {
  const display = getStatusDisplay(stage, subStatus);
  const colors = STAGE_COLORS[stage];
  const Icon = ICON_MAP[display.icon] || Clock;

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
          {display.label}
        </span>
      )}
    </div>
  );
}

/**
 * Who needs to act indicator
 */
interface ActionRequiredIndicatorProps {
  stage: REQUEST_STAGE;
  subStatus: string | null;
  className?: string;
}

export function ActionRequiredIndicator({ stage, subStatus, className }: ActionRequiredIndicatorProps) {
  const flags = calculateActionFlags(stage, subStatus);

  if (!flags.requiresCustomerAction && !flags.requiresAdminAction && !flags.requiresAgentAction) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        No action required
      </span>
    );
  }

  const actors = [];
  if (flags.requiresCustomerAction) actors.push('Customer');
  if (flags.requiresAdminAction) actors.push('Admin');
  if (flags.requiresAgentAction) actors.push('Agent');

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
export function getStatusBannerConfig(stage: REQUEST_STAGE, subStatus: string | null): StageBannerConfig {
  return getStageBannerConfig(stage, subStatus);
}

export default StatusBanner;
