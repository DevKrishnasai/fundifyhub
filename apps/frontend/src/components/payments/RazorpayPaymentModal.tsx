'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EMIBreakdown {
  principal: number;
  interest: number;
  overdue: number;
  overdueEmiPenalty: number;
  daysLate: number;
  latePaymentPenalty: number;
  penalty: number;
  emiAmount: number;
  totalDue: number;
}

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  emiId: string;
  emiNumber: number;
  amount: number;
  breakdown?: EMIBreakdown | null;
  onSuccess?: () => void;
}

// Declare Razorpay on window for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayPaymentModal({
  isOpen,
  onClose,
  loanId,
  emiId,
  emiNumber,
  amount,
  breakdown,
  onSuccess,
}: RazorpayPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [orderBreakdown, setOrderBreakdown] = useState<EMIBreakdown | null>(breakdown || null);
  const { success, error } = useToast();

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript().then((loaded) => {
      setIsScriptLoaded(!!loaded);
    });
  }, []);

  const handlePayment = async () => {
    if (!isScriptLoaded) {
      error('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

    try {
      setIsProcessing(true);

      // Create Razorpay order (use breakdown.totalDue if available, else fallback to amount)
      const paymentAmount = orderBreakdown?.totalDue || amount;
      const response = await api.post('/api/v1/payments/razorpay/create-order', {
        loanId,
        emiId,
        amount: paymentAmount,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to create payment order');
      }

      const { orderId, keyId, emiNumber: orderEmiNumber, customerName, customerPhone, customerEmail, breakdown: serverBreakdown } = data.data;
      
      // Update breakdown from server response
      if (serverBreakdown) {
        setOrderBreakdown(serverBreakdown);
      }

      // Use server breakdown's totalDue for the actual payment amount
      const finalAmount = serverBreakdown?.totalDue || amount;

      // Razorpay payment options
      const options = {
        key: keyId,
        amount: Math.round(finalAmount * 100), // Amount in paise
        currency: 'INR',
        name: 'FundifyHub',
        description: `EMI Payment #${orderEmiNumber}`,
        image: '/logo.png', // Optional: Add your logo
        order_id: orderId,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyResponse = await api.post('/api/v1/payments/razorpay/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              loanId,
              emiId,
            });

            const verifyData = verifyResponse.data;

            if (verifyData.success) {
              success(`EMI #${emiNumber} has been paid successfully.`);

              if (onSuccess) {
                onSuccess();
              }
              onClose();
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (err: any) {
            console.error('Payment verification error:', err);
            error(err.response?.data?.message || err.message || 'Failed to verify payment');
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: customerName || 'Customer',
          email: customerEmail || '',
          contact: customerPhone || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            error('You cancelled the payment process.');
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      error(err.response?.data?.message || err.message || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay EMI #{emiNumber}
          </DialogTitle>
          <DialogDescription>
            Complete your EMI payment securely with Razorpay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display with Breakdown */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">EMI Number</span>
              <span className="font-medium">#{emiNumber}</span>
            </div>
            
            {orderBreakdown && (
              <div className="space-y-2 pt-2 border-t border-primary/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Principal</span>
                  <span className="font-medium">₹{orderBreakdown.principal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Interest</span>
                  <span className="font-medium">₹{orderBreakdown.interest.toLocaleString()}</span>
                </div>
                {orderBreakdown.overdue > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-600 dark:text-orange-400">Overdue Amount</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">₹{orderBreakdown.overdue.toLocaleString()}</span>
                  </div>
                )}
                {orderBreakdown.overdueEmiPenalty > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-600 dark:text-red-400">Overdue Penalty (4%)</span>
                    <span className="font-medium text-red-600 dark:text-red-400">₹{orderBreakdown.overdueEmiPenalty.toLocaleString()}</span>
                  </div>
                )}
                {orderBreakdown.daysLate > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-600 dark:text-red-400">Late Payment ({orderBreakdown.daysLate} {orderBreakdown.daysLate === 1 ? 'day' : 'days'} @ 0.01%)</span>
                    <span className="font-medium text-red-600 dark:text-red-400">₹{orderBreakdown.latePaymentPenalty.toLocaleString()}</span>
                  </div>
                )}
                {orderBreakdown.penalty > 0 && (orderBreakdown.overdueEmiPenalty > 0 || orderBreakdown.latePaymentPenalty > 0) && (
                  <div className="flex justify-between items-center text-sm font-semibold pt-1 border-t border-red-200 dark:border-red-800">
                    <span className="text-red-700 dark:text-red-300">Total Penalty</span>
                    <span className="text-red-700 dark:text-red-300">₹{orderBreakdown.penalty.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center pt-2 border-t border-primary/20">
              <span className="text-sm font-semibold">Total Amount</span>
              <span className="text-2xl font-bold text-primary">
                ₹{(orderBreakdown?.totalDue || amount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              ✓ Secure payment powered by Razorpay
            </p>
            <p className="flex items-center gap-2">
              ✓ Multiple payment methods supported
            </p>
            <p className="flex items-center gap-2">
              ✓ Instant payment confirmation
            </p>
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-xs">
              <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">💳 Use Indian Test Cards:</p>
              <p className="text-blue-600 dark:text-blue-400">Card: 5267 3181 8797 5449 (MasterCard)</p>
              <p className="text-blue-600 dark:text-blue-400">Card: 4111 1111 1111 1111 (Visa)</p>
              <p className="text-blue-600 dark:text-blue-400">CVV: 123 | Expiry: 12/30 | Name: Test User</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !isScriptLoaded}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : !isScriptLoaded ? (
                'Loading...'
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ₹{(orderBreakdown?.totalDue || amount).toLocaleString()}
                </>
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-center text-muted-foreground">
            By proceeding, you agree to complete the payment for this EMI installment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
