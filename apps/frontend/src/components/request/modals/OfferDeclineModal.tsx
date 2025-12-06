'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface OfferDeclineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function OfferDeclineModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: OfferDeclineModalProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError('Please provide a reason for declining the offer');
      return;
    }

    setError(null);
    await onSubmit(trimmedReason);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Offer</DialogTitle>
          <DialogDescription>
            Please provide a brief reason for declining the offer. This will help the admin review your feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are declining the offer (max 500 characters)"
              rows={4}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>Provide a short reason that helps the admin understand the issue.</div>
              <div>{reason.trim().length}/500</div>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} variant="destructive">
              {isSubmitting ? 'Submitting...' : 'Decline Offer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
