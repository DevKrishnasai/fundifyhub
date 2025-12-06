/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and returns consistent API responses.
 * Logs errors with appropriate severity levels.
 */

import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import {
  AppError,
  ErrorCode,
  ValidationError,
  RateLimitError,
  getErrorMessage,
  isAppError,
} from '@fundifyhub/utils';
import type { APIResponse } from '@fundifyhub/types';

/**
 * Handle Prisma errors and convert to appropriate AppError
 */
function handlePrismaError(error: { code?: string; meta?: Record<string, unknown> }): AppError | null {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target ? target.join(', ') : 'field';
      return new AppError(ErrorCode.DUPLICATE_ENTRY, `A record with this ${field} already exists`, 409);
    }
    case 'P2025': {
      // Record not found
      return new AppError(ErrorCode.NOT_FOUND, 'Record not found', 404);
    }
    case 'P2003': {
      // Foreign key constraint violation
      return new AppError(ErrorCode.CONFLICT, 'Referenced record does not exist', 400);
    }
    case 'P2014': {
      // Required relation violation
      return new AppError(
        ErrorCode.CONFLICT,
        'The change you requested would violate required relations',
        400
      );
    }
    default:
      return null;
  }
}

/**
 * Not Found Handler - For unmatched routes
 * Place this BEFORE the error handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response: APIResponse = {
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(response);
}

/**
 * Global Error Handler
 * Place this LAST in the middleware chain
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error with context
  const errorContext = {
    method: req.method,
    path: req.path,
    userId: (req.user as { id?: string } | undefined)?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  // Check if it's a Prisma error
  const prismaError = handlePrismaError(error as { code?: string; meta?: Record<string, unknown> });
  if (prismaError) {
    logger.warn('Prisma error', { ...errorContext, code: (error as { code?: string }).code });
    sendErrorResponse(res, prismaError);
    return;
  }

  // Handle operational errors (expected errors)
  if (isAppError(error)) {
    const appError = error;
    // Log at appropriate level based on status code
    if (appError.statusCode >= 500) {
      logger.error('Operational error', { ...errorContext, error: appError.message });
    } else if (appError.statusCode >= 400) {
      logger.warn('Client error', { ...errorContext, error: appError.message });
    }
    sendErrorResponse(res, appError);
    return;
  }

  // Handle unexpected errors
  logger.error('Unexpected error', {
    ...errorContext,
    error: getErrorMessage(error),
    stack: error.stack,
  });

  // Send generic error response (don't leak internal details)
  const response: APIResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred' 
      : getErrorMessage(error),
  };
  
  res.status(500).json(response);
}

/**
 * Send error response based on error type
 */
function sendErrorResponse(res: Response, error: AppError): void {
  const response: APIResponse = {
    success: false,
    message: error.message,
  };

  // Add validation errors if present
  if (error instanceof ValidationError) {
    const validationErrors = (error as { context?: { errors?: unknown } }).context?.errors;
    if (Array.isArray(validationErrors)) {
      response.errors = validationErrors;
    }
  }

  // Add rate limit headers if applicable
  if (error instanceof RateLimitError && error.retryAfter) {
    res.set('Retry-After', String(error.retryAfter));
  }

  res.status(error.statusCode).json(response);
}

/**
 * Async handler wrapper to catch async errors
 * Eliminates the need for try-catch in every async controller
 * 
 * @example
 * ```typescript
 * router.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await getUserById(req.params.id);
 *   if (!user) throw new NotFoundError('User', req.params.id);
 *   res.json({ success: true, data: user });
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
