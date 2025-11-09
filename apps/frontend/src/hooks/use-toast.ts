"use client"

import * as React from "react"

// Delegate to centralized toast helper to keep usage consistent across the app.
// Backwards-compatible: callers that do `const { toast } = useToast()` and then
// call `toast("message")` will still work (mapped to success notifications).
import toast from '@/lib/toast'

export function useToast() {
  return {
    // Keep a function-style entry for backwards compatibility (maps to success)
    toast: (msg: string) => toast.success(String(msg)),
    // Provide more explicit helpers too
    loading: toast.loading,
    success: toast.success,
    error: toast.error,
    dismiss: toast.dismiss,
  }
}