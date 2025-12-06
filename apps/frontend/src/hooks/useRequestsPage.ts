/**
 * Hook for the Requests page
 */
import { useState, useMemo, useEffect } from "react"
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from "@fundifyhub/types"
import { useRequests, useUserRequests, useAssignedRequests } from './queries'
import { useDistricts } from './queries/useGeography';
import { useDebounce } from './useDebounce'

export function useRequestsPage() {
  const { user, isLoading: authLoading } = useAuth()
  
  // Filters & Pagination state
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [districtFilter, setDistrictFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 300)

  // Determine user roles
  const userRoles = user?.roles?.map((r: string) => r.toUpperCase()) || []
  const isCustomer = userRoles.includes(ROLES.CUSTOMER) && !userRoles.includes(ROLES.SUPER_ADMIN) && !userRoles.includes(ROLES.DISTRICT_ADMIN) && !userRoles.includes(ROLES.AGENT)
  const isAgent = userRoles.includes(ROLES.AGENT) && !userRoles.includes(ROLES.SUPER_ADMIN) && !userRoles.includes(ROLES.DISTRICT_ADMIN)
  const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN)
  const isAdmin = isSuperAdmin || isDistrictAdmin

  // Fetch districts for admin filter
  const { data: districts = [] } = useDistricts({ enabled: isAdmin })
  
  // Get available districts for filtering based on role
  const availableDistricts = useMemo(() => {
    const userDistricts = user?.districts || []
    if (isSuperAdmin) {
      return districts.map(d => d.name)
    }
    return userDistricts
  }, [isSuperAdmin, districts, user?.districts])

  // Build filter params for React Query
  const filterParams = useMemo(() => ({
    page,
    limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
    district: districtFilter !== "all" ? districtFilter : undefined,
    search: debouncedSearch || undefined,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
  }), [page, limit, statusFilter, districtFilter, debouncedSearch])

  // Use appropriate hook based on role
  const adminQuery = useRequests(filterParams, { enabled: isAdmin && !authLoading })
  const agentQuery = useAssignedRequests({ enabled: isAgent && !authLoading })
  const customerQuery = useUserRequests({ enabled: isCustomer && !authLoading })

  // Get active query based on role
  const activeQuery = isAdmin ? adminQuery : isAgent ? agentQuery : customerQuery

  // Normalize data structure
  const requests = useMemo(() => {
    if (isAdmin && adminQuery.data) {
      return adminQuery.data.requests || []
    }
    if (isAgent && agentQuery.data) {
      return agentQuery.data || []
    }
    if (customerQuery.data) {
      return customerQuery.data || []
    }
    return []
  }, [isAdmin, isAgent, adminQuery.data, agentQuery.data, customerQuery.data])

  const pagination = useMemo(() => {
    if (isAdmin && adminQuery.data?.pagination) {
      return adminQuery.data.pagination
    }
    // For non-admin views, create pagination from array length
    return {
      page: 1,
      limit: requests.length || 10,
      total: requests.length,
      totalPages: 1,
    }
  }, [isAdmin, adminQuery.data, requests.length])

  const isLoading = activeQuery.isLoading
  const isRefetching = activeQuery.isFetching && !activeQuery.isLoading
  const error = activeQuery.error?.message || null

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, districtFilter, debouncedSearch, limit])

  // Handle refresh
  const handleRefresh = () => {
    activeQuery.refetch()
  }

  // Role-based page info
  const getPageInfo = () => {
    if (isAdmin) {
      return {
        title: "All Requests",
        description: "Manage and review all loan requests across the platform."
      }
    }
    if (isAgent) {
      return {
        title: "Assigned Requests",
        description: "View and manage requests assigned to you for inspection."
      }
    }
    return {
      title: "My Requests",
      description: "Track your loan requests and their status."
    }
  }

  const pageInfo = getPageInfo()

  return {
    user,
    authLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    districtFilter,
    setDistrictFilter,
    page,
    setPage,
    limit,
    setLimit,
    requests,
    pagination,
    isLoading,
    isRefetching,
    error,
    handleRefresh,
    pageInfo,
    isAdmin,
    isCustomer,
    availableDistricts,
  }
}
