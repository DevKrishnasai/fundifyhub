/**
 * Custom Error Classes for FundifyHub
 * 
 * Provides typed errors for consistent error handling across the application.
 * These errors can be caught by the global error handler middleware.
 */

import { ValidationErrorItem } from '../api/utils/response';

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly (needed for extending Error in TypeScript)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
  public readonly errors: ValidationErrorItem[];

  constructor(errors: ValidationErrorItem[], message = 'Validation failed') {
    super(message, 400);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Used when user is not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error - 403 Forbidden
 * Used when user lacks required permissions
 */
export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(resource: string, resourceId?: string) {
    const message = resourceId 
      ? `${resource} with ID ${resourceId} not found` 
      : `${resource} not found`;
    super(message, 404);
    this.resource = resource;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error - 409 Conflict
 * Used when resource already exists or state conflict occurs
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Gone error - 410 Gone
 * Used when resource has been permanently removed
 */
export class GoneError extends AppError {
  constructor(message = 'This resource is no longer available') {
    super(message, 410);
    Object.setPrototypeOf(this, GoneError.prototype);
  }
}

/**
 * Unprocessable Entity error - 422 Unprocessable Entity
 * Used when request is syntactically valid but semantically incorrect
 */
export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unable to process the request') {
    super(message, 422);
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * Used when user exceeds rate limits
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message = 'Too many requests, please try again later', retryAfter?: number) {
    super(message, 429);
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Service unavailable error - 503 Service Unavailable
 * Used when a dependent service is unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `${service} service is temporarily unavailable`, 503);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Business logic error - 400 Bad Request
 * Used for domain-specific business rule violations
 */
export class BusinessLogicError extends AppError {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message, 400);
    this.code = code;
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

/**
 * Workflow transition error - 400 Bad Request
 * Used when a state transition is not allowed
 */
export class WorkflowTransitionError extends AppError {
  public readonly fromStatus: string;
  public readonly toStatus: string;
  public readonly reason?: string;

  constructor(fromStatus: string, toStatus: string, reason?: string) {
    const message = reason 
      ? `Cannot transition from ${fromStatus} to ${toStatus}: ${reason}`
      : `Cannot transition from ${fromStatus} to ${toStatus}`;
    super(message, 400);
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.reason = reason;
    Object.setPrototypeOf(this, WorkflowTransitionError.prototype);
  }
}

/**
 * Payment error - 402 Payment Required
 * Used for payment-related failures
 */
export class PaymentError extends AppError {
  public readonly paymentId?: string;
  public readonly code?: string;

  constructor(message: string, paymentId?: string, code?: string) {
    super(message, 402);
    this.paymentId = paymentId;
    this.code = code;
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * External service error - 502 Bad Gateway
 * Used when an external API call fails
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message?: string, originalError?: Error) {
    super(message || `External service error: ${service}`, 502);
    this.service = service;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Type guard to check if error is operational (expected error we can handle)
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
