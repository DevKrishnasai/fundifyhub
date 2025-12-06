/**
 * ActionConfirmDialog Component
 * 
 * Generic confirmation dialog for workflow actions.
 * Supports loading state, custom messages, and optional input.
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface ActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning';
  showNoteInput?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
  isLoading?: boolean;
  onConfirm: (note?: string) => Promise<void> | void;
}

export function ActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  showNoteInput = false,
  noteLabel = 'Note',
  notePlaceholder = 'Add a note (optional)...',
  noteRequired = false,
  isLoading = false,
  onConfirm,
}: ActionConfirmDialogProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (noteRequired && showNoteInput && !note.trim()) {
      setError('Note is required');
      return;
    }

    setError('');
    await onConfirm(showNoteInput ? note.trim() : undefined);
    setNote('');
  };

  const handleCancel = () => {
    setNote('');
    setError('');
    onOpenChange(false);
  };

  const variantStyles = {
    default: {
      icon: null,
      buttonVariant: 'default' as const,
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      buttonVariant: 'default' as const,
    },
    destructive: {
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      buttonVariant: 'destructive' as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {styles.icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {showNoteInput && (
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-note">
              {noteLabel}
              {noteRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id="confirm-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError('');
              }}
              placeholder={notePlaceholder}
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={styles.buttonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage confirm dialog state
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    props: Partial<ActionConfirmDialogProps>;
  }>({
    open: false,
    props: {},
  });

  const confirm = (props: Omit<ActionConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    return new Promise<string | undefined>((resolve) => {
      setState({
        open: true,
        props: {
          ...props,
          onConfirm: async (note) => {
            await props.onConfirm(note);
            setState((prev) => ({ ...prev, open: false }));
            resolve(note);
          },
        },
      });
    });
  };

  const close = () => {
    setState((prev) => ({ ...prev, open: false }));
  };

  return {
    dialogProps: {
      open: state.open,
      onOpenChange: (open: boolean) => setState((prev) => ({ ...prev, open })),
      ...state.props,
    } as ActionConfirmDialogProps,
    confirm,
    close,
  };
}

export default ActionConfirmDialog;
