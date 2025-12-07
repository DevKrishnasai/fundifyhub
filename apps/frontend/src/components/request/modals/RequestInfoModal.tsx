'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

interface RequestInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RequestInfoModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: RequestInfoModalProps) {
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const isValid = note.trim().length >= 10 && note.trim().length <= CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX;

  const handleClose = () => {
    setNote('');
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmedNote = note.trim();

    if (trimmedNote.length < 10) {
      setError('Please provide at least 10 characters');
      return;
    }

    setError(null);
    await onSubmit(trimmedNote);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Additional Information</DialogTitle>
          <DialogDescription>
            Specify what information or documents you need from the customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Additional Note (required)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you need from the customer (max 500 characters)"
              rows={4}
              maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>Provide a short note for the customer explaining what you need.</div>
              <div>{note.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="w-full"
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
