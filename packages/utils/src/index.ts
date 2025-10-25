export { SERVICE_ACTIONS } from './queue-names';
import type { ApiResponse } from "@fundifyhub/types";



// Format currency amount
export function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount);
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Create API response
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    message,
    error,
  };
}

// Delay function for testing
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Format date
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>\"'&]/g, "");
}

// Export environment configuration
export { appConfig, validateConfig, type AppConfig } from "./env";

// Queue utilities (shared producer) - lightweight wrapper using BullMQ
export { enqueue, closeAllQueues } from './queue';

// Shared queue/job name constants and defaults
export { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS, CONNECTION_STATUS } from './queue-names';

// Shared templates for emails/whatsapp
export { EMAIL_TEMPLATES, WHATSAPP_TEMPLATES } from './templates';
