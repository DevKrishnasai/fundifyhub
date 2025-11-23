import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalRequests: number;
  activeLoans: number;
  totalDisbursed: number;
  pendingCount: number;
  completedToday?: number;
  overduEMIs?: number;
  pendingInspections?: number;
  completedInspections?: number;
}

interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface DashboardFilters {
  status?: string;
  district?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useDashboardStats(filters: DashboardFilters = {}): UseDashboardStatsResult {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params from filters
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.district && filters.district !== 'all') {
        params.append('district', filters.district);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      const queryString = params.toString();
      const endpoint = `${BACKEND_API_CONFIG.ENDPOINTS.USER.DASHBOARD_STATS}${
        queryString ? `?${queryString}` : ''
      }`;

      const response = await apiClient.get(endpoint);

      if (response.data?.success) {
        setStats(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch dashboard stats');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard statistics';
      setError(errorMessage);
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isAuthLoading) {
      fetchStats();
    } else if (!isAuthLoading) {
      setLoading(false);
    }
  }, [user, isAuthLoading, filters.status, filters.district, filters.dateFrom, filters.dateTo]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
