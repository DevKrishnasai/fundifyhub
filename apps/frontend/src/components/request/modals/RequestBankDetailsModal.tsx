'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

interface BankDetails {
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountName?: string | null;
  upiId?: string | null;
}

interface RequestBankDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBankDetails?: BankDetails;
  onSubmit: (note: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RequestBankDetailsModal({
  open,
  onOpenChange,
  currentBankDetails,
  onSubmit,
  isSubmitting = false,
}: RequestBankDetailsModalProps) {
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const hasBankDetails =
    currentBankDetails?.accountNumber ||
    currentBankDetails?.ifscCode ||
    currentBankDetails?.accountName ||
    currentBankDetails?.upiId;

  const isValid = note.trim().length >= 10 && note.trim().length <= CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX;

  const handleClose = () => {
    setNote('');
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmedNote = note.trim();

    if (trimmedNote.length < 10) {
      setError('Please provide at least 10 characters explaining what needs correction');
      return;
    }

    setError(null);
    await onSubmit(trimmedNote);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Bank Details Correction</DialogTitle>
          <DialogDescription>
            Ask the customer to resubmit their bank account details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Show existing bank details if available */}
          {hasBankDetails && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                Currently Submitted Bank Details:
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {currentBankDetails?.accountName && (
                  <div>
                    <span className="text-muted-foreground">Account Holder:</span>
                    <p className="font-medium">{currentBankDetails.accountName}</p>
                  </div>
                )}
                {currentBankDetails?.accountNumber && (
                  <div>
                    <span className="text-muted-foreground">Account Number:</span>
                    <p className="font-mono font-medium">{currentBankDetails.accountNumber}</p>
                  </div>
                )}
                {currentBankDetails?.ifscCode && (
                  <div>
                    <span className="text-muted-foreground">IFSC Code:</span>
                    <p className="font-mono font-medium">{currentBankDetails.ifscCode}</p>
                  </div>
                )}
                {currentBankDetails?.upiId && (
                  <div>
                    <span className="text-muted-foreground">UPI ID:</span>
                    <p className="font-mono font-medium">{currentBankDetails.upiId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Note for Customer (required)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain what needs to be corrected in the bank details (max 500 characters)"
              rows={4}
              maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>Provide a clear note explaining what bank details need correction.</div>
              <div>{note.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="w-full"
          >
            {isSubmitting ? 'Sending...' : 'Request Resubmission'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
