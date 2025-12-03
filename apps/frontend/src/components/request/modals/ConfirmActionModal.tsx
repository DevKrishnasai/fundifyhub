'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
  /** If true, closes the modal immediately on confirm without waiting for the action to complete */
  closeImmediately?: boolean;
}

export function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isSubmitting = false,
  closeImmediately = true,
}: ConfirmActionModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  const handleClose = () => {
    if (!isConfirming) {
      onOpenChange(false);
    }
  };

  const handleConfirm = async () => {
    if (closeImmediately) {
      // Close immediately and execute action in background
      onOpenChange(false);
      await onConfirm();
    } else {
      // Show loading state while executing
      setIsConfirming(true);
      try {
        await onConfirm();
        onOpenChange(false);
      } finally {
        setIsConfirming(false);
      }
    }
  };

  const loading = closeImmediately ? false : (isSubmitting || isConfirming);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {message && <DialogDescription>{message}</DialogDescription>}
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={variant}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
