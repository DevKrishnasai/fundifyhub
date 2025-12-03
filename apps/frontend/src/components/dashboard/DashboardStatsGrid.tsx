"use client"

import { cn } from "@/lib/utils"
import { StatsCard } from "./StatsCard"
import { StatsGridSkeleton } from "@/components/common/TableSkeleton"
import { type LucideIcon } from "lucide-react"

export interface StatItem {
  title: string
  value: string | number
  icon: React.ReactNode
  iconColor?: string
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

interface DashboardStatsGridProps {
  /** Stats items to display */
  stats: StatItem[]
  /** Loading state */
  loading?: boolean
  /** Number of columns (responsive) */
  columns?: 2 | 3 | 4
  /** Additional CSS classes */
  className?: string
}

/**
 * Grid layout for dashboard statistics
 */
export function DashboardStatsGrid({
  stats,
  loading = false,
  columns = 4,
  className,
}: DashboardStatsGridProps) {
  if (loading) {
    return <StatsGridSkeleton count={stats.length || 4} className={className} />
  }

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          iconColor={stat.iconColor}
          subtitle={stat.subtitle}
          trend={stat.trend}
        />
      ))}
    </div>
  )
}
