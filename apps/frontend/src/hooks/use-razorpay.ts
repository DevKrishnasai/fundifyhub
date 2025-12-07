'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';

// ============================================================================
// TYPES
// ============================================================================

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  method?: {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
    wallet?: boolean;
  };
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface UseRazorpayOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

interface InitiatePaymentParams {
  loanId: string;
  emiId: string;
  emiNumber: number;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRazorpayConstructor(): (new (options: RazorpayOptions) => RazorpayInstance) | undefined {
  const win = window as typeof window & { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance };
  return win.Razorpay;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Custom hook for handling Razorpay payments
 * 
 * Flow:
 * 1. Create order on backend (returns existing active order if available)
 * 2. Open Razorpay checkout
 * 3. On success callback, call verify endpoint as confirmation
 * 4. Webhook updates PaymentOrder status asynchronously (source of truth)
 * 
 * Note: Webhook is the primary handler. The verify endpoint is a synchronous
 * fallback to ensure UI updates immediately after payment.
 */
export function useRazorpay(options: UseRazorpayOptions = {}) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const razorpayInstanceRef = useRef<RazorpayInstance | null>(null);

  // Load Razorpay script on mount
  useEffect(() => {
    const loadRazorpayScript = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const RazorpayClass = getRazorpayConstructor();
        if (RazorpayClass) {
          resolve(true);
          return;
        }

        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(true));
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript().then(setIsScriptLoaded);
  }, []);

  /**
   * Initiate payment - creates order and opens Razorpay checkout
   */
  const initiatePayment = useCallback(async ({ loanId, emiId, emiNumber }: InitiatePaymentParams) => {
    if (!isScriptLoaded) {
      options.onError?.('Payment gateway not loaded. Please refresh and try again.');
      return;
    }

    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      // Step 1: Create order (or get existing active order)
      const response = await api.post(BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.RAZORPAY_CREATE_ORDER, {
        loanId,
        emiId,
      });

      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create payment order');
      }

      const { 
        orderId, 
        keyId, 
        customerName, 
        customerPhone, 
        customerEmail, 
        breakdown 
      } = data.data;

      const finalAmount = breakdown?.totalDue || 0;

      if (finalAmount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Step 2: Configure & open Razorpay checkout
      const razorpayOptions: RazorpayOptions = {
        key: keyId,
        amount: Math.round(finalAmount * 100),
        currency: 'INR',
        name: 'FundifyHub',
        description: `EMI Payment #${emiNumber}`,
        image: '/logo.png',
        order_id: orderId,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: async (razorpayResponse: RazorpayResponse) => {
          // Step 3: Verify payment (synchronous confirmation)
          // Webhook will also process this, but verify gives immediate UI feedback
          try {
            const verifyResponse = await api.post(BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.RAZORPAY_VERIFY, {
              orderId: razorpayResponse.razorpay_order_id,
              paymentId: razorpayResponse.razorpay_payment_id,
              signature: razorpayResponse.razorpay_signature,
              loanId,
              emiId,
            });

            if (verifyResponse.data.success) {
              options.onSuccess?.();
            } else {
              throw new Error(verifyResponse.data.message || 'Payment verification failed');
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
            options.onError?.(errorMessage);
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
            options.onCancel?.();
          },
        },
      };

      const RazorpayClass = getRazorpayConstructor();
      if (RazorpayClass) {
        razorpayInstanceRef.current = new RazorpayClass(razorpayOptions);
        razorpayInstanceRef.current.open();
      } else {
        throw new Error('Razorpay SDK not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate payment';
      options.onError?.(errorMessage);
      setIsProcessing(false);
    }
  }, [isScriptLoaded, isProcessing, options]);

  return {
    initiatePayment,
    isScriptLoaded,
    isProcessing,
  };
}
