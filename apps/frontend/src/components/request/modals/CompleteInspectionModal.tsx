'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CompleteInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasStagedUploads: boolean;
  onSubmit: (note?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CompleteInspectionModal({
  open,
  onOpenChange,
  hasStagedUploads,
  onSubmit,
  isSubmitting = false,
}: CompleteInspectionModalProps) {
  const [note, setNote] = React.useState('');

  const handleClose = () => {
    setNote('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    await onSubmit(note.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Inspection</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add any observations before marking the inspection as complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {hasStagedUploads && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                Inspection photos will be saved with the completion.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inspection-note" className="text-sm font-medium">
              Inspection Notes <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="inspection-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Asset condition verified, minor scratches on back, all documents checked"
              rows={4}
              maxLength={1000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Add any observations from the inspection</span>
              <span>{note.trim().length}/1000</span>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Completing...' : 'Complete Inspection'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
