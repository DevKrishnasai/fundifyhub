'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  CheckCircle2,
  AlertCircle,
  Clock,
  IndianRupee,
  ArrowRight
} from 'lucide-react';
import { LOAN_STATUS, EMI_STATUS } from '@fundifyhub/types';

interface LoanSummaryProps {
  loan: {
    id: string;
    loanNumber?: string | null;
    status: string;
    approvedAmount: number;
    totalAmount: number;
    totalPaidAmount: number;
    remainingAmount: number | null;
    paidEMIs: number;
    tenureMonths: number;
    overdueEMIs: number;
    emiAmount: number;
    interestRate: number;
    disbursedDate?: string | null;
    emisSchedule?: Array<{
      id: string;
      emiNumber: number;
      dueDate: string;
      emiAmount: number;
      status: string;
      paidDate?: string | null;
      lateFee: number;
    }>;
  };
  onPayNow?: () => void;
  isCustomer?: boolean;
}

export function ActiveLoanSummary({ loan, onPayNow, isCustomer }: LoanSummaryProps) {
  const progressPercentage = (loan.paidEMIs / loan.tenureMonths) * 100;
  const nextPendingEmi = loan.emisSchedule?.find(e => e.status === EMI_STATUS.PENDING || e.status === EMI_STATUS.OVERDUE);
  const recentPayments = loan.emisSchedule?.filter(e => e.status === EMI_STATUS.PAID).slice(-3) || [];
  
  const getLoanStatusBadge = () => {
    switch (loan.status) {
      case LOAN_STATUS.ACTIVE:
        return <Badge className="bg-green-500">Active</Badge>;
      case LOAN_STATUS.COMPLETED:
        return <Badge className="bg-blue-500">Completed</Badge>;
      case LOAN_STATUS.DEFAULTED:
        return <Badge variant="destructive">Defaulted</Badge>;
      default:
        return <Badge variant="outline">{loan.status}</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      {/* Loan Header Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                Loan {loan.loanNumber || `#${loan.id.slice(0, 8)}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Disbursed on {loan.disbursedDate ? new Date(loan.disbursedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            {getLoanStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="font-semibold">{loan.paidEMIs} / {loan.tenureMonths} EMIs</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progressPercentage.toFixed(1)}% Completed</span>
              <span>{loan.tenureMonths - loan.paidEMIs} EMIs Remaining</span>
            </div>
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Loan Amount</p>
              <p className="text-lg font-bold text-primary flex items-center">
                <IndianRupee className="h-4 w-4" />
                {loan.approvedAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Payable</p>
              <p className="text-lg font-bold flex items-center">
                <IndianRupee className="h-4 w-4" />
                {loan.totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount Paid</p>
              <p className="text-lg font-bold text-green-600 flex items-center">
                <IndianRupee className="h-4 w-4" />
                {loan.totalPaidAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
              <p className="text-lg font-bold text-orange-600 flex items-center">
                <IndianRupee className="h-4 w-4" />
                {(loan.remainingAmount || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Overdue Warning */}
          {loan.overdueEMIs > 0 && (
            <div className="bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">
                    {loan.overdueEMIs} Overdue EMI{loan.overdueEMIs > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Please clear overdue payments immediately to avoid penalties and maintain your credit score.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Payment Due Card */}
      {nextPendingEmi && isCustomer && (
        <Card className={nextPendingEmi.status === EMI_STATUS.OVERDUE ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-blue-500 bg-blue-50 dark:bg-blue-950'}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${nextPendingEmi.status === EMI_STATUS.OVERDUE ? 'bg-red-600' : 'bg-blue-600'}`}>
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-lg ${nextPendingEmi.status === EMI_STATUS.OVERDUE ? 'text-red-900 dark:text-red-100' : 'text-blue-900 dark:text-blue-100'}`}>
                    {nextPendingEmi.status === EMI_STATUS.OVERDUE ? '⚠️ EMI Payment Overdue' : '📅 Next EMI Payment Due'}
                  </h3>
                  <Badge variant={nextPendingEmi.status === EMI_STATUS.OVERDUE ? 'destructive' : 'default'}>
                    EMI #{nextPendingEmi.emiNumber}
                  </Badge>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <span className={`font-semibold ${nextPendingEmi.status === EMI_STATUS.OVERDUE ? 'text-red-600' : ''}`}>
                      {new Date(nextPendingEmi.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {nextPendingEmi.status !== EMI_STATUS.OVERDUE && (
                        <span className="text-xs ml-2 text-muted-foreground">
                          ({getDaysUntilDue(nextPendingEmi.dueDate) > 0 
                            ? `in ${getDaysUntilDue(nextPendingEmi.dueDate)} day${getDaysUntilDue(nextPendingEmi.dueDate) > 1 ? 's' : ''}`
                            : 'Today'})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">EMI Amount</span>
                    <span className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5" />
                      {nextPendingEmi.emiAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {nextPendingEmi.lateFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600">Late Fee</span>
                      <span className="font-semibold text-orange-600">
                        +₹{nextPendingEmi.lateFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
                {onPayNow && (
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={nextPendingEmi.status === EMI_STATUS.OVERDUE ? 'destructive' : 'default'}
                    onClick={onPayNow}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay Now - ₹{(nextPendingEmi.emiAmount + nextPendingEmi.lateFee).toLocaleString('en-IN')}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((emi) => (
                <div 
                  key={emi.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">EMI #{emi.emiNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid on {emi.paidDate ? new Date(emi.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 flex items-center justify-end">
                      <IndianRupee className="h-4 w-4" />
                      {emi.emiAmount.toLocaleString('en-IN')}
                    </p>
                    {emi.lateFee > 0 && (
                      <p className="text-xs text-orange-600">+₹{emi.lateFee.toLocaleString('en-IN')} late fee</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
