'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

interface RejectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RejectModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: RejectModalProps) {
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
      setError('Please provide a reason for rejection');
      return;
    }

    setError(null);
    await onSubmit(trimmedReason);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Application</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this application. This will be recorded in the application history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Rejection Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the application is being rejected (max 500 characters)"
              rows={4}
              maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>Provide a clear reason that the customer can understand.</div>
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
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? 'Rejecting...' : 'Reject Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
