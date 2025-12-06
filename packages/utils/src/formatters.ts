/**
 * Formatters - Safe for browser and Node.js
 *
 * Functions to format data for display and logging.
 * No I/O or external dependencies.
 */

/**
 * Format currency amount
 *
 * @example
 * formatCurrency(50000) => "₹50,000.00"
 * formatCurrency(50000, 'USD') => "$50,000.00"
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
}

/**
 * Format date
 *
 * @example
 * formatDate(new Date('2024-01-15')) => "15 Jan 2024"
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : format === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

  return new Intl.DateTimeFormat('en-IN', options).format(d);
}

/**
 * Format datetime with time
 *
 * @example
 * formatDateTime(new Date('2024-01-15T14:30:00')) => "15 Jan 2024, 2:30 PM"
 */
export function formatDateTime(
  date: Date | string,
  includeSeconds: boolean = false
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
    hour12: true,
  };

  const datePart = new Intl.DateTimeFormat('en-IN', dateOptions).format(d);
  const timePart = new Intl.DateTimeFormat('en-IN', timeOptions).format(d);

  return `${datePart}, ${timePart}`;
}

/**
 * Format percentage
 *
 * @example
 * formatPercentage(0.125) => "12.5%"
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format phone number
 *
 * @example
 * formatPhoneNumber('919876543210') => "+91 9876 543210"
 * formatPhoneNumber('9876543210') => "98765 43210"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const country = cleaned.substring(0, 2);
    const area = cleaned.substring(2, 5);
    const first = cleaned.substring(5, 9);
    const last = cleaned.substring(9);
    return `+${country} ${area} ${first} ${last}`;
  }

  if (cleaned.length === 10) {
    const first = cleaned.substring(0, 5);
    const second = cleaned.substring(5);
    return `${first} ${second}`;
  }

  return phone;
}

/**
 * Format large numbers with abbreviations
 *
 * @example
 * formatNumber(1500) => "1.5K"
 * formatNumber(1500000) => "1.5M"
 */
export function formatNumber(num: number, decimals: number = 1): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }
  return num.toString();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format name: "firstName lastName"
 */
export function formatName(firstName: string, lastName?: string): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

/**
 * Format address: "street, city, state, pincode"
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  const parts = [address.street, address.city, address.state, address.pincode].filter(Boolean);
  return parts.join(', ');
}
