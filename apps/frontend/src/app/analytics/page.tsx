"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { PERMISSION, hasPermission, DISTRICTS } from "@fundifyhub/types"
import { 
  useAnalyticsSummary, 
  useDistrictBreakdown 
} from "@/hooks/queries/useAnalytics"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { redirect } from "next/navigation"
import { 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  IndianRupee,
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar
} from "lucide-react"

function AnalyticsSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function StatCard({ 
  title, 
  value, 
  icon, 
  iconColor = "text-primary",
  trend,
  subtitle
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  iconColor?: string
  trend?: { value: number; isPositive: boolean }
  subtitle?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(trend.value)}% vs last month</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-muted ${iconColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`
  }
  return `₹${amount}`
}

function AnalyticsContent() {
  const { user, isLoading: authLoading } = useAuth()
  
  // Filters
  const [dateRange, setDateRange] = useState<string>("30d")
  const [districtFilter, setDistrictFilter] = useState<string>("all")

  const userRoles = user?.roles || []
  const canViewAnalytics = hasPermission(userRoles, PERMISSION.VIEW_ANALYTICS)

  // Only admins can view analytics
  if (!authLoading && user && !canViewAnalytics) {
    redirect("/dashboard")
  }

  // React Query hooks
  const { 
    data: summary, 
    isLoading: summaryLoading, 
    isError: summaryError,
    refetch: refetchSummary,
    isFetching: summaryFetching
  } = useAnalyticsSummary({ enabled: !!user && canViewAnalytics })

  const { 
    data: districtData, 
    isLoading: districtLoading,
    refetch: refetchDistrict,
    isFetching: districtFetching
  } = useDistrictBreakdown({ enabled: !!user && canViewAnalytics })

  const isLoading = summaryLoading || districtLoading
  const isFetching = summaryFetching || districtFetching

  const handleRefresh = () => {
    refetchSummary()
    refetchDistrict()
  }

  if (authLoading) {
    return <AnalyticsSkeleton />
  }

  if (!user) {
    return null
  }

  const dateRangeOptions = [
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" },
    { value: "365d", label: "Last Year" },
    { value: "all", label: "All Time" },
  ]

  // Calculate trend helpers
  const getTrend = (change?: { change: number; trend: 'up' | 'down' | 'same' }) => {
    if (!change) return undefined
    return { value: Math.abs(change.change), isPositive: change.trend === 'up' }
  }

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Analytics"
          description="Platform performance metrics and insights."
          actions={
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {DISTRICTS.map(district => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {summaryError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
            Failed to load analytics data
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Requests"
                value={summary?.totalRequests ?? 0}
                icon={<FileText className="h-5 w-5" />}
                iconColor="text-blue-500"
                trend={getTrend(summary?.comparison?.totalRequests)}
              />
              <StatCard
                title="Active Loans"
                value={summary?.activeLoans ?? 0}
                icon={<CheckCircle className="h-5 w-5" />}
                iconColor="text-green-500"
                trend={getTrend(summary?.comparison?.activeLoans)}
              />
              <StatCard
                title="Total Disbursed"
                value={formatCurrency(summary?.totalDisbursed ?? 0)}
                icon={<IndianRupee className="h-5 w-5" />}
                iconColor="text-emerald-500"
                trend={getTrend(summary?.comparison?.totalDisbursed)}
              />
              <StatCard
                title="Total Repaid"
                value={formatCurrency(summary?.totalRepaid ?? 0)}
                icon={<TrendingUp className="h-5 w-5" />}
                iconColor="text-purple-500"
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Completed Loans"
                value={summary?.completedLoans ?? 0}
                icon={<Clock className="h-5 w-5" />}
                iconColor="text-yellow-500"
              />
              <StatCard
                title="Overdue Amount"
                value={formatCurrency(summary?.overdueAmount ?? 0)}
                icon={<AlertCircle className="h-5 w-5" />}
                iconColor="text-red-500"
              />
              <StatCard
                title="Approval Rate"
                value={`${(summary?.approvalRate ?? 0).toFixed(1)}%`}
                icon={<Users className="h-5 w-5" />}
                iconColor="text-indigo-500"
                trend={getTrend(summary?.comparison?.approvalRate)}
              />
              <StatCard
                title="Default Rate"
                value={`${(summary?.defaultRate ?? 0).toFixed(1)}%`}
                icon={<BarChart3 className="h-5 w-5" />}
                iconColor="text-cyan-500"
                subtitle={`Avg loan: ${formatCurrency(summary?.averageLoanAmount ?? 0)}`}
              />
            </div>

            {/* District Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    District Performance
                  </CardTitle>
                  <CardDescription>Loan distribution by district</CardDescription>
                </CardHeader>
                <CardContent>
                  {districtData && districtData.length > 0 ? (
                    <div className="space-y-4">
                      {districtData.slice(0, 6).map((d) => (
                        <div key={d.districtId} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium truncate">{d.districtName}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (d.totalDisbursed / (summary?.totalDisbursed || 1)) * 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-20 text-sm text-right text-muted-foreground">
                            {formatCurrency(d.totalDisbursed)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No district data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Loan Status Overview
                  </CardTitle>
                  <CardDescription>Current status of all loans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Active Loans</span>
                      </div>
                      <span className="font-semibold">{summary?.activeLoans ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Completed</span>
                      </div>
                      <span className="font-semibold">{summary?.completedLoans ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Total Requests</span>
                      </div>
                      <span className="font-semibold">{summary?.totalRequests ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Overdue Amount</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(summary?.overdueAmount ?? 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  )
}
