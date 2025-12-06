"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/common/StatusBadge"
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay"
import { DateDisplay } from "@/components/common/DateDisplay"
import { cn } from "@/lib/utils"
import { 
  Calendar, 
  ArrowRight,
  CreditCard,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react"
import type { LoanType } from "@fundifyhub/types"

interface LoanCardProps {
  /** Loan data */
  loan: LoanType
  /** Variant: compact for dashboard lists, full for main list */
  variant?: "compact" | "full"
  /** Link destination */
  href?: string
  /** Show action button */
  showAction?: boolean
  /** Custom action text */
  actionText?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Card component for displaying loan summaries
 */
export function LoanCard({
  loan,
  variant = "full",
  href,
  showAction = true,
  actionText = "View Details",
  className,
}: LoanCardProps) {
  const isCompact = variant === "compact"
  
  // Calculate progress percentage
  const progressPercent = loan.tenureMonths > 0 
    ? Math.round((loan.paidEMIs / loan.tenureMonths) * 100) 
    : 0

  const content = (
    <Card className={cn(
      "transition-colors hover:bg-accent/50",
      href && "cursor-pointer",
      className
    )}>
      <CardContent className={cn("p-4", isCompact && "p-3")}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Main Info */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "font-semibold truncate",
                isCompact ? "text-sm" : "text-base"
              )}>
                {loan.loanNumber || `LOAN-${loan.id.slice(0, 8)}`}
              </span>
              <StatusBadge status={loan.status} type="loan" />
              {loan.overdueEMIs > 0 && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{loan.overdueEMIs} overdue</span>
                </div>
              )}
            </div>

            {/* Amount Info */}
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <div className="flex items-center gap-1.5">
                <CircleDollarSign className="w-3.5 h-3.5" />
                <CurrencyDisplay 
                  amount={loan.approvedAmount} 
                  size="sm"
                  className="font-medium text-foreground"
                />
              </div>
              <span className="text-sm">•</span>
              <span className={cn(isCompact ? "text-xs" : "text-sm")}>
                {loan.interestRate}% p.a.
              </span>
              <span className="text-sm">•</span>
              <span className={cn(isCompact ? "text-xs" : "text-sm")}>
                {loan.tenureMonths} months
              </span>
            </div>

            {/* Progress */}
            {!isCompact && (
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {loan.paidEMIs} of {loan.tenureMonths} EMIs paid
                  </span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}

            {/* EMI & Next Payment */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                <span className={cn(isCompact ? "text-xs" : "text-sm")}>
                  EMI: <CurrencyDisplay amount={loan.emiAmount} size="sm" />
                </span>
              </div>
              {loan.firstEMIDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className={cn(isCompact ? "text-xs" : "text-sm")}>
                    Started: <DateDisplay date={loan.firstEMIDate} format="short" />
                  </span>
                </div>
              )}
            </div>

            {/* Full variant: Remaining amount */}
            {!isCompact && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Remaining: <CurrencyDisplay 
                    amount={loan.remainingAmount} 
                    size="sm"
                    className="text-foreground font-medium"
                  />
                </span>
                {loan.totalPaidAmount > 0 && (
                  <span>
                    Paid: <CurrencyDisplay 
                      amount={loan.totalPaidAmount} 
                      size="sm"
                      className="text-green-600 dark:text-green-500"
                    />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Action */}
          {showAction && !isCompact && (
            <Button variant="ghost" size="sm" className="shrink-0">
              {actionText}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {showAction && isCompact && (
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

interface LoanCardListProps {
  /** List of loans */
  loans: LoanType[]
  /** Variant for all cards */
  variant?: "compact" | "full"
  /** Base URL for loan links */
  baseUrl?: string
  /** Empty state message */
  emptyMessage?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * List of LoanCard components
 */
export function LoanCardList({
  loans,
  variant = "full",
  baseUrl = "/loans",
  emptyMessage = "No loans found",
  className,
}: LoanCardListProps) {
  if (loans.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {loans.map((loan) => (
        <LoanCard
          key={loan.id}
          loan={loan}
          variant={variant}
          href={`${baseUrl}/${loan.id}`}
        />
      ))}
    </div>
  )
}
