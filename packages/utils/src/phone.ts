import { phoneSchema } from '@fundifyhub/types'

export function sanitizePhone(input: string) {
  // Preserve international numbers up to 15 digits (E.164)
  return input.replace(/\D/g, '').slice(0, 15)
}

export function isValidPhone(input: string) {
  const cleaned = sanitizePhone(input)
  const res = phoneSchema.safeParse(cleaned)
  return res.success
}

export default { sanitizePhone, isValidPhone }
