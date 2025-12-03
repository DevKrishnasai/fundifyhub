'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HandCoins, 
  Calendar, 
  Percent, 
  Banknote,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee,
  TrendingUp,
} from 'lucide-react';
import { REQUEST_STATUS } from '@fundifyhub/types';
import type { RequestType } from '@fundifyhub/types';
import { 
  SectionCard, 
  SectionRow, 
  SectionGrid, 
  SectionDivider,
  EmptyState,
} from './SectionCard';
import { formatDistanceToNow } from 'date-fns';

/**
 * OfferSection - Displays loan offer details and actions
 * Shows offer terms, EMI preview, and accept/decline buttons
 */

interface OfferSectionProps {
  request: RequestType;
  userRole: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
  isLoading?: boolean;
  onAcceptOffer?: () => void;
  onDeclineOffer?: () => void;
  onReviseOffer?: () => void;
  isActionLoading?: boolean;
  className?: string;
}

export function OfferSection({
  request,
  userRole,
  isLoading,
  onAcceptOffer,
  onDeclineOffer,
  onReviseOffer,
  isActionLoading,
  className,
}: OfferSectionProps) {
  const hasOffer = request.adminOfferedAmount !== null && request.adminOfferedAmount > 0;
  const isOfferSent = request.currentStatus === REQUEST_STATUS.OFFER_SENT;
  const isOfferAccepted = request.currentStatus === REQUEST_STATUS.OFFER_ACCEPTED;
  const isOfferDeclined = request.currentStatus === REQUEST_STATUS.OFFER_DECLINED;
  const isOfferExpired = request.currentStatus === REQUEST_STATUS.OFFER_EXPIRED;
  const isCustomer = userRole === 'CUSTOMER';
  const isAdmin = userRole === 'DISTRICT_ADMIN' || userRole === 'SUPER_ADMIN';

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // EMI schedule preview
  const emiPreview = request.adminEmiSchedule;

  if (!hasOffer) {
    return (
      <SectionCard
        title="Loan Offer"
        icon={HandCoins}
        isLoading={isLoading}
        className={className}
        id="offer-section"
      >
        <EmptyState
          title="No Offer Yet"
          description="An offer will be made after the admin reviews your request."
          icon={HandCoins}
        />
      </SectionCard>
    );
  }

  // Get offer status badge
  const getOfferStatusBadge = () => {
    if (isOfferAccepted) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="mr-1 h-3 w-3" />
          Accepted
        </Badge>
      );
    }
    if (isOfferDeclined) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="mr-1 h-3 w-3" />
          Declined
        </Badge>
      );
    }
    if (isOfferExpired) {
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      );
    }
    if (isOfferSent) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertCircle className="mr-1 h-3 w-3" />
          Awaiting Response
        </Badge>
      );
    }
    return null;
  };

  return (
    <SectionCard
      title="Loan Offer"
      icon={HandCoins}
      isLoading={isLoading}
      className={className}
      id="offer-section"
      actions={getOfferStatusBadge()}
    >
      {/* Offer Amount Highlight */}
      <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Offered Amount</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(request.adminOfferedAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Requested</p>
            <p className="text-lg font-medium text-muted-foreground">
              {formatCurrency(request.requestedAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Offer Terms */}
      <SectionGrid columns={2}>
        <SectionRow
          label="Interest Rate"
          value={request.adminInterestRate ? `${request.adminInterestRate}% p.a.` : '—'}
          valueVariant="highlight"
        />
        <SectionRow
          label="Tenure"
          value={request.adminTenureMonths ? `${request.adminTenureMonths} months` : '—'}
          valueVariant="highlight"
        />
        {request.adminProcessingFee > 0 && (
          <SectionRow
            label="Processing Fee"
            value={formatCurrency(request.adminProcessingFee)}
          />
        )}
        {request.offerMadeDate && (
          <SectionRow
            label="Offer Date"
            value={formatDistanceToNow(new Date(request.offerMadeDate), { addSuffix: true })}
          />
        )}
      </SectionGrid>

      {/* EMI Preview with Full Breakdown */}
      {emiPreview && (
        <>
          <SectionDivider />
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              EMI Breakdown
            </h4>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  Monthly EMI
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(emiPreview.monthlyPayment)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Principal</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(request.adminOfferedAmount)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Total Interest
                </p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(emiPreview.totalInterest)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-muted-foreground">Total Payable</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(emiPreview.totalPayment)}
                </p>
              </div>
            </div>

            {/* Processing Fee Info */}
            {request.adminProcessingFee && request.adminProcessingFee > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Net Disbursement:</span>{' '}
                  <span className="font-mono font-bold">
                    {formatCurrency((request.adminOfferedAmount || 0) - request.adminProcessingFee)}
                  </span>
                  <span className="text-xs ml-2 text-blue-600 dark:text-blue-400">
                    (after {formatCurrency(request.adminProcessingFee)} processing fee)
                  </span>
                </p>
              </div>
            )}

            {/* EMI Table (without dates) */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">EMI</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Principal</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Interest</th>
                    <th className="py-2 px-3 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Show first 3 EMIs */}
                  {emiPreview.emiSchedule?.slice(0, 3).map((emi, index) => (
                    <tr key={index} className="hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{emi.installment}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">
                        {formatCurrency(emi.principal)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        {formatCurrency(emi.interest)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs font-semibold">
                        {formatCurrency(emi.paymentAmount)}
                      </td>
                    </tr>
                  ))}
                  {/* Show ellipsis if more than 3 EMIs */}
                  {(emiPreview.emiSchedule?.length || 0) > 6 && (
                    <tr className="bg-muted/10">
                      <td colSpan={4} className="py-1.5 px-3 text-center text-xs text-muted-foreground">
                        ⋮ {(emiPreview.emiSchedule?.length || 0) - 6} more installments
                      </td>
                    </tr>
                  )}
                  {/* Show last 3 EMIs if more than 3 total */}
                  {(emiPreview.emiSchedule?.length || 0) > 3 && 
                    emiPreview.emiSchedule?.slice(-3).map((emi, index) => (
                      <tr key={`last-${index}`} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-medium">{emi.installment}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs">
                          {formatCurrency(emi.principal)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                          {formatCurrency(emi.interest)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs font-semibold">
                          {formatCurrency(emi.paymentAmount)}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
                <tfoot className="bg-muted/30 font-semibold">
                  <tr>
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      {formatCurrency(request.adminOfferedAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                      {formatCurrency(emiPreview.totalInterest)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      {formatCurrency(emiPreview.totalPayment)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons for Customer */}
      {isCustomer && isOfferSent && (
        <>
          <SectionDivider />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onAcceptOffer}
              disabled={isActionLoading}
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept Offer
            </Button>
            <Button
              variant="outline"
              onClick={onDeclineOffer}
              disabled={isActionLoading}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>
        </>
      )}

      {/* Revise button for Admin */}
      {isAdmin && (isOfferSent || isOfferDeclined) && onReviseOffer && (
        <>
          <SectionDivider />
          <Button
            variant="outline"
            onClick={onReviseOffer}
            disabled={isActionLoading}
            className="w-full sm:w-auto"
          >
            Revise Offer
          </Button>
        </>
      )}
    </SectionCard>
  );
}

/**
 * OfferCompactCard - Compact offer summary for cards/lists
 */
interface OfferCompactCardProps {
  request: RequestType;
  className?: string;
}

export function OfferCompactCard({ request, className }: OfferCompactCardProps) {
  const hasOffer = request.adminOfferedAmount !== null && request.adminOfferedAmount > 0;

  if (!hasOffer) return null;

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Offer</span>
        </div>
        <span className="text-sm font-semibold text-primary">
          {formatCurrency(request.adminOfferedAmount)}
        </span>
      </div>
    </div>
  );
}

export default OfferSection;
