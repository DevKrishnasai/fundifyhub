import { cn } from "@/lib/utils"

type DateFormat = "short" | "medium" | "long" | "relative" | "time" | "datetime"

interface DateDisplayProps {
  /** Date to display */
  date: Date | string | number
  /** Format variant */
  format?: DateFormat
  /** Locale for formatting (default: en-IN) */
  locale?: string
  /** Show time along with date */
  showTime?: boolean
  /** Additional CSS classes */
  className?: string
}

const formatOptions: Record<DateFormat, Intl.DateTimeFormatOptions> = {
  short: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
  medium: {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
  long: {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  },
  time: {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  },
  datetime: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  },
  relative: {},
}

/**
 * Consistent date display component
 */
export function DateDisplay({
  date,
  format = "medium",
  locale = "en-IN",
  showTime = false,
  className,
}: DateDisplayProps) {
  const dateObj = date instanceof Date ? date : new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return <span className={cn("text-muted-foreground", className)}>Invalid date</span>
  }

  if (format === "relative") {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {formatRelativeTime(dateObj)}
      </span>
    )
  }

  let options = { ...formatOptions[format] }
  
  if (showTime && format !== "time" && format !== "datetime") {
    options = {
      ...options,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  }

  const formatter = new Intl.DateTimeFormat(locale, options)
  
  return (
    <time 
      dateTime={dateObj.toISOString()} 
      className={cn(className)}
    >
      {formatter.format(dateObj)}
    </time>
  )
}

/**
 * Format date relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = dateObj.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffSeconds / 60)
  const diffHours = Math.round(diffMinutes / 60)
  const diffDays = Math.round(diffHours / 24)
  const diffWeeks = Math.round(diffDays / 7)
  const diffMonths = Math.round(diffDays / 30)
  const diffYears = Math.round(diffDays / 365)

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(diffSeconds, "second")
  }
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute")
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour")
  }
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day")
  }
  if (Math.abs(diffWeeks) < 4) {
    return rtf.format(diffWeeks, "week")
  }
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month")
  }
  return rtf.format(diffYears, "year")
}

/**
 * Format date as a simple string (for use outside of React components)
 */
export function formatDate(
  date: Date | string | number,
  format: DateFormat = "medium",
  locale = "en-IN"
): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }

  if (format === "relative") {
    return formatRelativeTime(dateObj)
  }

  const formatter = new Intl.DateTimeFormat(locale, formatOptions[format])
  return formatter.format(dateObj)
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date)
  const today = new Date()
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date)
  return dateObj.getTime() < Date.now()
}

/**
 * Check if date is overdue (past and not today)
 */
export function isOverdue(date: Date | string | number): boolean {
  return isPast(date) && !isToday(date)
}
