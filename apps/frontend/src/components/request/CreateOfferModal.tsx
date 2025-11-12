"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../dialog';
import { Button } from '../button';
import { Input } from '../input';
import { useEffect } from 'react';

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

type OfferForm = { amount: number; tenureMonths: number; interestRate: number };

export default function CreateOfferModal({ open, onOpenChange, onSubmit, requestId, initialOffer }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (payload: OfferForm) => void; requestId: string; initialOffer?: Partial<OfferForm> }) {
  const [amount, setAmount] = React.useState<number | ''>('');
  const [tenureMonths, setTenureMonths] = React.useState<number | ''>('');
  const [interestRate, setInterestRate] = React.useState<number | ''>('');
  const [preview, setPreview] = React.useState<EMIPreview | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  // Prefill fields when modal opens with an initialOffer
  useEffect(() => {
    if (open && initialOffer) {
      if (typeof initialOffer.amount === 'number') setAmount(initialOffer.amount);
      if (typeof initialOffer.tenureMonths === 'number') setTenureMonths(initialOffer.tenureMonths);
      if (typeof initialOffer.interestRate === 'number') setInterestRate(initialOffer.interestRate);
    }
    // when modal closes without submit, keep existing behaviour of clearing in handleClose
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
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/offer-preview?amount=${a}&tenureMonths=${t}&interestRate=${i}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) setPreview(data.data as EMIPreview);
        else setPreview(null);
      } catch (e) {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }
    fetchPreview();
  }, [amount, tenureMonths, interestRate, requestId]);

  function handleClose() {
    setAmount('');
    setTenureMonths('');
    setInterestRate('');
    onOpenChange(false);
  }

  function submit() {
    const a = Number(amount);
    const t = Number(tenureMonths);
    const i = Number(interestRate);
    if (!a || !t || !i) {
      alert('Please provide valid values');
      return;
    }
    onSubmit({ amount: a, tenureMonths: t, interestRate: i });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Offer</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <label className="block text-sm font-medium">Amount</label>
            <Input type="number" step="0.01" value={amount as any} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          <div>
            <label className="block text-sm font-medium">Tenure (months)</label>
            <Input type="number" value={tenureMonths as any} onChange={(e) => setTenureMonths(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          <div>
            <label className="block text-sm font-medium">Interest rate (%)</label>
            <Input type="number" step="0.01" value={interestRate as any} onChange={(e) => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="button" variant="default" onClick={submit}>Create Offer</Button>
          </DialogFooter>
          {/* EMI preview */}
          <div>
            {previewLoading && <div className="text-sm text-muted">Loading EMI preview…</div>}
            {preview && (
              <div className="p-2 border rounded">
                <div className="text-sm">Monthly EMI: <strong>₹{preview.monthlyPayment.toFixed(2)}</strong></div>
                <div className="text-sm">Total Interest: <strong>₹{preview.totalInterest.toFixed(2)}</strong></div>
                <div className="text-sm">Total Payment: <strong>₹{preview.totalPayment.toFixed(2)}</strong></div>
                <details className="mt-2">
                  <summary className="cursor-pointer">Show schedule</summary>
                  <div className="mt-2 max-h-48 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left"><th>#</th><th>Due</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
                      </thead>
                      <tbody>
                        {preview.emiSchedule.map(e => (
                          <tr key={e.installment}>
                            <td>{e.installment}</td>
                            <td>{new Date(e.paymentDate).toLocaleDateString()}</td>
                            <td>₹{e.paymentAmount.toFixed(2)}</td>
                            <td>₹{e.principal.toFixed(2)}</td>
                            <td>₹{e.interest.toFixed(2)}</td>
                            <td>₹{e.remainingBalance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
