/**
 * Phone number formatting utilities for consistent handling across the app
 */

/**
 * Format phone number for Indian numbers - adds +91 country code if missing
 * @param phoneNumber - Raw phone number input
 * @returns Formatted phone number with country code
 */
export function formatIndianPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different Indian number formats
  if (cleaned.length === 10) {
    // Standard 10-digit Indian number without country code
    cleaned = '91' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    // Numbers like 09299998626 (remove leading 0 and add 91)
    cleaned = '91' + cleaned.substring(1);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Already has Indian country code
    // Keep as is
  } else if (cleaned.length === 13 && cleaned.startsWith('911')) {
    // Handle cases like 9119299998626 (remove extra 1)
    cleaned = cleaned.substring(1);
  } else if (cleaned.length < 10) {
    throw new Error(`Invalid phone number: too short (${cleaned.length} digits)`);
  } else if (cleaned.length > 13) {
    throw new Error(`Invalid phone number: too long (${cleaned.length} digits)`);
  }
  
  // Final validation
  if (cleaned.length !== 12 || !cleaned.startsWith('91')) {
    throw new Error(`Invalid Indian phone number format: ${phoneNumber} -> ${cleaned}`);
  }
  
  return cleaned;
}

/**
 * Format phone number for display with country code
 * @param phoneNumber - Formatted phone number (12 digits starting with 91)
 * @returns Display format like +91 92999 98626
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const countryCode = cleaned.substring(0, 2);
    const firstPart = cleaned.substring(2, 7);
    const secondPart = cleaned.substring(7);
    return `+${countryCode} ${firstPart} ${secondPart}`;
  }
  
  return phoneNumber; // Return as-is if not standard format
}

/**
 * Format phone number for WhatsApp (no spaces, no plus)
 * @param phoneNumber - Raw phone number input
 * @returns WhatsApp-compatible format like 919299998626
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  return formatIndianPhoneNumber(phoneNumber);
}

/**
 * Format phone number for database storage (with + prefix)
 * @param phoneNumber - Raw phone number input  
 * @returns Database format like +919299998626
 */
export function formatPhoneForDatabase(phoneNumber: string): string {
  const formatted = formatIndianPhoneNumber(phoneNumber);
  return `+${formatted}`;
}