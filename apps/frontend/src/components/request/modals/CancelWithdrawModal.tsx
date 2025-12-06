'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

interface CancelWithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CancelWithdrawModal({
  open,
  onOpenChange,
  isAdmin,
  onSubmit,
  isSubmitting = false,
}: CancelWithdrawModalProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const title = isAdmin ? 'Cancel Request' : 'Withdraw Request';
  const description = isAdmin
    ? 'Provide a reason for cancelling this request. This will be recorded in the application history.'
    : 'Please provide a brief reason for withdrawing your request. This helps our team understand why.';
  const placeholder = isAdmin
    ? 'Explain why the request is being closed (max 500 characters)'
    : 'Explain why you are withdrawing the request (max 500 characters)';
  const submitLabel = isAdmin ? 'Cancel Request' : 'Withdraw Request';
  const submittingLabel = isAdmin ? 'Cancelling...' : 'Withdrawing...';

  const handleClose = () => {
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError('Please provide a reason');
      return;
    }

    setError(null);
    await onSubmit(trimmedReason);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              rows={4}
              maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>
                {isAdmin
                  ? 'Provide a clear reason that the customer can understand.'
                  : 'Provide a short reason to help the admin.'}
              </div>
              <div>{reason.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || reason.trim().length === 0}
              variant="destructive"
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
