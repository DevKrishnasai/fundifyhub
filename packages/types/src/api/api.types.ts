/**
 * Common API response types
 * @module api/api.types
 */

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiError[];
}

/**
 * API error structure
 */
export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Sort direction for queries
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Common pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

/**
 * Paginated API response envelope
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}
