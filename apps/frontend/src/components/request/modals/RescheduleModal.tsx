'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string, preferredDate?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RescheduleModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: RescheduleModalProps) {
  const [reason, setReason] = React.useState('');
  const [preferredDate, setPreferredDate] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    setReason('');
    setPreferredDate('');
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError('Please provide a reason for rescheduling');
      return;
    }

    setError(null);
    await onSubmit(trimmedReason, preferredDate || undefined);
  };

  // Get tomorrow's date for min value
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Reschedule</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Provide a reason and optionally suggest a new date for the inspection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for Rescheduling <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., not available on scheduled date, personal emergency"
              rows={3}
              maxLength={500}
              className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{error && <span className="text-destructive">{error}</span>}</span>
              <span>{reason.trim().length}/500</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred-date" className="text-sm font-medium">
              Preferred Date <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="preferred-date"
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={minDateStr}
            />
            <p className="text-xs text-muted-foreground">
              Suggest a date that works better for you.
            </p>
          </div>

          <div className="flex items-center gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? 'Submitting...' : 'Request Reschedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
