'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AgentIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueType: 'customer-not-available' | 'agent-not-available';
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function AgentIssueModal({
  open,
  onOpenChange,
  issueType,
  onSubmit,
  isSubmitting = false,
}: AgentIssueModalProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const isCustomerIssue = issueType === 'customer-not-available';
  const title = isCustomerIssue ? 'Customer Not Available' : 'Cannot Complete Inspection';
  const description = isCustomerIssue
    ? 'Provide a short reason why the customer was not available for the inspection.'
    : 'Provide a short reason why you cannot complete the scheduled inspection.';
  const placeholder = isCustomerIssue
    ? 'e.g., Customer not at home / Wrong address / No response at door'
    : 'e.g., Vehicle issue / Road blocked / Emergency situation';

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
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>This note will be visible to admins.</div>
              <div>{reason.trim().length}/500</div>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
