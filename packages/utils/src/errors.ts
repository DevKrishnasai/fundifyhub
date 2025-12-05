/**
 * Error Handling Infrastructure
 *
 * Provides typed, application-level error classes for consistent error handling
 * across all services. All errors should be one of these types or inherit from them.
 *
 * Usage:
 * - Controllers: catch domain errors and translate to HTTP responses
 * - Services: throw these errors to signal failure
 * - Middleware: use error-handler to catch and format responses
 */

/**
 * Error codes for different scenarios
 * Follow HTTP status conventions
 */
export enum ErrorCode {
  // 400 - Bad Request
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_QUERY = 'INVALID_QUERY',
  INVALID_PAGINATION = 'INVALID_PAGINATION',

  // 401 - Unauthorized
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',

  // 403 - Forbidden
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RBAC_DENIED = 'RBAC_DENIED',
  REGION_ACCESS_DENIED = 'REGION_ACCESS_DENIED',

  // 404 - Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  LOAN_NOT_FOUND = 'LOAN_NOT_FOUND',
  AUCTION_NOT_FOUND = 'AUCTION_NOT_FOUND',
  EMI_NOT_FOUND = 'EMI_NOT_FOUND',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',

  // 409 - Conflict
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  ALREADY_ASSIGNED = 'ALREADY_ASSIGNED',
  CANNOT_CANCEL = 'CANNOT_CANCEL',

  // 429 - Too Many Requests
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 500 - Internal Server Error
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',
}

/**
 * Base application error class
 *
 * @example
 * ```ts
 * throw new AppError('VALIDATION_ERROR', 'Invalid email format', 400);
 * ```
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.context && { context: this.context }),
    };
  }
}

/**
 * Validation error (400)
 * Use for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.VALIDATION_ERROR, context?: Record<string, unknown>) {
    super(code, message, 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 * Use for auth failures (invalid credentials, expired token, etc)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', code?: ErrorCode) {
    super(code || ErrorCode.AUTHENTICATION_ERROR, message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Forbidden error (403)
 * Use for RBAC/permission failures
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', code?: ErrorCode, context?: Record<string, unknown>) {
    super(code || ErrorCode.FORBIDDEN, message, 403, context);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not found error (404)
 * Use when a resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, identifier?: string) {
    const message = identifier
      ? `${resourceType} not found: ${identifier}`
      : `${resourceType} not found`;

    super(ErrorCode.NOT_FOUND, message, 404, { resourceType, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 * Use for state conflicts, duplicates, invalid transitions
 */
export class ConflictError extends AppError {
  constructor(message: string, code?: ErrorCode, context?: Record<string, unknown>) {
    super(code || ErrorCode.CONFLICT, message, 409, context);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 * Use when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.retryAfter && { retryAfter: this.retryAfter }),
    };
  }
}

/**
 * Business rule violation (400/409)
 * Use for domain logic violations
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, statusCode: number = 400, context?: Record<string, unknown>) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, statusCode, context);
    this.name = 'BusinessRuleError';
  }
}

/**
 * External service error (502/503)
 * Use for failures from external services (Razorpay, UploadThing, etc)
 */
export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: unknown;

  constructor(
    serviceName: string,
    message: string,
    originalError?: unknown,
    statusCode: number = 502
  ) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${serviceName}: ${message}`, statusCode, { serviceName });
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return isAppError(error) && error.code === code;
}

/**
 * Unwrap error message safely
 * Extract message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Get HTTP status code for error
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
