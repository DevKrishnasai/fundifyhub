"use client";

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmiScheduleTable from '@/components/request/EmiScheduleTable';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { getWithResult } from '@/lib/api-client';

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

export default function CreateOfferModal({ open, onOpenChange, onSubmit, requestId, initialOffer }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (payload: OfferForm) => void; requestId: string; initialOffer?: Partial<OfferForm> }) {
  const [amount, setAmount] = React.useState<number | ''>('');
  const [tenureMonths, setTenureMonths] = React.useState<number | ''>('');
  const [interestRate, setInterestRate] = React.useState<number | ''>('');
  const [penaltyPercentage, setPenaltyPercentage] = React.useState<number | ''>('');
  const [lateFeePercentage, setLateFeePercentage] = React.useState<number | ''>('');
  const [processingFee, setProcessingFee] = React.useState<number | ''>('');
  const [preview, setPreview] = React.useState<EMIPreview | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
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
      setPreview(null);
      setError(null);
    }
  }, [open, initialOffer]);

  // fetch preview when inputs change (simple effect, no debounce for simplicity)
  useEffect(() => {
    async function fetchPreview() {
      if (!requestId) return;
      const a = Number(amount);
      const t = Number(tenureMonths);
      const i = Number(interestRate);
      if (!a || !t || !i) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const resp = await getWithResult<EMIPreview>(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.OFFER_PREVIEW(requestId, a, t, i));
        if (resp.ok && resp.data) {
          setPreview(resp.data);
          if (process.env.NODE_ENV === 'development') console.debug('CreateOfferModal: preview', resp.data);
        } else {
          setPreview(null);
        }
      } catch (e) {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }
    fetchPreview();
  }, [amount, tenureMonths, interestRate, requestId]);

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
    if (!i || i <= 0) {
      setError('Please enter a valid interest rate greater than 0');
      return;
    }
    
  const p = penaltyPercentage === '' ? 4 : penaltyPercentage;
  const l = lateFeePercentage === '' ? 0.01 : lateFeePercentage;
  // Send 0 when no processing fee provided (default to 0)
  const pf = processingFee === '' ? 0 : processingFee;

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
          <DialogTitle>{initialOffer ? 'Revise Offer' : 'Create Offer'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Loan Amount (₹)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={amount === '' ? '' : amount} 
                onChange={(e) => {
                  setError(null);
                  setAmount(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Tenure (months)</label>
              <Input 
                type="number" 
                min="1"
                value={tenureMonths === '' ? '' : tenureMonths} 
                onChange={(e) => {
                  setError(null);
                  setTenureMonths(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="Enter tenure in months"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Interest Rate (% p.a.)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={interestRate === '' ? '' : interestRate} 
                onChange={(e) => {
                  setError(null);
                  setInterestRate(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="e.g. 12.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Penalty Rate (%)</label>
              <Input 
                type="number" 
                step="0.1" 
                min="0"
                value={penaltyPercentage === '' ? '' : penaltyPercentage} 
                onChange={(e) => {
                  setError(null);
                  setPenaltyPercentage(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="Default: 4%"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Late Fee (%)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={lateFeePercentage === '' ? '' : lateFeePercentage} 
                onChange={(e) => {
                  setError(null);
                  setLateFeePercentage(e.target.value === '' ? '' : Number(e.target.value));
                }} 
                placeholder="Default: 0.01%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Processing Fee (₹)</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                value={processingFee === '' ? '' : processingFee}
                onChange={(e) => {
                  setError(null);
                  setProcessingFee(e.target.value === '' ? '' : Number(e.target.value));
                }}
                placeholder="Fee deducted at disbursement"
              />
            </div>
          </div>

          {/* EMI preview */}
          <div className="border-t pt-4">
            {previewLoading && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-sm text-muted-foreground">Calculating EMI preview...</div>
              </div>
            )}
            
            {!previewLoading && preview && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <h4 className="font-semibold text-sm">EMI Preview</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Monthly EMI</div>
                          <div className="text-lg font-bold text-primary">₹{(preview.monthlyPayment ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Interest</div>
                    <div className="text-lg font-bold">₹{(preview.totalInterest ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Payment</div>
                    <div className="text-lg font-bold">₹{(preview.totalPayment ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
                
                {preview.emiSchedule && preview.emiSchedule.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium hover:text-primary">View EMI Schedule ({preview.emiSchedule.length} installments)</summary>
                    <div className="mt-3 max-h-64 overflow-auto border rounded-lg p-2">
                      <EmiScheduleTable rows={preview.emiSchedule} mode="preview" />
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            type="button" 
            variant="default" 
            onClick={submit}
            disabled={!amount || !tenureMonths || !interestRate}
          >
            {initialOffer ? 'Update Offer' : 'Create Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
