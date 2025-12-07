/**
 * Admin Analytics API Client
 * Provides functions for fetching analytics data for admin dashboards
 */

import { getWithResult } from './api-client';
import { BACKEND_API_CONFIG } from './urls';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsSummary {
  totalRequests: number;
  totalUsers: number;
  totalLoans: number;
  totalDisbursed: number;
  activeLoans: number;
  pendingRequests: number;
  defaultedLoans: number;
  totalCollected: number;
}

export interface TrendDataPoint {
  month: string;
  requests: number;
  approvals: number;
  disbursements: number;
  rejections: number;
}

export interface DistrictBreakdown {
  districtId: string;
  districtName: string;
  totalRequests: number;
  activeLoans: number;
  totalDisbursed: number;
  collectionRate: number;
}

export interface RequestStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

// ============================================================================
// ANALYTICS OPERATIONS
// ============================================================================

/**
 * Get analytics summary with key metrics
 */
export async function getAnalyticsSummary() {
  return getWithResult<AnalyticsSummary>(
    BACKEND_API_CONFIG.ENDPOINTS.ADMIN.ANALYTICS_SUMMARY
  );
}

/**
 * Get analytics trends over time
 * @param months Number of months to include (default: 6)
 */
export async function getAnalyticsTrends(months: number = 6) {
  return getWithResult<TrendDataPoint[]>(
    `${BACKEND_API_CONFIG.ENDPOINTS.ADMIN.ANALYTICS_TRENDS}?months=${months}`
  );
}

/**
 * Get district-wise breakdown of metrics
 */
export async function getDistrictBreakdown() {
  return getWithResult<DistrictBreakdown[]>(
    BACKEND_API_CONFIG.ENDPOINTS.ADMIN.ANALYTICS_DISTRICT_BREAKDOWN
  );
}

/**
 * Get request status breakdown
 */
export async function getRequestStatusBreakdown() {
  return getWithResult<RequestStatusBreakdown[]>(
    BACKEND_API_CONFIG.ENDPOINTS.ADMIN.ANALYTICS_REQUEST_STATUS
  );
}
