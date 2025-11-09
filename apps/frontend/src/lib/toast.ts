import { toast as hotToast } from 'react-hot-toast'

export const toastLoading = (message = 'Loading...') => {
  return hotToast.loading(message)
}

export const toastSuccess = (message: string, id?: string) => {
  if (id) hotToast.success(message, { id })
  else hotToast.success(message)
}

export const toastError = (message: string, id?: string) => {
  if (id) hotToast.error(message, { id })
  else hotToast.error(message)
}

export const toastDismiss = (id?: string) => hotToast.dismiss(id)

export default {
  loading: toastLoading,
  success: toastSuccess,
  error: toastError,
  dismiss: toastDismiss,
}
