'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  History,
  Filter,
  Loader2,
  Calendar,
  Clock,
  AlertCircle,
  XCircle,
  TrendingUp,
  Banknote,
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { calculateEMIBreakdown, getEMIPaymentHistory } from '@/lib/payments-api';
import { EMI_STATUS } from '@fundifyhub/types';

interface EMIScheduleItem {
  id: string;
  emiNumber: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: string;
  lateFee?: number;
  paidDate?: string | null;
  paidAmount?: number | null;
}

interface PaymentOrder {
  id: string;
  razorpayOrderId: string;
  status: string;
  emiAmount: number;
  penalty: number;
  totalAmount: number;
  attempts: number;
  lastAttemptAt: string | null;
  razorpayPaymentId: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  failureReason: string | null;
  failureCode: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentHistoryEntry {
  id: string;
  action: string;
  metadata: any;
  createdAt: string;
}

interface EMIPaymentHistory {
  emiId: string;
  emiNumber: number;
  loanId: string;
  paymentOrders: PaymentOrder[];
  paymentHistory: PaymentHistoryEntry[];
  summary: {
    totalAttempts: number;
    successfulPayments: number;
    failedPayments: number;
    lastAttemptAt: string | null;
  };
}

interface EMIPaymentsCardProps {
  loan: {
    id: string;
    loanNumber?: string | null;
    status: string;
    approvedAmount: number;
    emisSchedule?: EMIScheduleItem[];
  };
  onPayEMI: (emiId: string, breakdown: EMIBreakdown) => void;
  isCustomer?: boolean;
  isAdmin?: boolean;
}

interface EMIBreakdown {
  principal: number;
  interest: number;
  overdue: number;
  overdueEmiPenalty: number;
  monthsOverdue: number;
  daysLate: number;
  latePaymentPenalty: number;
  penalty: number;
  totalDue: number;
  emiAmount: number;
  lateFee: number;
}

type FilterType = 'all' | 'paid' | 'due' | 'overdue' | 'future';

export function EMIPaymentsCard({ loan, onPayEMI, isCustomer, isAdmin }: EMIPaymentsCardProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [breakdowns, setBreakdowns] = useState<Record<string, EMIBreakdown>>({});
  const [loadingBreakdown, setLoadingBreakdown] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Record<string, EMIPaymentHistory>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [expandedEMI, setExpandedEMI] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Categorize EMIs
  const categorizedEMIs = useMemo(() => {
    if (!loan.emisSchedule) return { paid: [], due: [], overdue: [], future: [] };

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const paid = loan.emisSchedule.filter(e => e.status === EMI_STATUS.PAID);
    const overdue = loan.emisSchedule.filter(e => e.status === EMI_STATUS.OVERDUE);
    const due = loan.emisSchedule.filter(e =>
      e.status === EMI_STATUS.PENDING && new Date(e.dueDate) <= today
    );
    const future = loan.emisSchedule.filter(e =>
      e.status === EMI_STATUS.PENDING && new Date(e.dueDate) > today
    );

    return { paid, due, overdue, future };
  }, [loan.emisSchedule]);

  // Get filtered EMIs based on selected filter
  const filteredEMIs = useMemo(() => {
    const { paid, due, overdue, future } = categorizedEMIs;

    switch (filter) {
      case 'paid':
        return paid;
      case 'due':
        return due;
      case 'overdue':
        return overdue;
      case 'future':
        return future;
      default:
        // All EMIs in order: paid first, then due/overdue, then future
        return [...paid, ...due, ...overdue, ...future].sort((a, b) => a.emiNumber - b.emiNumber);
    }
  }, [categorizedEMIs, filter]);

  // Fetch breakdown for EMI
  const fetchBreakdown = async (emiId: string) => {
    if (breakdowns[emiId]) return;

    setLoadingBreakdown(emiId);
    setError(null);

    try {
      const result = await calculateEMIBreakdown(emiId);
      if (result.ok) {
        setBreakdowns(prev => ({ ...prev, [emiId]: result.data.breakdown }));
      } else {
        setError(result.error?.message || 'Failed to calculate payment breakdown');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoadingBreakdown(null);
    }
  };

  // Fetch payment history for EMI
  const fetchPaymentHistory = async (emiId: string) => {
    if (paymentHistory[emiId]) {
      setExpandedEMI(expandedEMI === emiId ? null : emiId);
      return;
    }

    setLoadingHistory(emiId);
    setError(null);

    try {
      const result = await getEMIPaymentHistory(emiId);
      if (result.ok) {
        setPaymentHistory(prev => ({ ...prev, [emiId]: result.data }));
        setExpandedEMI(emiId);
      } else {
        setError(result.error?.message || 'Failed to fetch payment history');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLoadingHistory(null);
    }
  };

  const handlePayEMI = (emiId: string) => {
    const breakdown = breakdowns[emiId];
    if (breakdown) {
      onPayEMI(emiId, breakdown);
    }
  };

  const getEMIStatusBadge = (emi: EMIScheduleItem, breakdown?: EMIBreakdown) => {
    const today = new Date();
    const due = new Date(emi.dueDate);

    // For PAID EMIs - just show Paid, no need for historical details
    if (emi.status === EMI_STATUS.PAID) {
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    }

    // For OVERDUE EMIs
    if (emi.status === EMI_STATUS.OVERDUE) {
      return (
        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    // For PENDING EMIs
    if (emi.status === EMI_STATUS.PENDING) {
      if (due > today) {
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
            <Calendar className="h-3 w-3 mr-1" />
            Future
          </Badge>
        );
      } else {
        return (
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            Due Today
          </Badge>
        );
      }
    }

    return (
      <Badge variant="outline">
        {emi.status}
      </Badge>
    );
  };

  const getAdditionalTags = (emi: EMIScheduleItem, breakdown?: EMIBreakdown) => {
    const tags: React.ReactNode[] = [];
    const due = new Date(emi.dueDate);
    const today = new Date();

    // For PAID EMIs - no additional tags needed, keep it clean
    if (emi.status === EMI_STATUS.PAID) {
      return tags;
    }

    // For OVERDUE EMIs, show days late (calculate from due date)
    if (emi.status === EMI_STATUS.OVERDUE) {
      const daysLate = Math.abs(getDaysUntilDue(emi.dueDate));
      if (daysLate > 0) {
        tags.push(
          <Badge key="days-late" variant="outline" className="text-red-700 border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
            <Clock className="h-3 w-3 mr-1" />
            {daysLate} days late
          </Badge>
        );
      }
    }

    // For DUE EMIs that are past due, show days past due
    if (emi.status === EMI_STATUS.PENDING && due <= today) {
      const daysLate = Math.abs(getDaysUntilDue(emi.dueDate));
      if (daysLate > 0) {
        tags.push(
          <Badge key="due-days" variant="outline" className="text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
            <Calendar className="h-3 w-3 mr-1" />
            {daysLate} days past due
          </Badge>
        );
      }
    }

    return tags;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const canPayEMI = (status: string, dueDate: string) => {
    if (status === EMI_STATUS.PAID) return false;
    if (status === EMI_STATUS.PENDING && new Date(dueDate) > new Date()) return false;
    return true;
  };

  return (
    <Card className="border-primary/20 mb-4 sm:mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              EMI Payments
            </CardTitle>
            <CardDescription>
              All your EMI payments - past, present, and future
            </CardDescription>
          </div>

          {/* Filter Dropdown */}
          <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All EMIs</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="future">Future</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* EMI List */}
        <div className="space-y-3">
          {filteredEMIs.map((emi) => {
            const breakdown = breakdowns[emi.id];
            const history = paymentHistory[emi.id];
            const isExpanded = expandedEMI === emi.id;
            const canPay = canPayEMI(emi.status, emi.dueDate);
            const daysUntilDue = getDaysUntilDue(emi.dueDate);

            return (
              <div key={emi.id} className="border rounded-lg overflow-hidden">
                {/* EMI Header */}
                <div className={`p-4 ${emi.status === EMI_STATUS.OVERDUE ? 'bg-red-50 dark:bg-red-950' : emi.status === EMI_STATUS.PAID ? 'bg-green-50 dark:bg-green-950' : 'bg-white dark:bg-gray-900'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* EMI Title and Status */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-base">EMI #{emi.emiNumber}</span>
                        {getEMIStatusBadge(emi, breakdown)}
                      </div>

                      {/* Additional Tags - Responsive */}
                      {getAdditionalTags(emi, breakdown).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {getAdditionalTags(emi, breakdown)}
                        </div>
                      )}

                      {/* Due Date and Timing Info */}
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {new Date(emi.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                        {emi.status === EMI_STATUS.PENDING && daysUntilDue > 0 && daysUntilDue <= 7 && (
                          <span className="text-orange-600 ml-1">({daysUntilDue} days left)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* EMI Amount */}
                      <div className="text-right">
                        <div className="font-bold flex items-center text-lg">
                          <IndianRupee className="h-4 w-4" />
                          {emi.emiAmount.toLocaleString('en-IN')}
                        </div>
                        {(emi.lateFee ?? 0) > 0 && (
                          <div className="text-xs text-orange-600">
                            +₹{(emi.lateFee ?? 0).toLocaleString('en-IN')} late fee
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Pay button - Only for customers with payable EMIs */}
                        {isCustomer && canPay && (
                          <Button
                            size="sm"
                            onClick={() => handlePayEMI(emi.id)}
                            disabled={loadingBreakdown === emi.id}
                            className={emi.status === EMI_STATUS.OVERDUE ? 'bg-red-600 hover:bg-red-700' : ''}
                          >
                            {loadingBreakdown === emi.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </>
                            )}
                          </Button>
                        )}

                        {/* Expand/Collapse Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const newExpanded = expandedEMI === emi.id ? null : emi.id;
                            setExpandedEMI(newExpanded);

                            if (newExpanded) {
                              // Always fetch breakdown when expanding
                              if (!breakdowns[emi.id] && loadingBreakdown !== emi.id) {
                                fetchBreakdown(emi.id);
                              }
                              // For admins, also fetch payment history
                              if (isAdmin && !paymentHistory[emi.id] && loadingHistory !== emi.id) {
                                fetchPaymentHistory(emi.id);
                              }
                            }
                          }}
                          disabled={loadingBreakdown === emi.id && loadingHistory === emi.id}
                        >
                          {(loadingBreakdown === emi.id || loadingHistory === emi.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 dark:bg-gray-900">
                    <div className="p-4 space-y-4">
                      {/* Admin: EMI Details Summary */}
                      {isAdmin && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Due Date</div>
                            <div className="font-medium text-sm">
                              {new Date(emi.dueDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">
                              {emi.status === EMI_STATUS.PAID ? 'Paid On' : 'Days Late'}
                            </div>
                            <div className={`font-medium text-sm ${emi.status === EMI_STATUS.OVERDUE ? 'text-red-600' : ''}`}>
                              {emi.status === EMI_STATUS.PAID && emi.paidDate
                                ? new Date(emi.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                : emi.status === EMI_STATUS.OVERDUE
                                  ? `${Math.abs(getDaysUntilDue(emi.dueDate))} days`
                                  : '—'
                              }
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">EMI Amount</div>
                            <div className="font-medium text-sm">₹{emi.emiAmount.toLocaleString('en-IN')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">
                              {emi.status === EMI_STATUS.PAID ? 'Paid Amount' : 'Current Due'}
                            </div>
                            <div className={`font-medium text-sm ${(emi.paidAmount || 0) > emi.emiAmount ? 'text-orange-600' : 'text-green-600'}`}>
                              {emi.status === EMI_STATUS.PAID
                                ? `₹${(emi.paidAmount || emi.emiAmount).toLocaleString('en-IN')}`
                                : breakdown
                                  ? `₹${breakdown.totalDue.toLocaleString('en-IN')}`
                                  : '—'
                              }
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Breakdown - Always shown */}
                      <div>
                        {loadingBreakdown === emi.id ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                            <span className="text-sm text-muted-foreground">Calculating breakdown...</span>
                          </div>
                        ) : breakdown ? (
                          <div className="space-y-4">
                            {/* Breakdown Table */}
                            <div className="overflow-hidden rounded-lg border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Component</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Calculation</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {/* Principal */}
                                  <tr className="hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-green-600" />
                                        <span className="font-medium">Principal</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">
                                      Base amount
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                      ₹{breakdown.principal.toLocaleString('en-IN')}
                                    </td>
                                  </tr>

                                  {/* Interest */}
                                  <tr className="hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium">Interest</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">
                                      Monthly charge
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                      ₹{breakdown.interest.toLocaleString('en-IN')}
                                    </td>
                                  </tr>

                                  {/* EMI Subtotal */}
                                  <tr className="bg-muted/30">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">EMI Amount</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">
                                      Principal + Interest
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                      ₹{breakdown.emiAmount.toLocaleString('en-IN')}
                                    </td>
                                  </tr>

                                  {/* Late Payment Penalty */}
                                  {breakdown.latePaymentPenalty > 0 && (
                                    <tr className="hover:bg-muted/20 bg-orange-50 dark:bg-orange-950/20">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-orange-600" />
                                          <span className="font-medium text-orange-700 dark:text-orange-300">Late Fee</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center text-muted-foreground">
                                        0.0001 × ₹{breakdown.emiAmount.toLocaleString('en-IN')} × {breakdown.daysLate} days
                                      </td>
                                      <td className="px-4 py-3 text-right font-medium text-orange-700 dark:text-orange-300">
                                        + ₹{breakdown.latePaymentPenalty.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                  )}

                                  {/* Overdue EMI Penalty */}
                                  {breakdown.overdueEmiPenalty > 0 && (
                                    <tr className="hover:bg-muted/20 bg-red-50 dark:bg-red-950/20">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4 text-red-600" />
                                          <span className="font-medium text-red-700 dark:text-red-300">Overdue Penalty</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center text-muted-foreground">
                                        0.04 × ₹{breakdown.emiAmount.toLocaleString('en-IN')} × {breakdown.monthsOverdue} {breakdown.monthsOverdue === 1 ? 'month' : 'months'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-medium text-red-700 dark:text-red-300">
                                        + ₹{breakdown.overdueEmiPenalty.toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                  )}

                                  {/* Total Due */}
                                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="h-5 w-5 text-primary" />
                                        <span className="font-bold text-primary">Total Amount Due</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-muted-foreground">
                                      {breakdown.penalty > 0 
                                        ? 'EMI + Penalties'
                                        : 'EMI Amount'}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                      <span className="text-xl font-bold text-primary">
                                        ₹{breakdown.totalDue.toLocaleString('en-IN')}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Info Notice - Only for unpaid EMIs */}
                            {emi.status !== EMI_STATUS.PAID && breakdown.monthsOverdue > 0 && (
                              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                <div className="text-sm text-red-800 dark:text-red-200">
                                  <span className="font-medium">Payment is {breakdown.monthsOverdue} {breakdown.monthsOverdue === 1 ? 'month' : 'months'} overdue.</span>
                                  <span className="text-red-600 dark:text-red-400"> Penalties increase each month until paid.</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                            <span className="text-sm text-muted-foreground">Loading breakdown...</span>
                          </div>
                        )}
                      </div>

                      {/* Payment History - Only for admins */}
                      {isAdmin && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Payment History</span>
                          </div>

                          {loadingHistory === emi.id ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                              <span className="text-sm text-muted-foreground">Loading payment history...</span>
                            </div>
                          ) : history ? (
                            <div className="space-y-3">
                              {/* Summary Stats */}
                              <div className="grid grid-cols-4 gap-3 text-center">
                                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                  <div className="flex items-center justify-center gap-1">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="font-bold text-green-600">{history.summary.successfulPayments}</span>
                                  </div>
                                  <div className="text-xs text-green-700 dark:text-green-300">Successful</div>
                                </div>
                                <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                  <div className="flex items-center justify-center gap-1">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="font-bold text-red-600">{history.summary.failedPayments}</span>
                                  </div>
                                  <div className="text-xs text-red-700 dark:text-red-300">Failed</div>
                                </div>
                                <div className="p-2 bg-muted/50 rounded-lg border">
                                  <div className="font-bold">{history.summary.totalAttempts}</div>
                                  <div className="text-xs text-muted-foreground">Total Attempts</div>
                                </div>
                                <div className="p-2 bg-muted/50 rounded-lg border">
                                  <div className="font-bold text-xs">
                                    {history.summary.lastAttemptAt
                                      ? new Date(history.summary.lastAttemptAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                      : '—'
                                    }
                                  </div>
                                  <div className="text-xs text-muted-foreground">Last Attempt</div>
                                </div>
                              </div>

                              {/* Payment Orders - Detailed List */}
                              {history.paymentOrders.length > 0 ? (
                                <div className="space-y-2">
                                  <h5 className="text-sm font-medium flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Payment Orders ({history.paymentOrders.length})
                                  </h5>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {history.paymentOrders.map((order) => (
                                      <div 
                                        key={order.id} 
                                        className={`p-3 rounded-lg border ${
                                          order.status === 'completed' 
                                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                                            : order.status === 'failed'
                                              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                                              : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              {order.status === 'completed' ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                              ) : order.status === 'failed' ? (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                              ) : (
                                                <Clock className="h-4 w-4 text-orange-600" />
                                              )}
                                              <span className={`font-medium ${
                                                order.status === 'completed' ? 'text-green-700' : 
                                                order.status === 'failed' ? 'text-red-700' : 'text-orange-700'
                                              }`}>
                                                {order.status === 'completed' ? 'Payment Successful' : 
                                                 order.status === 'failed' ? 'Payment Failed' : 
                                                 `Status: ${order.status}`}
                                              </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground space-y-0.5">
                                              <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(order.createdAt).toLocaleString('en-IN', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </div>
                                              {order.razorpayOrderId && (
                                                <div className="font-mono text-xs">Order: {order.razorpayOrderId}</div>
                                              )}
                                              {order.razorpayPaymentId && (
                                                <div className="font-mono text-xs">Payment: {order.razorpayPaymentId}</div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right space-y-1">
                                            <div className="font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</div>
                                            {order.penalty > 0 && (
                                              <div className="text-xs text-orange-600">
                                                (incl. ₹{order.penalty.toLocaleString('en-IN')} penalty)
                                              </div>
                                            )}
                                            {order.paymentMethod && (
                                              <Badge variant="outline" className="text-xs">{order.paymentMethod}</Badge>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Failure reason for failed payments */}
                                        {order.status === 'failed' && order.failureReason && (
                                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-xs">
                                            <span className="font-medium text-red-800 dark:text-red-200">Reason: </span>
                                            <span className="text-red-700 dark:text-red-300">{order.failureReason}</span>
                                            {order.failureCode && (
                                              <span className="ml-2 text-red-500">({order.failureCode})</span>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Paid timestamp for successful payments */}
                                        {order.status === 'completed' && order.paidAt && (
                                          <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                                            Paid at: {new Date(order.paidAt).toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                                  <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                  No payment attempts recorded for this EMI
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                              <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              No payment history available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredEMIs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No EMIs found for the selected filter.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}