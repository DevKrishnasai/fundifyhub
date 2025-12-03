"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  /** Dialog title */
  title: string
  /** Dialog description */
  description: string
  /** Trigger element (button or other clickable) */
  trigger?: React.ReactNode
  /** Action button label */
  actionLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Variant for styling */
  variant?: "default" | "destructive"
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>
  /** Callback when cancelled */
  onCancel?: () => void
  /** Controlled open state */
  open?: boolean
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void
  /** Disable the action button */
  disabled?: boolean
}

/**
 * Reusable confirmation dialog for dangerous actions
 */
export function ConfirmDialog({
  title,
  description,
  trigger,
  actionLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  open,
  onOpenChange,
  disabled = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const handleConfirm = async () => {
    try {
      setIsLoading(true)
      await onConfirm()
      setIsOpen?.(false)
    } catch {
      // Error handling is responsibility of the caller
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    setIsOpen?.(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={disabled || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook for programmatic confirm dialog
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm"> & { onConfirm?: () => void | Promise<void> }>({
    title: "",
    description: "",
  })

  const confirm = (options: Omit<ConfirmDialogProps, "open" | "onOpenChange">) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...options,
        onConfirm: async () => {
          await options.onConfirm()
          resolve(true)
        },
        onCancel: () => {
          options.onCancel?.()
          resolve(false)
        },
      })
      setIsOpen(true)
    })
  }

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      {...config}
      onConfirm={config.onConfirm || (() => {})}
      open={isOpen}
      onOpenChange={setIsOpen}
    />
  )

  return { confirm, ConfirmDialogComponent }
}
