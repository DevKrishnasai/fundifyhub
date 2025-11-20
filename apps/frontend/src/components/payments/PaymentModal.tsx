'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dialog';
import { api } from '@/lib/api-client';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  emiId: string;
  amount: number;
  payAheadCount?: number;
  onSuccess?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  loanId,
  emiId,
  amount,
  payAheadCount = 1,
  onSuccess
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      console.log('💳 Initiating payment:', { loanId, emiId, payAheadCount, amount });

      // Create PhonePe order - api.post returns full axios response
      const response = await api.post('/api/v1/payments/phonepe/create-order', {
        loanId,
        emiId,
        payAheadCount,
        amount
      });

      const data = response.data;
      console.log('📦 Payment response:', data);

      if (data.success) {
        const { redirectUrl, merchantTransactionId, emiIds, amount: paidAmount } = data.data;

        console.log('✅ Payment order created:', { merchantTransactionId, redirectUrl });

        // Store transaction details in sessionStorage for callback page
        sessionStorage.setItem('phonePeTransaction', JSON.stringify({
          merchantTransactionId,
          loanId,
          emiIds,
          amount: paidAmount
        }));

        // Redirect to PhonePe payment page
        window.location.href = redirectUrl;
      } else {
        setError(data.message || 'Failed to initiate payment. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      setError(err.response?.data?.message || err.message || 'Payment initiation failed');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay with PhonePe</DialogTitle>
          <DialogDescription>
            You will be redirected to PhonePe to complete your payment securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Amount to Pay</span>
              <span className="text-2xl font-bold">₹{amount.toLocaleString()}</span>
            </div>
            {payAheadCount > 1 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">EMIs Covered</span>
                <span className="font-medium">{payAheadCount} months</span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            You will be redirected to PhonePe&apos;s secure payment gateway
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
