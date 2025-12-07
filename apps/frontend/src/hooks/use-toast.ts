"use client"

import toast from '@/lib/toast'

/**
 * Hook for toast notifications using Sonner
 * Provides consistent API across the application
 */
export function useToast() {
  return {
    toast: (msg: string) => toast.success(String(msg)),
    loading: toast.loading,
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    dismiss: toast.dismiss,
    promise: toast.promise,
    action: toast.action,
  }
}