'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BankDetailsFormData {
  accountNumber: string;
  ifscCode: string;
  accountName: string;
  upiId: string;
}

interface BankValidationErrors {
  accountNumber?: string;
  ifscCode?: string;
  accountName?: string;
  upiId?: string;
}

interface BankDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<BankDetailsFormData>;
  onSubmit: (data: BankDetailsFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const VALIDATION_PATTERNS = {
  accountNumber: /^\d{9,18}$/,
  ifscCode: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  accountName: /^[a-zA-Z\s.'-]{2,100}$/,
  upiId: /^[\w.-]+@[\w.-]+$/,
};

export function BankDetailsModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting = false,
}: BankDetailsModalProps) {
  const [formData, setFormData] = React.useState<BankDetailsFormData>({
    accountNumber: initialData?.accountNumber || '',
    ifscCode: initialData?.ifscCode || '',
    accountName: initialData?.accountName || '',
    upiId: initialData?.upiId || '',
  });

  const [errors, setErrors] = React.useState<BankValidationErrors>({});

  React.useEffect(() => {
    if (open && initialData) {
      setFormData({
        accountNumber: initialData.accountNumber || '',
        ifscCode: initialData.ifscCode || '',
        accountName: initialData.accountName || '',
        upiId: initialData.upiId || '',
      });
      setErrors({});
    }
  }, [open, initialData]);

  const handleClose = () => {
    setFormData({ accountNumber: '', ifscCode: '', accountName: '', upiId: '' });
    setErrors({});
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    const newErrors: BankValidationErrors = {};

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!VALIDATION_PATTERNS.accountNumber.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = 'Account number must be 9-18 digits';
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!VALIDATION_PATTERNS.ifscCode.test(formData.ifscCode.trim().toUpperCase())) {
      newErrors.ifscCode = 'Invalid IFSC code format (e.g., SBIN0001234)';
    }

    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account holder name is required';
    } else if (!VALIDATION_PATTERNS.accountName.test(formData.accountName.trim())) {
      newErrors.accountName = 'Invalid name format';
    }

    if (formData.upiId.trim() && !VALIDATION_PATTERNS.upiId.test(formData.upiId.trim())) {
      newErrors.upiId = 'Invalid UPI ID format (e.g., name@upi)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    await onSubmit({
      accountNumber: formData.accountNumber.trim(),
      ifscCode: formData.ifscCode.trim().toUpperCase(),
      accountName: formData.accountName.trim(),
      upiId: formData.upiId.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bank Account Details</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter your bank details for loan disbursement. Ensure all information is accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-number" className="text-sm font-medium">
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account-number"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="Enter 9-18 digit account number"
                className={errors.accountNumber ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.accountNumber && (
                <p className="text-xs text-destructive">{errors.accountNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifsc-code" className="text-sm font-medium">
                IFSC Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ifsc-code"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                placeholder="e.g., SBIN0001234"
                className={errors.ifscCode ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.ifscCode && (
                <p className="text-xs text-destructive">{errors.ifscCode}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name" className="text-sm font-medium">
              Account Holder Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account-name"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="Name as per bank records"
              className={errors.accountName ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.accountName && (
              <p className="text-xs text-destructive">{errors.accountName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="upi-id" className="text-sm font-medium">
              UPI ID <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="upi-id"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              placeholder="e.g., yourname@upi"
              className={errors.upiId ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.upiId && (
              <p className="text-xs text-destructive">{errors.upiId}</p>
            )}
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Details'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
