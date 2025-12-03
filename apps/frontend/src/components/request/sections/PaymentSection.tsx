/**
 * PaymentSection Component
 * 
 * EMI payments display with Razorpay integration.
 * Shows payment history, upcoming EMIs, and handles payment initiation.
 */

'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  IndianRupee,
  Calendar,
  Receipt,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SectionCard, SectionRow, SectionDivider } from './SectionCard';
import { EMI_STATUS, REQUEST_STATUS } from '@fundifyhub/types';
import { cn } from '@/lib/utils';

/** Format currency in INR */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Format date to readable string */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export interface EMIRecord {
  id: string;
  emiNumber: number;
  principalAmount: number;
  interestAmount: number;
  emiAmount: number;
  lateFee: number;
  totalDue: number;
  dueDate: string;
  status: EMI_STATUS;
  paidAt?: string | null;
  paidAmount?: number | null;
}

export interface PaymentSectionProps {
  requestId: string;
  currentStatus: REQUEST_STATUS;
  loan?: {
    id: string;
    principalAmount: number;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: string;
  } | null;
  emis: EMIRecord[];
  isCustomer: boolean;
  onPayEmi?: (emiId: string, amount: number) => Promise<void>;
  isLoading?: boolean;
}

const EMI_STATUS_CONFIG: Record<EMI_STATUS, { label: string; color: string; icon: React.ElementType }> = {
  [EMI_STATUS.PENDING]: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock 
  },
  [EMI_STATUS.PAID]: { 
    label: 'Paid', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle 
  },
  [EMI_STATUS.OVERDUE]: { 
    label: 'Overdue', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertTriangle 
  },
  [EMI_STATUS.DEFAULTED]: { 
    label: 'Defaulted', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertTriangle 
  },
};

export function PaymentSection({
  requestId,
  currentStatus,
  loan,
  emis,
  isCustomer,
  onPayEmi,
  isLoading = false,
}: PaymentSectionProps) {
  const [payingEmiId, setPayingEmiId] = useState<string | null>(null);

  const isActiveLoan = [
    REQUEST_STATUS.ACTIVE,
    REQUEST_STATUS.PAYMENT_OVERDUE,
    REQUEST_STATUS.AMOUNT_DISBURSED,
  ].includes(currentStatus);

  const paidEmis = emis.filter((e) => e.status === EMI_STATUS.PAID);
  const overdueEmis = emis.filter((e) => e.status === EMI_STATUS.OVERDUE);
  const pendingEmis = emis.filter((e) => e.status === EMI_STATUS.PENDING);
  const nextDueEmi = pendingEmis[0] || overdueEmis[0];

  const paymentProgress = loan ? (loan.paidAmount / loan.totalAmount) * 100 : 0;

  const handlePay = async (emi: EMIRecord) => {
    if (!onPayEmi) return;
    setPayingEmiId(emi.id);
    try {
      await onPayEmi(emi.id, emi.totalDue);
    } finally {
      setPayingEmiId(null);
    }
  };

  if (!isActiveLoan && emis.length === 0) {
    return (
      <SectionCard
        title="Payments"
        icon={CreditCard}
      >
        <p className="text-sm text-muted-foreground text-center py-4">
          No payment history available
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Payments"
      icon={CreditCard}
      variant={overdueEmis.length > 0 ? 'highlight' : 'default'}
    >
      {/* Loan Progress Summary */}
      {loan && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-medium">
              {formatCurrency(loan.paidAmount)} / {formatCurrency(loan.totalAmount)}
            </span>
          </div>
          <Progress value={paymentProgress} className="h-2" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="font-semibold text-green-600">{paidEmis.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-semibold">{pendingEmis.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="font-semibold text-red-600">{overdueEmis.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Warning */}
      {overdueEmis.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">
              {overdueEmis.length} overdue payment(s)
            </p>
            <p className="text-red-600 dark:text-red-500">
              Total due: {formatCurrency(overdueEmis.reduce((sum, e) => sum + e.totalDue, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Next Due EMI Card */}
      {nextDueEmi && isCustomer && (
        <div className="border rounded-lg p-4 mb-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {nextDueEmi.status === EMI_STATUS.OVERDUE ? 'Overdue EMI' : 'Next EMI'}
            </h4>
            <Badge className={EMI_STATUS_CONFIG[nextDueEmi.status].color}>
              {EMI_STATUS_CONFIG[nextDueEmi.status].label}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground">EMI #{nextDueEmi.emiNumber}</p>
              <p className="font-semibold text-lg flex items-center">
                <IndianRupee className="h-4 w-4" />
                {nextDueEmi.totalDue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(nextDueEmi.dueDate)}
              </p>
            </div>
          </div>

          {nextDueEmi.lateFee > 0 && (
            <p className="text-xs text-red-600 mb-3">
              Includes ₹{nextDueEmi.lateFee.toLocaleString()} late fee
            </p>
          )}

          {onPayEmi && (
            <Button
              className="w-full min-h-[44px]"
              onClick={() => handlePay(nextDueEmi)}
              disabled={payingEmiId === nextDueEmi.id || isLoading}
            >
              {payingEmiId === nextDueEmi.id ? 'Processing...' : `Pay ₹${nextDueEmi.totalDue.toLocaleString()}`}
            </Button>
          )}
        </div>
      )}

      <SectionDivider />

      {/* EMI Schedule List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          EMI Schedule
        </h4>
        
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {emis.map((emi) => {
            const config = EMI_STATUS_CONFIG[emi.status];
            const Icon = config.icon;
            const isPayable = isCustomer && 
              onPayEmi && 
              [EMI_STATUS.PENDING, EMI_STATUS.OVERDUE].includes(emi.status);

            return (
              <div
                key={emi.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  emi.status === EMI_STATUS.PAID && 'bg-green-50/50 dark:bg-green-900/10',
                  emi.status === EMI_STATUS.OVERDUE && 'bg-red-50/50 dark:bg-red-900/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-1.5 rounded-full', config.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">EMI #{emi.emiNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(emi.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ₹{emi.totalDue.toLocaleString()}
                    </p>
                    {emi.paidAt && (
                      <p className="text-xs text-green-600">
                        Paid {formatDate(emi.paidAt)}
                      </p>
                    )}
                  </div>
                  
                  {isPayable && emi.id !== nextDueEmi?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePay(emi)}
                      disabled={payingEmiId === emi.id}
                      className="min-h-[36px]"
                    >
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

export default PaymentSection;
