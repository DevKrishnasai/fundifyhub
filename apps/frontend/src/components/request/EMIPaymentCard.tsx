'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, IndianRupee, Clock } from 'lucide-react';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { EMI_STATUS } from '@fundifyhub/types';

interface EMIPaymentCardProps {
  loan: {
    id: string;
    loanNumber?: string;
    status: string;
    approvedAmount: number;
    emisSchedule?: Array<{
      id: string;
      emiNumber: number;
      dueDate: string;
      emiAmount: number;
      principalAmount: number;
      interestAmount: number;
      status: string;
      lateFee?: number;
    }>;
  };
  onPayEMI: (emiId: string, breakdown: any) => void;
}

interface EMIBreakdown {
  principal: number;
  interest: number;
  overdue: number;
  overdueEmiPenalty: number;
  daysLate: number;
  latePaymentPenalty: number;
  penalty: number;
  totalDue: number;
  emiAmount: number;
  lateFee: number;
}

export function EMIPaymentCard({ loan, onPayEMI }: EMIPaymentCardProps) {
  const [nextEmi, setNextEmi] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<EMIBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Find the oldest unpaid EMI
    if (!loan.emisSchedule) return;
    
    const pendingEmis = loan.emisSchedule.filter(
      (e) => e.status === EMI_STATUS.PENDING || e.status === EMI_STATUS.OVERDUE
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (pendingEmis.length > 0) {
      setNextEmi(pendingEmis[0]);
    } else {
      setNextEmi(null);
    }
  }, [loan.emisSchedule]);

  const fetchBreakdown = async () => {
    if (!nextEmi) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_PAY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ emiId: nextEmi.id })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setBreakdown(data.data.breakdown);
      } else {
        setError(data.message || 'Failed to calculate payment breakdown');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    if (nextEmi && breakdown) {
      onPayEMI(nextEmi.id, breakdown);
    }
  };

  if (!nextEmi) {
    return null; // No pending EMIs
  }

  const dueDate = new Date(nextEmi.dueDate);
  const isOverdue = nextEmi.status === EMI_STATUS.OVERDUE;
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={`mb-6 ${isOverdue ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-primary bg-primary/5'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {isOverdue ? '⚠️ EMI Payment Overdue' : '💳 Next EMI Payment Due'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* EMI Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">EMI Number</p>
              <p className="text-lg font-semibold">#{nextEmi.emiNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className={`text-lg font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {!isOverdue && daysUntilDue > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({daysUntilDue} days left)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          {breakdown ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Principal</span>
                <span className="font-medium">₹{breakdown.principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Interest</span>
                <span className="font-medium">₹{breakdown.interest.toLocaleString()}</span>
              </div>
              {breakdown.overdueEmiPenalty > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span className="text-sm">Overdue Penalty (4%)</span>
                  <span className="font-medium">+₹{breakdown.overdueEmiPenalty.toLocaleString()}</span>
                </div>
              )}
              {breakdown.latePaymentPenalty > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span className="text-sm">Late Fee (0.01% × {breakdown.daysLate} days)</span>
                  <span className="font-medium">+₹{breakdown.latePaymentPenalty.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold">Total Amount</span>
                <span className="text-xl font-bold flex items-center">
                  <IndianRupee className="h-5 w-5" />
                  {breakdown.totalDue.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Button
                onClick={fetchBreakdown}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Calculating...' : 'Calculate Payment Amount'}
              </Button>
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
          )}

          {/* Pay Button */}
          {breakdown && (
            <Button
              size="lg"
              className="w-full"
              variant={isOverdue ? 'destructive' : 'default'}
              onClick={handlePayNow}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Pay Now - ₹{breakdown.totalDue.toLocaleString()}
            </Button>
          )}

          {/* Additional Info */}
          {(() => {
            if (!loan.emisSchedule) return null;
            const pendingCount = loan.emisSchedule.filter(
              (e) => e.status === EMI_STATUS.PENDING || e.status === EMI_STATUS.OVERDUE
            ).length;
            return pendingCount > 1 && (
              <div className="text-xs text-muted-foreground text-center">
                + {pendingCount - 1} more pending EMI{pendingCount > 2 ? 's' : ''}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}