"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * Full-page loading spinner
 */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("min-h-[50vh] flex items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" className="text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Inline button loading state
 */
export function ButtonLoader({ className }: { className?: string }) {
  return <Spinner size="sm" className={cn("mr-2", className)} />
}

/**
 * Card skeleton for request/loan cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

/**
 * Table skeleton for data tables
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn("w-full overflow-auto", className)}>
      <div className="border rounded-lg">
        {/* Header */}
        <div className="flex border-b bg-muted/50 p-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 px-2">
              <Skeleton className="h-4 w-full max-w-[100px]" />
            </div>
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex border-b last:border-b-0 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1 px-2">
                <Skeleton className="h-4 w-full max-w-[120px]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Form skeleton for input forms
 */
export function FormSkeleton({ 
  fields = 4,
  className 
}: { 
  fields?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

/**
 * Stats card skeleton for dashboard metrics
 */
export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Profile skeleton for user profile pages
 */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Avatar and name */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Request detail skeleton
 */
export function RequestDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * List skeleton for simple lists
 */
export function ListSkeleton({ 
  items = 5,
  className 
}: { 
  items?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton removed - global Navbar used for header */}

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Welcome Section Skeleton */}
        <div className="mb-6 sm:mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Quick Stats Skeleton */}
        <StatsSkeleton className="mb-6 sm:mb-8" />

        {/* Main Content Skeleton */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <Skeleton className="h-7 w-48" />
            <div className="flex flex-col sm:flex-row gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* Loan Cards Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>

                  {i === 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="w-full h-2 rounded-full" />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Skeleton className="h-9 w-full sm:w-32" />
                    <Skeleton className="h-9 w-full sm:w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal skeleton for dialog content loading states
 */
export function ModalSkeleton({ 
  title = true,
  description = true,
  fields = 4,
  actions = true,
  className 
}: { 
  title?: boolean
  description?: boolean
  fields?: number
  actions?: boolean
  className?: string 
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && <Skeleton className="h-6 w-48" />}
          {description && <Skeleton className="h-4 w-72" />}
        </div>
      )}
      
      {/* Content */}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  )
}

/**
 * User details modal skeleton
 */
export function UserDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Avatar and basic info */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
      
      {/* Districts section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Audit log details modal skeleton
 */
export function AuditLogDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Action header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      
      {/* Info sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="p-4 border rounded-lg space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Metadata section */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Notifications list skeleton
 */
export function NotificationsListSkeleton({ 
  items = 5,
  className 
}: { 
  items?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16 flex-shrink-0" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

/**
 * Request list skeleton for requests page
 */
export function RequestsListSkeleton({ 
  items = 5,
  className 
}: { 
  items?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Left section */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <div className="flex flex-wrap gap-4 pt-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              
              {/* Right section */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Users table skeleton
 */
export function UsersTableSkeleton({ 
  rows = 5,
  className 
}: { 
  rows?: number
  className?: string 
}) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 border-b">
        {["User", "Email", "Role", "Districts", "Status", "Actions"].map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-6 gap-4 p-4 border-b last:border-b-0">
          {/* User column */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          
          {/* Email */}
          <Skeleton className="h-4 w-32" />
          
          {/* Role */}
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          
          {/* Districts */}
          <div className="flex gap-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          
          {/* Status */}
          <Skeleton className="h-5 w-16 rounded-full" />
          
          {/* Actions */}
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  )
}

