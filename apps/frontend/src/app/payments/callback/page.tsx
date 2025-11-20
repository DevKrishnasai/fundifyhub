'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get transaction ID from URL or sessionStorage
        const txnId = searchParams.get('txnId');
        const storedData = sessionStorage.getItem('phonePeTransaction');

        if (!txnId || !storedData) {
          setStatus('failed');
          setMessage('Transaction information not found');
          return;
        }

        const transactionData = JSON.parse(storedData);

        // Verify payment with backend
        const response = await api.post('/api/v1/payments/phonepe/verify', {
          merchantTransactionId: txnId,
          loanId: transactionData.loanId,
          emiIds: transactionData.emiIds,
          amount: transactionData.amount
        });

        const data = response.data;

        if (data.success) {
          setStatus('success');
          setMessage('Payment successful! Your EMI has been recorded.');
          // Clear stored data
          sessionStorage.removeItem('phonePeTransaction');
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment verification failed');
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Failed to verify payment');
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === 'processing' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful'}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we verify your payment...'}
            {status === 'success' && 'Your payment has been processed successfully'}
            {status === 'failed' && 'There was an issue processing your payment'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'processing' && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {status !== 'processing' && (
            <Button onClick={handleContinue} className="w-full">
              Back to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
