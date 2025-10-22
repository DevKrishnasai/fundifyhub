import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  ENDPOINTS: {
    ADMIN: {
      SERVICES_CONFIG: '/api/v1/admin/services/config',
      WHATSAPP_QR: '/api/v1/admin/services/whatsapp/qr',
      WHATSAPP_STATUS: '/api/v1/admin/services/whatsapp/status',
      EMAIL_STATUS: '/api/v1/admin/services/email/status',
      EMAIL_TEST: '/api/v1/admin/services/email/test',
      EMAIL_TEST_CONNECT: '/api/v1/admin/services/email/test-connect',
    }
  }
}

export const apiUrl = (path: string) => {
  const url = `${API_CONFIG.BASE_URL}${path}`
  console.log('API URL:', url) // Debug log
  return url
}
