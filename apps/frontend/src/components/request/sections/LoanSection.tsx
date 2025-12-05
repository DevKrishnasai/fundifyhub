'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Banknote, 
  Calendar, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Receipt,
  CreditCard,
  Info,
} from 'lucide-react';
import { REQUEST_STAGE, LOAN_STATUS, EMI_STATUS } from '@fundifyhub/types';
import type { RequestType, LoanType, EMIScheduleType } from '@fundifyhub/types';
import { 
  SectionCard, 
  SectionRow, 
  SectionGrid, 
  SectionDivider,
  EmptyState,
} from './SectionCard';
import { format, formatDistanceToNow, isPast, isToday, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * LoanSection - Displays active loan details and EMI schedule
 * Shows loan summary, payment progress, and upcoming EMIs
 */

interface LoanSectionProps {
  request: RequestType;
  userRole: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
  isLoading?: boolean;
  onPayEmi?: (emi: EMIScheduleType) => void;
  onViewEmiDetails?: (emi: EMIScheduleType) => void;
  isActionLoading?: boolean;
  className?: string;
}

export function LoanSection({
  request,
  userRole,
  isLoading,
  onPayEmi,
  onViewEmiDetails,
  isActionLoading,
  className,
}: LoanSectionProps) {
  const loan = request.loan;
  const emis = loan?.emisSchedule || request.emisSchedule || [];
  const isCustomer = userRole === 'CUSTOMER';
  
  // Stage-based loan check
  const currentStage = (request.stage || REQUEST_STAGE.DRAFT) as REQUEST_STAGE;
  
  const hasActiveLoan = loan && (
    loan.status === LOAN_STATUS.ACTIVE ||
    loan.status === LOAN_STATUS.COMPLETED ||
    currentStage === REQUEST_STAGE.ACTIVE ||
    currentStage === REQUEST_STAGE.COMPLETED
  );

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate progress
  const paymentProgress = loan ? (loan.paidEMIs / (loan.paidEMIs + loan.remainingEMIs)) * 100 : 0;

  // Get loan status badge
  const getLoanStatusBadge = () => {
    if (!loan) return null;
    const status = loan.status;

    const statusConfig: Record<string, { className: string; icon: typeof CheckCircle; label: string }> = {
      [LOAN_STATUS.ACTIVE]: {
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: TrendingUp,
        label: 'Active',
      },
      [LOAN_STATUS.COMPLETED]: {
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: CheckCircle,
        label: 'Completed',
      },
      [LOAN_STATUS.DEFAULTED]: {
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
        label: 'Defaulted',
      },
    };

    const config = statusConfig[status] || {
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      icon: Info,
      label: status,
    };
    const StatusIcon = config.icon;

    return (
      <Badge className={config.className}>
        <StatusIcon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get EMI status badge
  const getEmiStatusBadge = (emi: EMIScheduleType) => {
    const status = emi.status;
    const dueDate = new Date(emi.dueDate);

    if (status === EMI_STATUS.PAID) {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="mr-1 h-3 w-3" />
          Paid
        </Badge>
      );
    }
    if (status === EMI_STATUS.OVERDUE || (status === EMI_STATUS.PENDING && isPast(dueDate))) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    if (status === EMI_STATUS.PENDING) {
      if (isToday(dueDate)) {
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="mr-1 h-3 w-3" />
            Due Today
          </Badge>
        );
      }
      return (
        <Badge variant="outline">
          <Calendar className="mr-1 h-3 w-3" />
          Upcoming
        </Badge>
      );
    }
    return null;
  };

  if (!hasActiveLoan) {
    return (
      <SectionCard
        title="Loan Details"
        icon={Banknote}
        isLoading={isLoading}
        className={className}
        id="loan-section"
      >
        <EmptyState
          title="No Active Loan"
          description="Loan details will appear here once the disbursement is complete."
          icon={Banknote}
        />
      </SectionCard>
    );
  }

  // Get next due EMI
  const nextDueEmi = emis.find(
    (emi) => emi.status === EMI_STATUS.PENDING || emi.status === EMI_STATUS.OVERDUE
  );

  // Get overdue EMIs
  const overdueEmis = emis.filter(
    (emi) => emi.status === EMI_STATUS.OVERDUE || 
    (emi.status === EMI_STATUS.PENDING && isPast(new Date(emi.dueDate)))
  );

  return (
    <SectionCard
      title="Loan Details"
      icon={Banknote}
      isLoading={isLoading}
      className={className}
      id="loan-section"
      actions={getLoanStatusBadge()}
    >
      {/* Loan Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">Loan Amount</p>
          <p className="text-lg font-semibold">{formatCurrency(loan?.approvedAmount)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">Monthly EMI</p>
          <p className="text-lg font-semibold">{formatCurrency(loan?.emiAmount)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">Interest Rate</p>
          <p className="text-lg font-semibold">{loan?.interestRate}%</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">Tenure</p>
          <p className="text-lg font-semibold">{loan?.tenureMonths} mo</p>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Payment Progress</span>
          <span className="font-medium">
            {loan?.paidEMIs} of {(loan?.paidEMIs || 0) + (loan?.remainingEMIs || 0)} EMIs
          </span>
        </div>
        <Progress value={paymentProgress} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Paid: {formatCurrency(loan?.totalPaidAmount)}</span>
          <span>Remaining: {formatCurrency(loan?.remainingAmount)}</span>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueEmis.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                {overdueEmis.length} Overdue Payment{overdueEmis.length > 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Total overdue: {formatCurrency(
                  overdueEmis.reduce((sum, emi) => sum + emi.emiAmount + (emi.lateFee || 0), 0)
                )}
              </p>
              {isCustomer && onPayEmi && overdueEmis[0] && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-3"
                  onClick={() => onPayEmi(overdueEmis[0])}
                  disabled={isActionLoading}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Due EMI */}
      {nextDueEmi && overdueEmis.length === 0 && (
        <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Next EMI Due</p>
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {formatCurrency(nextDueEmi.emiAmount)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {format(new Date(nextDueEmi.dueDate), 'PPP')}
              </p>
            </div>
            {isCustomer && onPayEmi && (
              <Button
                size="sm"
                onClick={() => onPayEmi(nextDueEmi)}
                disabled={isActionLoading}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now
              </Button>
            )}
          </div>
        </div>
      )}

      <SectionDivider />

      {/* EMI Schedule */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">EMI Schedule</h4>
          <span className="text-xs text-muted-foreground">
            {emis.length} installments
          </span>
        </div>
        
        {/* EMI List - Mobile optimized */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {emis.slice(0, 6).map((emi) => (
            <div
              key={emi.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                emi.status === EMI_STATUS.PAID && 'bg-emerald-50/50 dark:bg-emerald-950/20',
                (emi.status === EMI_STATUS.OVERDUE || 
                  (emi.status === EMI_STATUS.PENDING && isPast(new Date(emi.dueDate)))) && 
                  'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                  emi.status === EMI_STATUS.PAID 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {emi.emiNumber}
                </div>
                <div>
                  <p className="text-sm font-medium">{formatCurrency(emi.emiAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(emi.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {emi.lateFee > 0 && (
                  <span className="text-xs text-red-600">+{formatCurrency(emi.lateFee)}</span>
                )}
                {getEmiStatusBadge(emi)}
              </div>
            </div>
          ))}
          {emis.length > 6 && (
            <Button variant="ghost" className="w-full text-sm" size="sm">
              View all {emis.length} installments
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * LoanCompactCard - Compact loan summary for cards/lists
 */
interface LoanCompactCardProps {
  loan: LoanType;
  className?: string;
}

export function LoanCompactCard({ loan, className }: LoanCompactCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const progress = (loan.paidEMIs / (loan.paidEMIs + loan.remainingEMIs)) * 100;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Loan Progress</span>
        <span className="text-sm font-medium">
          {loan.paidEMIs}/{loan.paidEMIs + loan.remainingEMIs}
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>Remaining: {formatCurrency(loan.remainingAmount)}</span>
      </div>
    </div>
  );
}

export default LoanSection;
