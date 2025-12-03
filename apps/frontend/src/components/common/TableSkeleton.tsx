import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number
  /** Number of columns to display */
  columns?: number
  /** Show header row */
  showHeader?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton loading state for tables
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            {showHeader && (
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors">
                  {Array.from({ length: columns }).map((_, i) => (
                    <th
                      key={i}
                      className="h-12 px-4 text-left align-middle font-medium"
                    >
                      <Skeleton className="h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="[&_tr:last-child]:border-0">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b transition-colors"
                >
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td key={colIndex} className="p-4 align-middle">
                      <Skeleton 
                        className={cn(
                          "h-4",
                          colIndex === 0 ? "w-32" : "w-20"
                        )} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface CardGridSkeletonProps {
  /** Number of cards to display */
  cards?: number
  /** Grid columns (responsive) */
  columns?: 1 | 2 | 3 | 4
  /** Card height variant */
  cardHeight?: "sm" | "md" | "lg"
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton loading state for card grids
 */
export function CardGridSkeleton({
  cards = 6,
  columns = 3,
  cardHeight = "md",
  className,
}: CardGridSkeletonProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }

  const heightClasses = {
    sm: "h-24",
    md: "h-36",
    lg: "h-48",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "rounded-lg border bg-card p-4",
            heightClasses[cardHeight]
          )}
        >
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface StatsGridSkeletonProps {
  /** Number of stat cards */
  count?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton loading state for dashboard stats grid
 */
export function StatsGridSkeleton({
  count = 4,
  className,
}: StatsGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface DetailPageSkeletonProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton loading state for detail pages
 */
export function DetailPageSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
