"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/StatusBadge"
import { CurrencyDisplay } from "@/components/common/CurrencyDisplay"
import { DateDisplay } from "@/components/common/DateDisplay"
import { cn } from "@/lib/utils"
import { 
  Calendar, 
  MapPin, 
  ArrowRight,
  Package,
  Clock,
  IndianRupee,
  User
} from "lucide-react"
import type { RequestType } from "@fundifyhub/types"
import { getDistrictName } from "@/lib/type-guards"

interface RequestCardProps {
  /** Request data */
  request: RequestType
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
 * Card component for displaying loan request summaries
 */
export function RequestCard({
  request,
  variant = "full",
  href,
  showAction = true,
  actionText = "View Details",
  className,
}: RequestCardProps) {
  const isCompact = variant === "compact"
  
  // Get border color based on stage (new system) or fallback to currentStatus (legacy)
  const stage = request.stage || '';
  const getBorderColor = () => {
    switch (stage) {
      case 'DRAFT':
      case 'REVIEW':
        return 'border-l-yellow-500';
      case 'OFFER':
        return 'border-l-indigo-500';
      case 'INSPECTION':
        return 'border-l-purple-500';
      case 'DOCUMENTATION':
        return 'border-l-violet-500';
      case 'DISBURSEMENT':
        return 'border-l-cyan-500';
      case 'ACTIVE':
        return 'border-l-green-500';
      case 'COMPLETED':
        return 'border-l-emerald-500';
      case 'REJECTED':
      case 'CANCELLED':
        return 'border-l-red-500';
      default:
        return 'border-l-muted-foreground';
    }
  };

  const content = (
    <Card className={cn(
      "group transition-all duration-200 hover:shadow-md border-l-4",
      getBorderColor(),
      href && "cursor-pointer hover:bg-accent/30",
      className
    )}>
      <CardContent className={cn("p-4", isCompact && "p-3")}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          {!isCompact && (
            <div className="hidden sm:flex h-12 w-12 rounded-lg bg-primary/10 items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-primary" />
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "font-semibold truncate",
                  isCompact ? "text-sm" : "text-base"
                )}>
                  {request.requestNumber || `REQ-${request.id.slice(0, 8)}`}
                </span>
                <StatusBadge status={request.currentStatus} type="request" />
              </div>
              
              {/* Action - Full variant */}
              {showAction && !isCompact && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {actionText}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              
              {/* Action - Compact variant */}
              {showAction && isCompact && (
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
              )}
            </div>

            {/* Asset Info */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className={cn("truncate", isCompact ? "text-xs" : "text-sm")}>
                {request.asset?.brand || 'N/A'} {request.asset?.model || ''}
                {request.asset?.purchaseYear && ` (${request.asset.purchaseYear})`}
              </span>
            </div>

            {/* Details Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {/* Amount */}
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                <CurrencyDisplay 
                  amount={request.requestedAmount} 
                  size="sm"
                  className="font-medium"
                />
              </div>
              
              {/* District */}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span className={cn(isCompact ? "text-xs" : "text-sm")}>
                  {getDistrictName(request)}
                </span>
              </div>

              {/* Full variant: Additional info */}
              {!isCompact && (
                <>
                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <DateDisplay date={request.submittedDate || request.createdAt} format="medium" className="text-sm" />
                  </div>
                  
                  {/* Offered Amount */}
                  {request.adminOfferedAmount && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                      Offered: ₹{(request.adminOfferedAmount / 1000).toFixed(0)}K
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Customer Info - For admin view */}
            {!isCompact && request.customer && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t mt-2">
                <User className="w-3 h-3" />
                <span>
                  {request.customer.firstName} {request.customer.lastName}
                </span>
              </div>
            )}
          </div>
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

interface RequestCardListProps {
  /** List of requests */
  requests: RequestType[]
  /** Variant for all cards */
  variant?: "compact" | "full"
  /** Base URL for request links */
  baseUrl?: string
  /** Empty state message */
  emptyMessage?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * List of RequestCard components
 */
export function RequestCardList({
  requests,
  variant = "full",
  baseUrl = "/requests",
  emptyMessage = "No requests found",
  className,
}: RequestCardListProps) {
  if (requests.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          variant={variant}
          href={`${baseUrl}/${request.requestNumber || request.id}`}
        />
      ))}
    </div>
  )
}
