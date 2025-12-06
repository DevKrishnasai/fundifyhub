import { toast as sonnerToast } from 'sonner'

/**
 * Toast helper functions for consistent notification experience
 * Uses Sonner for beautiful, customizable toasts with theme support
 */

export const toastLoading = (message = 'Loading...', options?: { id?: string; description?: string }) => {
  return sonnerToast.loading(message, {
    id: options?.id,
    description: options?.description,
  })
}

export const toastSuccess = (message: string, options?: { id?: string; description?: string; duration?: number }) => {
  sonnerToast.success(message, {
    id: options?.id,
    description: options?.description,
    duration: options?.duration ?? 4000,
  })
}

export const toastError = (message: string, options?: { id?: string; description?: string; duration?: number }) => {
  sonnerToast.error(message, {
    id: options?.id,
    description: options?.description,
    duration: options?.duration ?? 5000,
  })
}

export const toastInfo = (message: string, options?: { id?: string; description?: string; duration?: number }) => {
  sonnerToast.info(message, {
    id: options?.id,
    description: options?.description,
    duration: options?.duration ?? 4000,
  })
}

export const toastWarning = (message: string, options?: { id?: string; description?: string; duration?: number }) => {
  sonnerToast.warning(message, {
    id: options?.id,
    description: options?.description,
    duration: options?.duration ?? 4000,
  })
}

export const toastDismiss = (id?: string | number) => sonnerToast.dismiss(id)

/**
 * Promise-based toast for async operations
 * Shows loading, success, or error based on promise resolution
 */
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((err: Error) => string)
  }
) => {
  return sonnerToast.promise(promise, messages)
}

/**
 * Custom toast with action button
 */
export const toastAction = (
  message: string,
  options: {
    description?: string
    action?: {
      label: string
      onClick: () => void
    }
    cancel?: {
      label: string
      onClick?: () => void
    }
    duration?: number
  }
) => {
  sonnerToast(message, {
    description: options.description,
    action: options.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
    cancel: options.cancel ? {
      label: options.cancel.label,
      onClick: options.cancel.onClick ?? (() => {}),
    } : undefined,
    duration: options.duration ?? 6000,
  })
}

const toastHelpers = {
  loading: toastLoading,
  success: toastSuccess,
  error: toastError,
  info: toastInfo,
  warning: toastWarning,
  dismiss: toastDismiss,
  promise: toastPromise,
  action: toastAction,
}

export default toastHelpers
