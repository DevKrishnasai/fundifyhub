'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CLIENT_CONSTANTS } from '@fundifyhub/types';

interface ApproveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ApproveModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: ApproveModalProps) {
  const [note, setNote] = React.useState('');

  const handleClose = () => {
    setNote('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const trimmedNote = note.trim();
    await onSubmit(trimmedNote || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Application</DialogTitle>
          <DialogDescription>
            Optionally add a note for the approval. This will be recorded in the application history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Approval Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any comments about the approval (optional)"
              rows={4}
              maxLength={CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}
            />
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <div>Optional note for audit and customer communication.</div>
              <div>{note.trim().length}/{CLIENT_CONSTANTS.MORE_INFO_NOTE_MAX}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Approving...' : 'Approve Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
