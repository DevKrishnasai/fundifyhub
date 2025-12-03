/**
 * SignatureSection Component
 * 
 * Digital signature capture for loan agreement signing.
 * Shows signature pad for customers, displays signature status for others.
 */

'use client';

import React, { useState, useRef } from 'react';
import { FileSignature, CheckCircle, AlertCircle, Download, RefreshCw } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { SectionCard } from './SectionCard';
import { REQUEST_STATUS } from '@fundifyhub/types';

export interface SignatureSectionProps {
  requestId: string;
  currentStatus: REQUEST_STATUS;
  agreementUrl?: string | null;
  signedAgreementUrl?: string | null;
  isCustomer: boolean;
  onSign?: (signatureDataUrl: string) => Promise<void>;
  onGenerateAgreement?: () => Promise<void>;
  isLoading?: boolean;
}

export function SignatureSection({
  requestId,
  currentStatus,
  agreementUrl,
  signedAgreementUrl,
  isCustomer,
  onSign,
  onGenerateAgreement,
  isLoading = false,
}: SignatureSectionProps) {
  const signaturePadRef = useRef<SignatureCanvas | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const needsSignature = currentStatus === REQUEST_STATUS.PENDING_SIGNATURE;
  const hasSigned = !!signedAgreementUrl;
  const canSign = needsSignature && isCustomer && agreementUrl;

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!signaturePadRef.current || !onSign) return;
    
    if (signaturePadRef.current.isEmpty()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dataUrl = signaturePadRef.current.toDataURL('image/png');
      await onSign(dataUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAgreement = async () => {
    if (!onGenerateAgreement) return;
    setIsSubmitting(true);
    try {
      await onGenerateAgreement();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionCard
      title="Agreement & Signature"
      icon={FileSignature}
      variant={needsSignature ? 'highlight' : 'default'}
    >
      {/* Already signed */}
      {hasSigned && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Agreement signed successfully
            </p>
          </div>
          
          {signedAgreementUrl && (
            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={() => window.open(signedAgreementUrl, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Signed Agreement
            </Button>
          )}
        </div>
      )}

      {/* Needs signature - customer view */}
      {canSign && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Please review and sign the loan agreement below
            </p>
          </div>

          {/* View agreement button */}
          {agreementUrl && (
            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={() => window.open(agreementUrl, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              View Loan Agreement (PDF)
            </Button>
          )}

          {/* Signature pad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Signature</label>
            <div className="border rounded-lg bg-white overflow-hidden">
              <SignatureCanvas
                ref={signaturePadRef}
                canvasProps={{
                  className: 'w-full h-40 touch-none',
                  style: { width: '100%', height: '160px' },
                }}
                onBegin={() => setHasDrawn(true)}
                backgroundColor="white"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Draw your signature above using mouse or touch
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSign}
              disabled={!hasDrawn || isSubmitting}
              className="flex-1 min-h-[44px]"
            >
              {isSubmitting ? 'Signing...' : 'Sign Agreement'}
            </Button>
            <Button
              variant="outline"
              onClick={clearSignature}
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Needs signature - no agreement yet */}
      {needsSignature && isCustomer && !agreementUrl && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Generating your loan agreement...
            </p>
          </div>
          
          {onGenerateAgreement && (
            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={handleGenerateAgreement}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Generating...' : 'Generate Agreement'}
            </Button>
          )}
        </div>
      )}

      {/* Non-customer view when signature pending */}
      {needsSignature && !isCustomer && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Awaiting customer signature
          </p>
        </div>
      )}

      {/* Status not requiring signature */}
      {!needsSignature && !hasSigned && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Signature not required at this stage
        </p>
      )}
    </SectionCard>
  );
}

export default SignatureSection;
