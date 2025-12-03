'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  IndianRupee, 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  CreditCard,
  ArrowRight,
  Box,
  MapPin
} from 'lucide-react';
import { REQUEST_STATUS, LOAN_STATUS, EMI_STATUS, ROLES } from '@fundifyhub/types';
import type { RequestType } from '@fundifyhub/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isPast } from 'date-fns';

interface RequestHeroProps {
  request: RequestType;
  userRole: keyof typeof ROLES;
  onAction?: (action: string) => void;
  className?: string;
}

export function RequestHero({ request, userRole, onAction, className }: RequestHeroProps) {
  const isCustomer = userRole === ROLES.CUSTOMER;
  const loan = request.loan;
  
  // Format currency helper
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 1. Active Loan View
  const hasActiveLoan = loan && [
    LOAN_STATUS.ACTIVE,
    REQUEST_STATUS.ACTIVE,
    REQUEST_STATUS.PAYMENT_OVERDUE,
    REQUEST_STATUS.DEFAULTED,
  ].includes((loan.status || request.currentStatus) as any);

  if (hasActiveLoan && loan) {
    const nextDueEmi = loan.emisSchedule?.find(
      (emi) => emi.status === EMI_STATUS.PENDING || emi.status === EMI_STATUS.OVERDUE
    );
    const overdueCount = loan.overdueEMIs || 0;
    const progress = (loan.paidEMIs / (loan.paidEMIs + loan.remainingEMIs)) * 100;

    return (
      <Card className={cn("overflow-hidden border-0 shadow-sm", className)}>
        <div className={cn(
          "absolute inset-0 opacity-10",
          overdueCount > 0 
            ? "bg-gradient-to-r from-red-500 to-orange-500" 
            : "bg-gradient-to-r from-emerald-500 to-blue-500"
        )} />
        
        <CardContent className="relative p-6">
          <div className="grid gap-6 md:grid-cols-3 items-center">
            {/* Main Stat: Outstanding Amount */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <IndianRupee className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Outstanding Balance</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(loan.remainingAmount)}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Total Loan: {formatCurrency(loan.approvedAmount)}</span>
              </div>
            </div>

            {/* Secondary Stat: Next Payment */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  {overdueCount > 0 ? 'Overdue Payment' : 'Next Payment'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <p className={cn(
                  "text-2xl font-bold tracking-tight",
                  overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                )}>
                  {nextDueEmi ? formatCurrency(nextDueEmi.emiAmount + (nextDueEmi.lateFee || 0)) : '—'}
                </p>
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {overdueCount} Overdue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Due: {nextDueEmi ? format(new Date(nextDueEmi.dueDate), 'MMM d, yyyy') : '—'}
              </p>
            </div>

            {/* Action / Progress */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Repayment Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {isCustomer && overdueCount > 0 && (
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onAction?.('pay-emi')}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Pay Overdue Amount
                </Button>
              )}
              
              {isCustomer && overdueCount === 0 && nextDueEmi && (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => onAction?.('pay-emi')}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Next EMI
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. Offer Phase View
  const hasOffer = request.adminOfferedAmount && [
    REQUEST_STATUS.OFFER_SENT,
    REQUEST_STATUS.OFFER_ACCEPTED,
    REQUEST_STATUS.OFFER_DECLINED,
    REQUEST_STATUS.INSPECTION_SCHEDULED,
    REQUEST_STATUS.INSPECTION_IN_PROGRESS,
    REQUEST_STATUS.INSPECTION_COMPLETED,
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.PENDING_SIGNATURE,
    REQUEST_STATUS.PENDING_BANK_DETAILS,
    REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
    REQUEST_STATUS.TRANSFER_FAILED,
    REQUEST_STATUS.AMOUNT_DISBURSED,
  ].includes(request.currentStatus as any);

  if (hasOffer) {
    return (
      <Card className={cn("overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-sm", className)}>
        <CardContent className="p-0">
          <div className="grid divide-x divide-border/50 grid-cols-2 lg:grid-cols-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <IndianRupee className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Offered Amount</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(request.adminOfferedAmount)}
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Interest Rate</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {request.adminInterestRate}% <span className="text-sm font-normal text-muted-foreground">p.a.</span>
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Tenure</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {request.adminTenureMonths} <span className="text-sm font-normal text-muted-foreground">months</span>
              </p>
            </div>

            <div className="p-4 sm:p-6 flex flex-col justify-center">
               {/* Status-specific action hint */}
               {request.currentStatus === REQUEST_STATUS.OFFER_SENT && isCustomer ? (
                 <Button onClick={() => onAction?.('view-offer')} className="w-full">
                   View Offer <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
               ) : (
                 <div className="space-y-1">
                   <div className="flex items-center gap-2 text-muted-foreground mb-1">
                     <Calendar className="h-4 w-4" />
                     <span className="text-xs font-medium uppercase tracking-wide">Created</span>
                   </div>
                   <p className="text-sm font-medium text-foreground">
                     {request.createdAt ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) : '—'}
                   </p>
                 </div>
               )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Default View (Initial Request)
  return (
    <Card className={cn("overflow-hidden border-0 bg-gradient-to-r from-muted/50 to-background shadow-sm", className)}>
      <CardContent className="p-0">
        <div className="grid divide-x divide-border/50 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IndianRupee className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Requested</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(request.requestedAmount)}
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Box className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Asset</span>
            </div>
            <p className="text-lg font-medium text-foreground truncate">
              {request.asset?.assetType || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {request.asset?.brand || 'N/A'} {request.asset?.model || ''}
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {userRole === ROLES.CUSTOMER ? (
                 <Calendar className="h-4 w-4" />
              ) : (
                 <MapPin className="h-4 w-4" />
              )}
              <span className="text-xs font-medium uppercase tracking-wide">
                {userRole === ROLES.CUSTOMER ? 'Created' : 'Location'}
              </span>
            </div>
            <p className="text-lg font-medium text-foreground">
               {userRole === ROLES.CUSTOMER 
                 ? (request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : '—')
                 : request.district
               }
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Timeline</span>
            </div>
            <p className="text-lg font-medium text-foreground">
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: false })}
            </p>
            <span className="text-xs text-muted-foreground">
              Last update {formatDistanceToNow(new Date(request.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
