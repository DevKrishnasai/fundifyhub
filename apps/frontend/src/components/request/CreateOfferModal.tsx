"use client";

import React, { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import EmiScheduleTable from '@/components/request/EmiScheduleTable';
import { Calculator, IndianRupee, Percent, Calendar, AlertCircle } from 'lucide-react';
import { OFFER_FORM_DEFAULTS, OFFER_FORM_CONSTRAINTS } from '@fundifyhub/types';

type EMIRow = {
  installment: number;
  paymentDate: string;
  paymentAmount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

type EMIPreview = {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  principalAmount: number;
  emiSchedule: EMIRow[];
};

type OfferForm = { 
  amount: number; 
  tenureMonths: number; 
  interestRate: number;
  penaltyPercentage: number;
  lateFeePercentage: number;
  processingFee?: number;
};

/**
 * Calculate EMI schedule on the frontend
 * Uses standard amortization formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 */
function calculateEmiSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMIPreview | null {
  if (principal <= 0 || tenureMonths <= 0 || annualRate < 0) return null;

  const monthlyRate = annualRate / 100 / 12;
  let monthlyPayment: number;
  
  if (monthlyRate === 0) {
    monthlyPayment = principal / tenureMonths;
  } else {
    const r = monthlyRate;
    const n = tenureMonths;
    monthlyPayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const monthlyPaymentRounded = Math.round(monthlyPayment * 100) / 100;
  const schedule: EMIRow[] = [];
  let remaining = principal;
  let totalInterest = 0;
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + 1);
  startDate.setDate(1); // Start from 1st of next month

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = remaining * monthlyRate;
    const principalComponent = monthlyPayment - interest;
    
    const interestRounded = Math.round(interest * 100) / 100;
    let principalRounded = Math.round(principalComponent * 100) / 100;

    // For last installment, adjust principal to clear balance
    if (i === tenureMonths) {
      principalRounded = Math.round(remaining * 100) / 100;
    }

    const paymentAmount = Math.round((principalRounded + interestRounded) * 100) / 100;
    remaining = Math.round((remaining - principalRounded) * 100) / 100;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i - 1);

    schedule.push({
      installment: i,
      paymentDate: paymentDate.toISOString(),
      paymentAmount,
      principal: principalRounded,
      interest: interestRounded,
      remainingBalance: Math.max(0, remaining),
    });

    totalInterest += interestRounded;
  }

  const totalPayment = Math.round((principal + totalInterest) * 100) / 100;

  return {
    monthlyPayment: monthlyPaymentRounded,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment,
    principalAmount: principal,
    emiSchedule: schedule,
  };
}

export default function CreateOfferModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  requestId, 
  initialOffer 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (payload: OfferForm) => void; 
  requestId: string; 
  initialOffer?: Partial<OfferForm>; 
}) {
  const [amount, setAmount] = React.useState<number | ''>('');
  const [tenureMonths, setTenureMonths] = React.useState<number | ''>('');
  const [interestRate, setInterestRate] = React.useState<number | ''>('');
  const [penaltyPercentage, setPenaltyPercentage] = React.useState<number | ''>('');
  const [lateFeePercentage, setLateFeePercentage] = React.useState<number | ''>('');
  const [processingFee, setProcessingFee] = React.useState<number | ''>('');
  const [error, setError] = React.useState<string | null>(null);

  // Prefill fields when modal opens with an initialOffer
  useEffect(() => {
    if (open && initialOffer) {
      if (typeof initialOffer.amount === 'number') setAmount(initialOffer.amount);
      if (typeof initialOffer.tenureMonths === 'number') setTenureMonths(initialOffer.tenureMonths);
      if (typeof initialOffer.interestRate === 'number') setInterestRate(initialOffer.interestRate);
      if (typeof initialOffer.penaltyPercentage === 'number') setPenaltyPercentage(initialOffer.penaltyPercentage);
      if (typeof initialOffer.lateFeePercentage === 'number') setLateFeePercentage(initialOffer.lateFeePercentage);
      if (typeof initialOffer.processingFee === 'number') setProcessingFee(initialOffer.processingFee);
    } else if (!open) {
      // Clear fields when modal closes
      setAmount('');
      setTenureMonths('');
      setInterestRate('');
      setPenaltyPercentage('');
      setLateFeePercentage('');
      setProcessingFee('');
      setError(null);
    }
  }, [open, initialOffer]);

  // Calculate EMI preview on the frontend (no backend call needed)
  const preview = useMemo(() => {
    const a = Number(amount);
    const t = Number(tenureMonths);
    const i = Number(interestRate);
    if (!a || !t || i === undefined) return null;
    return calculateEmiSchedule(a, i, t);
  }, [amount, tenureMonths, interestRate]);

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  function submit() {
    const a = Number(amount);
    const t = Number(tenureMonths);
    const i = Number(interestRate);
    if (!a || a <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!t || t <= 0) {
      setError('Please enter a valid tenure (months) greater than 0');
      return;
    }
    if (i === undefined || i < 0) {
      setError('Please enter a valid interest rate');
      return;
    }
    
    const p = penaltyPercentage === '' ? OFFER_FORM_DEFAULTS.PENALTY_PERCENTAGE : penaltyPercentage;
    const l = lateFeePercentage === '' ? OFFER_FORM_DEFAULTS.LATE_FEE_PERCENTAGE : lateFeePercentage;
    const pf = processingFee === '' ? OFFER_FORM_DEFAULTS.PROCESSING_FEE : processingFee;

    setError(null);
    onSubmit({ 
      amount: a, 
      tenureMonths: t, 
      interestRate: i,
      penaltyPercentage: p,
      lateFeePercentage: l,
      processingFee: pf
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {initialOffer ? 'Revise Offer' : 'Create Loan Offer'}
          </DialogTitle>
          <DialogDescription>
            Configure the loan terms for the customer. EMI will be calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Primary Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" />
                Loan Amount
              </Label>
              <Input 
                id="amount"
                type="number" 
                step="1000" 
                min="0"
                value={amount === '' ? '' : amount} 
                onChange={(e) => {
                  setError(null);
                  setAmount(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="e.g. 50000"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenure" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Tenure (months)
              </Label>
              <Input 
                id="tenure"
                type="number" 
                min="1"
                max={OFFER_FORM_CONSTRAINTS.MAX_TENURE_MONTHS}
                value={tenureMonths === '' ? '' : tenureMonths} 
                onChange={(e) => {
                  setError(null);
                  setTenureMonths(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="e.g. 12"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate" className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                Interest Rate (p.a.)
              </Label>
              <Input 
                id="rate"
                type="number" 
                step="0.5" 
                min="0"
                max={OFFER_FORM_CONSTRAINTS.MAX_INTEREST_RATE}
                value={interestRate === '' ? '' : interestRate} 
                onChange={(e) => {
                  setError(null);
                  setInterestRate(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="e.g. 18"
                className="font-mono"
              />
            </div>
          </div>

          {/* Secondary Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penalty" className="text-muted-foreground">
                Penalty Rate (%)
              </Label>
              <Input 
                id="penalty"
                type="number" 
                step="0.5" 
                min="0"
                value={penaltyPercentage === '' ? '' : penaltyPercentage} 
                onChange={(e) => {
                  setError(null);
                  setPenaltyPercentage(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="Default: 4"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateFee" className="text-muted-foreground">
                Late Fee (% per day)
              </Label>
              <Input 
                id="lateFee"
                type="number" 
                step="0.01" 
                min="0"
                value={lateFeePercentage === '' ? '' : lateFeePercentage} 
                onChange={(e) => {
                  setError(null);
                  setLateFeePercentage(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="Default: 0.01"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="processingFee" className="text-muted-foreground">
                Processing Fee (₹)
              </Label>
              <Input 
                id="processingFee"
                type="number" 
                step="100" 
                min="0"
                value={processingFee === '' ? '' : processingFee}
                onChange={(e) => {
                  setError(null);
                  setProcessingFee(e.target.value === '' ? '' : Number(e.target.value));
                }}
                placeholder="Deducted at disbursement"
                className="font-mono"
              />
            </div>
          </div>

          {/* EMI Breakdown */}
          {preview && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  EMI Breakdown
                </h4>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Monthly EMI</p>
                    <p className="text-lg font-bold text-primary font-mono">
                      {formatCurrency(preview.monthlyPayment)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground">Principal</p>
                    <p className="text-lg font-bold font-mono">
                      {formatCurrency(preview.principalAmount)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-muted-foreground">Total Interest</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {formatCurrency(preview.totalInterest)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-muted-foreground">Total Payable</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(preview.totalPayment)}
                    </p>
                  </div>
                </div>

                {/* Processing Fee Info */}
                {processingFee && Number(processingFee) > 0 && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                    <p className="text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Net Disbursement:</span>{' '}
                      <span className="font-mono font-bold">
                        {formatCurrency(preview.principalAmount - Number(processingFee))}
                      </span>
                      <span className="text-xs ml-2 text-blue-600 dark:text-blue-400">
                        (after {formatCurrency(Number(processingFee))} processing fee)
                      </span>
                    </p>
                  </div>
                )}
                
                {/* EMI Schedule Table */}
                {preview.emiSchedule && preview.emiSchedule.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium hover:text-primary flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      View EMI Schedule ({preview.emiSchedule.length} installments)
                    </summary>
                    <div className="mt-3 max-h-64 overflow-auto border rounded-lg">
                      <EmiScheduleTable rows={preview.emiSchedule} mode="preview" />
                    </div>
                  </details>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={submit}
            disabled={!amount || !tenureMonths || interestRate === ''}
          >
            {initialOffer ? 'Update Offer' : 'Create Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
