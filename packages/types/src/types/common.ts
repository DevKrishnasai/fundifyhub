/**
 * Common types used across the application
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SoftDeletable {
  deletedAt?: Date | string | null;
  deletedBy?: string | null;
}

export type ID = string;

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use ApiResponse<T> instead
 */
export type APIResponseType<T = unknown> = ApiResponse<T>;
