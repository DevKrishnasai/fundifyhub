/**
 * Custom Error Classes for FundifyHub
 * 
 * Provides typed errors for consistent error handling across the application.
 * These errors can be caught by the global error handler middleware.
 */

import { ValidationErrorItem } from '../api/utils/response';

/**
 * Base domain error
 */
export class DomainError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly (needed for extending Error in TypeScript)
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when request data fails validation
 */
export class ValidationError extends DomainError {
  public readonly errors: ValidationErrorItem[];

  constructor(errors: ValidationErrorItem[], message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Used when user is not authenticated
 */
export class AuthenticationError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error - 403 Forbidden
 * Used when user lacks required permissions
 */
export class AuthorizationError extends DomainError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends DomainError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(resource: string, resourceId?: string) {
    const message = resourceId 
      ? `${resource} with ID ${resourceId} not found` 
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR');
    this.resource = resource;
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error - 409 Conflict
 * Used when resource already exists or state conflict occurs
 */
export class ConflictError extends DomainError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Gone error - 410 Gone
 * Used when resource has been permanently removed
 */
export class GoneError extends DomainError {
  constructor(message = 'This resource is no longer available') {
    super(message, 410, 'GONE_ERROR');
    Object.setPrototypeOf(this, GoneError.prototype);
  }
}

/**
 * Unprocessable Entity error - 422 Unprocessable Entity
 * Used when request is syntactically valid but semantically incorrect
 */
export class UnprocessableEntityError extends DomainError {
  constructor(message = 'Unable to process the request') {
    super(message, 422, 'UNPROCESSABLE_ENTITY_ERROR');
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * Used when user exceeds rate limits
 */
export class RateLimitError extends DomainError {
  public readonly retryAfter?: number;

  constructor(message = 'Too many requests, please try again later', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Service unavailable error - 503 Service Unavailable
 * Used when a dependent service is unavailable
 */
export class ServiceUnavailableError extends DomainError {
  constructor(service: string, message?: string) {
    super(message || `${service} service is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE_ERROR');
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Business logic error - 400 Bad Request
 * Used for domain-specific business rule violations
 */
export class BusinessLogicError extends DomainError {
  constructor(code: string, message: string) {
    super(message, 400, code);
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

/**
 * Workflow transition error - 400 Bad Request
 * Used when a state transition is not allowed
 */
export class WorkflowTransitionError extends DomainError {
  public readonly fromStatus: string;
  public readonly toStatus: string;
  public readonly reason?: string;

  constructor(fromStatus: string, toStatus: string, reason?: string) {
    const message = reason 
      ? `Cannot transition from ${fromStatus} to ${toStatus}: ${reason}`
      : `Cannot transition from ${fromStatus} to ${toStatus}`;
    super(message, 400, 'WORKFLOW_TRANSITION_ERROR');
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
export class PaymentError extends DomainError {
  public readonly paymentId?: string;

  constructor(message: string, code?: string, paymentId?: string) {
    super(message, 402, code || 'PAYMENT_ERROR');
    this.paymentId = paymentId;
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * External service error - 502 Bad Gateway
 * Used when an external API call fails
 */
export class ExternalServiceError extends DomainError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(service: string, message?: string, originalError?: Error) {
    super(message || `External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Type guard to check if error is operational (expected error we can handle)
 */
export function isOperationalError(error: unknown): error is DomainError {
  return error instanceof DomainError && error.isOperational;
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
