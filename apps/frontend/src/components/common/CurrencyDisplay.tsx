import { cn } from "@/lib/utils"

interface CurrencyDisplayProps {
  /** Amount to display */
  amount: number
  /** Currency code (default: INR) */
  currency?: string
  /** Locale for formatting (default: en-IN) */
  locale?: string
  /** Show positive sign for positive amounts */
  showPositiveSign?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Color variant based on positive/negative */
  colorBySign?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Consistent currency display component with Indian Rupee formatting
 */
export function CurrencyDisplay({
  amount,
  currency = "INR",
  locale = "en-IN",
  showPositiveSign = false,
  size = "md",
  colorBySign = false,
  className,
}: CurrencyDisplayProps) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  const formattedAmount = formatter.format(Math.abs(amount))
  const isPositive = amount > 0
  const isNegative = amount < 0

  const prefix = isNegative ? "-" : showPositiveSign && isPositive ? "+" : ""

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
  }

  const colorClasses = colorBySign
    ? isPositive
      ? "text-green-600 dark:text-green-500"
      : isNegative
        ? "text-red-600 dark:text-red-500"
        : ""
    : ""

  return (
    <span className={cn(sizeClasses[size], colorClasses, "tabular-nums", className)}>
      {prefix}{formattedAmount}
    </span>
  )
}

/**
 * Format currency as a simple string (for use outside of React components)
 */
export function formatCurrency(
  amount: number,
  options?: {
    currency?: string
    locale?: string
    showPositiveSign?: boolean
  }
): string {
  const { currency = "INR", locale = "en-IN", showPositiveSign = false } = options || {}
  
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  const formattedAmount = formatter.format(Math.abs(amount))
  const isPositive = amount > 0
  const isNegative = amount < 0

  const prefix = isNegative ? "-" : showPositiveSign && isPositive ? "+" : ""

  return `${prefix}${formattedAmount}`
}

/**
 * Format large numbers in compact form (e.g., 1.2L, 50K)
 */
export function formatCompactCurrency(
  amount: number,
  options?: {
    currency?: string
    locale?: string
  }
): string {
  const { locale = "en-IN" } = options || {}
  
  const absAmount = Math.abs(amount)
  const prefix = amount < 0 ? "-" : ""

  if (absAmount >= 10000000) {
    return `${prefix}₹${(absAmount / 10000000).toFixed(2)}Cr`
  }
  if (absAmount >= 100000) {
    return `${prefix}₹${(absAmount / 100000).toFixed(2)}L`
  }
  if (absAmount >= 1000) {
    return `${prefix}₹${(absAmount / 1000).toFixed(1)}K`
  }
  
  return formatCurrency(amount, { locale })
}
