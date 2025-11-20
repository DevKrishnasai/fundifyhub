'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';

function MockGatewayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  const txnId = searchParams.get('txnId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (countdown === 0) {
      // Auto-redirect to callback after countdown
      router.push(`/payments/callback?txnId=${txnId}`);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, txnId]);

  const handlePayNow = () => {
    router.push(`/payments/callback?txnId=${txnId}`);
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mock Payment Gateway
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🧪 Development Mode - Simulated Payment
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
            <span className="font-mono text-gray-900 dark:text-white text-xs">
              {txnId?.slice(0, 20)}...
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="font-bold text-gray-900 dark:text-white">
              ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handlePayNow}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            ✓ Simulate Successful Payment
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full"
          >
            Cancel Payment
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Auto-redirecting in {countdown}s...
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
          <strong>⚠️ Development Only:</strong> This mock gateway is only visible when{' '}
          <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
            PHONEPE_MOCK_MODE=true
          </code>{' '}
          in your .env file. Real PhonePe gateway will be used in production.
        </div>
      </Card>
    </div>
  );
}

export default function MockGatewayPage() {
  return (
    <Suspense fallback={<div>Loading payment gateway...</div>}>
      <MockGatewayContent />
    </Suspense>
  );
}
