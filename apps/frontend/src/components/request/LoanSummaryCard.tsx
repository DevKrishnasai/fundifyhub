'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { LOAN_STATUS, EMI_STATUS } from '@fundifyhub/types';

interface LoanSummaryCardProps {
  loan: {
    id: string;
    loanNumber?: string | null;
    status: string;
    approvedAmount: number;
    totalAmount: number;
    totalPaidAmount: number;
    remainingAmount?: number | null;
    paidEMIs: number;
    tenureMonths: number;
    overdueEMIs?: number;
    emiAmount: number;
    interestRate: number;
    disbursedDate?: string | null;
    emisSchedule?: Array<{
      id: string;
      emiNumber: number;
      dueDate: string;
      emiAmount: number;
      principalAmount?: number;
      interestAmount?: number;
      status: string;
      paidDate?: string | null;
      lateFee?: number;
    }>;
  };
  isCustomer?: boolean;
  isAdmin?: boolean;
}

export function LoanSummaryCard({ loan, isCustomer, isAdmin }: LoanSummaryCardProps) {
  const [showTable, setShowTable] = useState(false);

  const overdueCount = loan.emisSchedule?.filter(e => e.status === EMI_STATUS.OVERDUE).length ?? 0;
  const remainingAmount = loan.remainingAmount ?? (loan.totalAmount - loan.totalPaidAmount);
  const progressPercentage = (loan.paidEMIs / loan.tenureMonths) * 100;

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

  const getEMIStatusBadge = (emi: { status: string; dueDate: string; paidDate?: string | null; lateFee?: number }) => {
    if (emi.status === EMI_STATUS.PAID) {
      // Check if paid late (either has late fee or paidDate > dueDate)
      const wasPaidLate = emi.lateFee && emi.lateFee > 0;
      const paidAfterDue = emi.paidDate && new Date(emi.paidDate) > new Date(emi.dueDate);
      
      if (wasPaidLate || paidAfterDue) {
        return <Badge className="bg-yellow-500 text-white">Paid Late</Badge>;
      }
      return <Badge className="bg-green-500 text-white">Paid On-time</Badge>;
    }
    
    if (emi.status === EMI_STATUS.OVERDUE) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    if (emi.status === EMI_STATUS.PENDING) {
      return <Badge variant="outline">Pending</Badge>;
    }
    
    return <Badge variant="outline">{emi.status}</Badge>;
  };

  return (
    <Card className="border-primary/20 mb-4 sm:mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {loan.loanNumber || 'Loan Summary'}
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
              {remainingAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Overdue Warning */}
        {overdueCount > 0 && (
          <div className="bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 rounded-full">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">
                  {overdueCount} Overdue EMI{overdueCount > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Please clear overdue payments immediately to avoid penalties.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show EMI Table Button */}
        {loan.emisSchedule && loan.emisSchedule.length > 0 && (
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowTable(!showTable)}
              className="w-full"
            >
              {showTable ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide EMI Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show EMI Details
                </>
              )}
            </Button>
          </div>
        )}

        {/* EMI Table */}
        {showTable && loan.emisSchedule && loan.emisSchedule.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">EMI #</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Late Fee</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.emisSchedule.map((emi) => {
                  const totalAmount = (emi.principalAmount || 0) + (emi.interestAmount || 0) + (emi.lateFee || 0);
                  return (
                    <TableRow key={emi.id}>
                      <TableCell className="font-medium">#{emi.emiNumber}</TableCell>
                      <TableCell>
                        {new Date(emi.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(emi.principalAmount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(emi.interestAmount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(emi.lateFee || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center">
                        {getEMIStatusBadge(emi)}
                      </TableCell>
                      <TableCell className="text-right">
                        {emi.paidDate
                          ? new Date(emi.paidDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short'
                            })
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}