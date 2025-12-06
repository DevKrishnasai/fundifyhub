"use client"

import { useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer } from "@/components/layout/AppLayout"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { RequestCardList } from "@/components/features/requests/RequestCard"
import { ROLES } from "@fundifyhub/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUserDashboardStats } from "@/hooks/queries/useDashboard"
import { useRequests, useUserRequests, useAssignedRequests } from "@/hooks/queries"
import Link from "next/link"
import { 
  FileText, 
  IndianRupee, 
  Clock, 
  CheckCircle,
  ClipboardList,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  RefreshCw
} from "lucide-react"

// Dashboard stats type - combining all possible fields from different API responses
interface DashboardStatsData {
  totalRequests?: number
  activeLoans?: number
  pendingRequests?: number
  totalDisbursed?: number
  pendingCount?: number
  completedToday?: number
  overdueEMIs?: number
  pendingInspections?: number
  completedInspections?: number
  totalUsers?: number
  totalCollected?: number
  totalBorrowed?: number
  totalRepaid?: number
}

function DashboardSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth()

  // Determine user roles
  const userRoles = user?.roles?.map((r: string) => r.toUpperCase()) || []
  const isCustomer = userRoles.includes(ROLES.CUSTOMER) && !userRoles.includes(ROLES.SUPER_ADMIN) && !userRoles.includes(ROLES.DISTRICT_ADMIN) && !userRoles.includes(ROLES.AGENT)
  const isAgent = userRoles.includes(ROLES.AGENT) && !userRoles.includes(ROLES.SUPER_ADMIN) && !userRoles.includes(ROLES.DISTRICT_ADMIN)
  const isAdmin = userRoles.includes(ROLES.SUPER_ADMIN) || userRoles.includes(ROLES.DISTRICT_ADMIN)

  // Fetch dashboard stats
  const statsQuery = useUserDashboardStats({ enabled: !!user && !authLoading })

  // Fetch recent requests based on role
  const adminRequestsQuery = useRequests(
    { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' },
    { enabled: isAdmin && !!user && !authLoading }
  )
  const agentRequestsQuery = useAssignedRequests({ enabled: isAgent && !!user && !authLoading })
  const customerRequestsQuery = useUserRequests({ enabled: isCustomer && !!user && !authLoading })

  // Get the active requests query based on role
  const activeRequestsQuery = isAdmin ? adminRequestsQuery : isAgent ? agentRequestsQuery : customerRequestsQuery

  // Normalize stats data - cast to our local type that accepts all possible fields
  const stats = statsQuery.data as DashboardStatsData | undefined

  // Get recent requests array
  const recentRequests = useMemo(() => {
    if (isAdmin && adminRequestsQuery.data) {
      return adminRequestsQuery.data.requests?.slice(0, 5) ?? []
    }
    if (isAgent && agentRequestsQuery.data) {
      return agentRequestsQuery.data.slice(0, 5)
    }
    if (customerRequestsQuery.data) {
      return customerRequestsQuery.data.slice(0, 5)
    }
    return []
  }, [isAdmin, isAgent, adminRequestsQuery.data, agentRequestsQuery.data, customerRequestsQuery.data])

  // Compute loading state
  const isLoading = statsQuery.isLoading || activeRequestsQuery.isLoading
  const isFetching = statsQuery.isFetching || activeRequestsQuery.isFetching
  const error = statsQuery.error?.message || activeRequestsQuery.error?.message

  // Handle refresh
  const handleRefresh = () => {
    statsQuery.refetch()
    activeRequestsQuery.refetch()
  }

  if (authLoading || isLoading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return null
  }

  // Role-based stats cards
  const getStatsCards = () => {
    if (isAdmin) {
      return [
        { 
          title: "Total Requests", 
          value: stats?.totalRequests ?? 0, 
          icon: <FileText className="h-5 w-5" />, 
          iconColor: "text-blue-500" 
        },
        { 
          title: "Pending Review", 
          value: stats?.pendingRequests ?? stats?.pendingCount ?? 0, 
          icon: <Clock className="h-5 w-5" />, 
          iconColor: "text-yellow-500" 
        },
        { 
          title: "Active Loans", 
          value: stats?.activeLoans ?? 0, 
          icon: <IndianRupee className="h-5 w-5" />, 
          iconColor: "text-green-500" 
        },
        { 
          title: "Total Disbursed", 
          value: `₹${((stats?.totalDisbursed ?? stats?.totalBorrowed ?? 0) / 100000).toFixed(1)}L`, 
          icon: <TrendingUp className="h-5 w-5" />, 
          iconColor: "text-purple-500" 
        },
      ]
    }
    if (isAgent) {
      return [
        { 
          title: "Assigned Tasks", 
          value: stats?.totalRequests ?? 0, 
          icon: <ClipboardList className="h-5 w-5" />, 
          iconColor: "text-blue-500" 
        },
        { 
          title: "Pending Inspections", 
          value: stats?.pendingInspections ?? 0, 
          icon: <Clock className="h-5 w-5" />, 
          iconColor: "text-yellow-500" 
        },
        { 
          title: "Completed Today", 
          value: stats?.completedToday ?? 0, 
          icon: <CheckCircle className="h-5 w-5" />, 
          iconColor: "text-green-500" 
        },
        { 
          title: "Total Completed", 
          value: stats?.completedInspections ?? 0, 
          icon: <TrendingUp className="h-5 w-5" />, 
          iconColor: "text-emerald-500" 
        },
      ]
    }
    // Customer stats
    return [
      { 
        title: "My Requests", 
        value: stats?.totalRequests ?? 0, 
        icon: <FileText className="h-5 w-5" />, 
        iconColor: "text-blue-500" 
      },
      { 
        title: "Active Loans", 
        value: stats?.activeLoans ?? 0, 
        icon: <IndianRupee className="h-5 w-5" />, 
        iconColor: "text-green-500" 
      },
      { 
        title: "Pending", 
        value: stats?.pendingRequests ?? stats?.pendingCount ?? 0, 
        icon: <Clock className="h-5 w-5" />, 
        iconColor: "text-yellow-500" 
      },
      { 
        title: "Total Borrowed", 
        value: `₹${((stats?.totalBorrowed ?? stats?.totalDisbursed ?? 0) / 1000).toFixed(0)}K`, 
        icon: <TrendingUp className="h-5 w-5" />, 
        iconColor: "text-emerald-500" 
      },
    ]
  }

  const statsCards = getStatsCards()

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-muted-foreground">
                {isCustomer && "Track your loan requests and manage your account."}
                {isAgent && "View assigned inspections and manage your tasks."}
                {isAdmin && "Overview of all operations and key metrics."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isCustomer && (
                <Button asChild>
                  <Link href="/submit-request">
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error}
              <Button variant="link" className="ml-2 p-0 h-auto" onClick={handleRefresh}>
                Try again
              </Button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                iconColor={stat.iconColor}
                loading={statsQuery.isLoading}
              />
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                  {isCustomer ? "My Recent Requests" : "Recent Requests"}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/requests">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentRequests.length > 0 ? (
                  <RequestCardList 
                    requests={recentRequests} 
                    variant="compact"
                    baseUrl="/requests"
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No requests found</p>
                    {isCustomer && (
                      <Button asChild className="mt-4" variant="outline">
                        <Link href="/submit-request">Create Your First Request</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions / Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  {isCustomer ? "Quick Actions" : isAgent ? "Today's Tasks" : "Quick Actions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCustomer && (
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/submit-request">
                        <Plus className="h-4 w-4 mr-2" />
                        Submit New Loan Request
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/requests">
                        <FileText className="h-4 w-4 mr-2" />
                        View All Requests
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/settings">
                        <Users className="h-4 w-4 mr-2" />
                        Update Profile
                      </Link>
                    </Button>
                  </div>
                )}
                {isAdmin && (
                  <div className="space-y-3 mt-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/users">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/geography">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Manage Geography
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/analytics">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Analytics
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
