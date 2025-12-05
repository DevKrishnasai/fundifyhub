/**
 * Phone number utilities
 * 
 * Provides validation and sanitization for phone numbers
 * following E.164 international format (up to 15 digits).
 * 
 * @module utils/phone
 */

import { phoneSchema } from '@fundifyhub/types'

/**
 * Sanitize a phone number by removing all non-digit characters
 * 
 * @param input - Raw phone number string (may contain spaces, dashes, parentheses)
 * @returns Cleaned phone number with only digits (max 15 characters for E.164)
 * 
 * @example
 * ```ts
 * sanitizePhone('+91 98765-43210') // '919876543210'
 * sanitizePhone('(555) 123-4567')  // '5551234567'
 * ```
 */
export function sanitizePhone(input: string): string {
  // Preserve international numbers up to 15 digits (E.164)
  return input.replace(/\D/g, '').slice(0, 15)
}

/**
 * Validate if a phone number is valid according to the app's phone schema
 * 
 * Uses Zod schema validation to check if the sanitized phone number
 * meets the required format (10-15 digits).
 * 
 * @param input - Phone number string to validate
 * @returns `true` if valid, `false` otherwise
 * 
 * @example
 * ```ts
 * isValidPhone('9876543210')       // true (10 digits)
 * isValidPhone('+919876543210')    // true (12 digits with country code)
 * isValidPhone('123')              // false (too short)
 * ```
 */
export function isValidPhone(input: string): boolean {
  const cleaned = sanitizePhone(input)
  const res = phoneSchema.safeParse(cleaned)
  return res.success
}

export default { sanitizePhone, isValidPhone }
