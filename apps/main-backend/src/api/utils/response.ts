/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response format across all API endpoints:
 * {
 *   success: boolean;
 *   message: string;
 *   data?: T;
 *   errors?: ValidationErrorItem[];
 * }
 */

import { Response } from 'express';
import logger from './logger';

/**
 * Validation error structure
 */
export interface ValidationErrorItem {
  field: string;
  message: string;
  code?: string;
}

/**
 * Standard API response structure
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationErrorItem[];
}

/**
 * Send a successful response with data
 * 
 * @example
 * ```typescript
 * return successResponse(res, 'User created successfully', { user });
 * ```
 */
export function successResponse<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): void {
  const response: APIResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send an error response
 * 
 * @example
 * ```typescript
 * return errorResponse(res, 'User not found', 404);
 * ```
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: ValidationErrorItem[]
): void {
  const response: APIResponse = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send a validation error response
 * 
 * @example
 * ```typescript
 * return validationErrorResponse(res, [
 *   { field: 'email', message: 'Invalid email format' }
 * ]);
 * ```
 */
export function validationErrorResponse(
  res: Response,
  errors: ValidationErrorItem[],
  message = 'Validation failed'
): void {
  errorResponse(res, message, 400, errors);
}

/**
 * Send a 401 Unauthorized response
 */
export function unauthorizedResponse(
  res: Response,
  message = 'Authentication required'
): void {
  errorResponse(res, message, 401);
}

/**
 * Send a 403 Forbidden response
 */
export function forbiddenResponse(
  res: Response,
  message = 'You do not have permission to perform this action'
): void {
  errorResponse(res, message, 403);
}

/**
 * Send a 404 Not Found response
 */
export function notFoundResponse(
  res: Response,
  resource = 'Resource',
  id?: string
): void {
  const message = id 
    ? `${resource} with ID ${id} not found` 
    : `${resource} not found`;
  errorResponse(res, message, 404);
}

/**
 * Send a 409 Conflict response
 */
export function conflictResponse(
  res: Response,
  message = 'Resource already exists'
): void {
  errorResponse(res, message, 409);
}

/**
 * Send a 500 Internal Server Error response
 * Logs the error for debugging
 */
export function internalErrorResponse(
  res: Response,
  error: unknown,
  context?: string
): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  logger.error(context || 'Internal server error', {
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  });
  
  // Don't expose internal error details to client
  errorResponse(res, 'An internal server error occurred', 500);
}

/**
 * Send a 201 Created response with data
 */
export function createdResponse<T>(
  res: Response,
  message: string,
  data?: T
): void {
  successResponse(res, message, data, 201);
}

/**
 * Send a 204 No Content response
 */
export function noContentResponse(res: Response): void {
  res.status(204).send();
}

/**
 * Paginated response helper
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function paginatedResponse<T>(
  res: Response,
  message: string,
  items: T[],
  total: number,
  page: number,
  pageSize: number
): void {
  const totalPages = Math.ceil(total / pageSize);
  
  const data: PaginatedData<T> = {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
  
  successResponse(res, message, data);
}
