/**
 * BankDetailsSection Component
 * 
 * Displays and allows editing of customer bank details for loan disbursement.
 * Shows bank account info, UPI ID, and submission status.
 */

'use client';

import React, { useState } from 'react';
import { Building2, CheckCircle, AlertCircle, Pencil, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionCard, SectionRow, SectionGrid } from './SectionCard';
import { REQUEST_STATUS, VALIDATION_PATTERNS } from '@fundifyhub/types';

export interface BankDetails {
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountName?: string | null;
  upiId?: string | null;
}

export interface BankDetailsSectionProps {
  requestId: string;
  currentStatus: REQUEST_STATUS;
  bankDetails: BankDetails;
  isCustomer: boolean;
  onSubmit?: (details: BankDetails) => Promise<void>;
  isLoading?: boolean;
}

export function BankDetailsSection({
  requestId,
  currentStatus,
  bankDetails,
  isCustomer,
  onSubmit,
  isLoading = false,
}: BankDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BankDetails>({
    bankAccountNumber: bankDetails.bankAccountNumber || '',
    bankIfscCode: bankDetails.bankIfscCode || '',
    bankAccountName: bankDetails.bankAccountName || '',
    upiId: bankDetails.upiId || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsBankDetails = [
    REQUEST_STATUS.PENDING_BANK_DETAILS,
    REQUEST_STATUS.TRANSFER_FAILED,
  ].includes(currentStatus);

  const hasSubmittedDetails = currentStatus === REQUEST_STATUS.BANK_DETAILS_SUBMITTED;
  const hasBankDetails = !!(bankDetails.bankAccountNumber || bankDetails.upiId);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // At least bank account OR UPI must be provided
    if (!formData.bankAccountNumber && !formData.upiId) {
      newErrors.general = 'Please provide either bank account or UPI ID';
    }

    // Validate bank account if provided
    if (formData.bankAccountNumber) {
      if (!VALIDATION_PATTERNS.ACCOUNT_NUMBER.test(formData.bankAccountNumber)) {
        newErrors.bankAccountNumber = 'Invalid account number (9-18 digits)';
      }
      if (!formData.bankIfscCode) {
        newErrors.bankIfscCode = 'IFSC code is required with account number';
      } else if (!VALIDATION_PATTERNS.IFSC_CODE.test(formData.bankIfscCode)) {
        newErrors.bankIfscCode = 'Invalid IFSC code format';
      }
      if (!formData.bankAccountName) {
        newErrors.bankAccountName = 'Account holder name is required';
      }
    }

    // Validate UPI if provided
    if (formData.upiId && !VALIDATION_PATTERNS.UPI_ID.test(formData.upiId)) {
      newErrors.upiId = 'Invalid UPI ID format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof BankDetails, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Determine what to show
  const showForm = isEditing || (needsBankDetails && isCustomer && !hasBankDetails);
  const showDetails = hasBankDetails && !isEditing;

  return (
    <SectionCard
      title="Bank Details"
      icon={Building2}
      variant={needsBankDetails ? 'highlight' : 'default'}
      actions={
        showDetails && isCustomer && needsBankDetails ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        ) : null
      }
    >
      {/* Status message */}
      {needsBankDetails && isCustomer && !hasBankDetails && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {currentStatus === REQUEST_STATUS.TRANSFER_FAILED
              ? 'Previous transfer failed. Please update your bank details.'
              : 'Please provide your bank details for loan disbursement.'}
          </p>
        </div>
      )}

      {hasSubmittedDetails && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">
            Bank details submitted. Awaiting disbursement.
          </p>
        </div>
      )}

      {/* Form view */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <p className="text-sm text-red-500">{errors.general}</p>
          )}

          <div className="space-y-4">
            <div className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Bank Account (Optional if UPI provided)
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  value={formData.bankAccountNumber || ''}
                  onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                  placeholder="Enter account number"
                  disabled={isSubmitting}
                />
                {errors.bankAccountNumber && (
                  <p className="text-xs text-red-500">{errors.bankAccountNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankIfscCode">IFSC Code</Label>
                <Input
                  id="bankIfscCode"
                  value={formData.bankIfscCode || ''}
                  onChange={(e) => handleChange('bankIfscCode', e.target.value.toUpperCase())}
                  placeholder="e.g., SBIN0001234"
                  disabled={isSubmitting}
                />
                {errors.bankIfscCode && (
                  <p className="text-xs text-red-500">{errors.bankIfscCode}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Account Holder Name</Label>
              <Input
                id="bankAccountName"
                value={formData.bankAccountName || ''}
                onChange={(e) => handleChange('bankAccountName', e.target.value)}
                placeholder="Name as per bank records"
                disabled={isSubmitting}
              />
              {errors.bankAccountName && (
                <p className="text-xs text-red-500">{errors.bankAccountName}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              UPI ID (Optional if bank account provided)
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                value={formData.upiId || ''}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="e.g., username@upi"
                disabled={isSubmitting}
              />
              {errors.upiId && (
                <p className="text-xs text-red-500">{errors.upiId}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Bank Details'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {/* Display view */}
      {showDetails && (
        <SectionGrid columns={2}>
          {bankDetails.bankAccountNumber && (
            <>
              <SectionRow
                label="Account Number"
                value={`****${bankDetails.bankAccountNumber.slice(-4)}`}
              />
              <SectionRow
                label="IFSC Code"
                value={bankDetails.bankIfscCode || '-'}
              />
              <SectionRow
                label="Account Name"
                value={bankDetails.bankAccountName || '-'}
                className="sm:col-span-2"
              />
            </>
          )}
          {bankDetails.upiId && (
            <SectionRow
              label="UPI ID"
              value={bankDetails.upiId}
              className={bankDetails.bankAccountNumber ? 'sm:col-span-2' : ''}
            />
          )}
        </SectionGrid>
      )}

      {/* No details yet (for non-customers) */}
      {!hasBankDetails && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Bank details not yet provided
        </p>
      )}
    </SectionCard>
  );
}

export default BankDetailsSection;
