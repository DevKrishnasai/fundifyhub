"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  REQUEST_STATUS, 
  REQUEST_STATUS_COLORS, 
  REQUEST_STATUS_LABELS,
  REQUEST_STAGE,
  STAGE_LABELS,
  STAGE_COLORS,
  SUB_STATUS_DISPLAY,
  LOAN_STATUS,
  EMI_STATUS,
  PAYMENT_STATUS,
} from "@fundifyhub/types"

interface StatusBadgeProps {
  /** The status value - can be stage, stage:subStatus, or legacy status */
  status: string
  /** Optional sub-status for stage-based display */
  subStatus?: string | null
  type?: "request" | "loan" | "emi" | "payment"
  size?: "sm" | "default"
  className?: string
  showIcon?: boolean
}

/**
 * Consistent status badge component
 * 
 * Supports both:
 * - Stage-based: REQUEST_STAGE (10 values) with optional subStatus
 * - Legacy: REQUEST_STATUS (28 values) for backward compatibility
 */
export function StatusBadge({ status, subStatus, type = "request", size = "default", className, showIcon = false }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "";
  
  // Handle request type with stage-based or legacy status
  if (type === "request") {
    // Check if it's a stage (new system)
    if (status in REQUEST_STAGE || Object.values(REQUEST_STAGE).includes(status as REQUEST_STAGE)) {
      const stage = status as REQUEST_STAGE;
      const colors = STAGE_COLORS[stage];
      
      // If we have a subStatus, try to get a more specific label
      let label = STAGE_LABELS[stage];
      if (subStatus) {
        const displayKey = `${stage}:${subStatus}`;
        const subStatusConfig = SUB_STATUS_DISPLAY[displayKey];
        if (subStatusConfig) {
          label = subStatusConfig.label;
        }
      }
      
      return (
        <Badge
          variant="outline"
          className={cn(colors.bg, colors.text, colors.border, "border", sizeClasses, className)}
        >
          {label}
        </Badge>
      );
    }
    
    // Legacy status support
    if (status in REQUEST_STATUS_COLORS) {
      const colors = REQUEST_STATUS_COLORS[status as REQUEST_STATUS]
      const label = REQUEST_STATUS_LABELS[status as REQUEST_STATUS] || status.replace(/_/g, " ")
      
      return (
        <Badge
          variant="outline"
          className={cn(colors.bg, colors.text, colors.border, "border", sizeClasses, className)}
        >
          {label}
        </Badge>
      )
    }
  }

  // Loan status colors
  if (type === "loan") {
    const loanColors = {
      [LOAN_STATUS.ACTIVE]: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
      [LOAN_STATUS.COMPLETED]: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
      [LOAN_STATUS.DEFAULTED]: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
    }
    
    const colors = loanColors[status as LOAN_STATUS] || { bg: "bg-muted", text: "text-muted-foreground" }
    
    return (
      <Badge
        variant="outline"
        className={cn(colors.bg, colors.text, "border-transparent", sizeClasses, className)}
      >
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  // EMI status colors
  if (type === "emi") {
    const emiColors = {
      [EMI_STATUS.PENDING]: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
      [EMI_STATUS.PAID]: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
      [EMI_STATUS.OVERDUE]: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
      [EMI_STATUS.DEFAULTED]: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
    }
    
    const colors = emiColors[status as EMI_STATUS] || { bg: "bg-muted", text: "text-muted-foreground" }
    
    return (
      <Badge
        variant="outline"
        className={cn(colors.bg, colors.text, "border-transparent", sizeClasses, className)}
      >
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  // Payment status colors
  if (type === "payment") {
    const paymentColors = {
      [PAYMENT_STATUS.PENDING]: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
      [PAYMENT_STATUS.SUCCESS]: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
      [PAYMENT_STATUS.FAILED]: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
      [PAYMENT_STATUS.REFUNDED]: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
    }
    
    const colors = paymentColors[status as PAYMENT_STATUS] || { bg: "bg-muted", text: "text-muted-foreground" }
    
    return (
      <Badge
        variant="outline"
        className={cn(colors.bg, colors.text, "border-transparent", sizeClasses, className)}
      >
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  // Default fallback
  return (
    <Badge variant="secondary" className={cn(sizeClasses, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
