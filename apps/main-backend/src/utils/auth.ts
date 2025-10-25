import { randomInt } from 'crypto';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password with bcrypt
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Allow international format with + and numbers
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber) && phoneNumber.length >= 10 && phoneNumber.length <= 15;
}

/**
 * Sanitize phone number (remove spaces, dashes, etc.)
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[\s\-\(\)]/g, '');
}

/**
 * Mask email for display (show first 2 chars and domain)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;
  
  const maskedLocal = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number for display (show first 3 and last 4 digits)
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 10) return phoneNumber;
  
  const cleanPhone = sanitizePhoneNumber(phoneNumber);
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
  }
  
  // For international numbers
  return cleanPhone.replace(/(\d{3})\d+(\d{4})/, '$1****$2');
}

/**
 * Check password strength
 */
export interface PasswordStrength {
  score: number; // 0-4 (weak to strong)
  feedback: string[];
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include lowercase letters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include uppercase letters');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include numbers');
  }

  // Special character check
  if (/[@$!%*?&]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include special characters (@$!%*?&)');
  }

  // Additional length bonus
  if (password.length >= 12) {
    score += 1;
  }

  const isValid = score >= 4 && password.length >= 8;
  
  return {
    score: Math.min(score, 4),
    feedback,
    isValid
  };
}