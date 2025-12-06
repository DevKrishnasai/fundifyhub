'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

interface GenericReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
  title: string;
  description: string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function GenericReasonModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  title,
  description,
  label = 'Reason',
  placeholder = 'Enter details here...',
  submitLabel = 'Submit',
  variant = 'default',
}: GenericReasonModalProps) {
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
      setError('This field is required');
      return;
    }

    setError(null);
    await onSubmit(trimmedReason);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reason-input" className="text-sm font-medium">
              {label} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              rows={4}
              maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX || 500}
              className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{error && <span className="text-destructive">{error}</span>}</span>
              <span>{reason.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX || 500}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              variant={variant}
            >
              {isSubmitting ? 'Processing...' : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
