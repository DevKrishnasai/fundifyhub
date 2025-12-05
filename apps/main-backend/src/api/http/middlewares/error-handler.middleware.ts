/**
 * Error Handler Middleware
 * 
 * Centralized error handling for Express.
 * Catches errors from all routes and formats responses consistently.
 * 
 * Must be registered LAST in middleware chain.
 * 
 * @module api/http/middlewares/error-handler
 */

import type { Request, Response, NextFunction } from 'express';

interface AppErrorType extends Error {
  code?: string;
  statusCode?: number;
}

/**
 * Centralized error handler middleware
 * 
 * Catches all errors and formats response.
 * Logs errors with appropriate levels.
 * Returns HTTP status based on error code.
 * 
 * **IMPORTANT:** This must be the LAST middleware registered!
 * 
 * @example
 * ```ts
 * // Register after all route handlers
 * app.use(routes)
 * app.use(errorHandler)
 * ```
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  try {
    // Log error
    logError(err);

    // Handle custom errors with code property
    const appErr = err as AppErrorType;
    if (appErr.code && appErr.statusCode) {
      handleAppError(appErr, res);
      return;
    }

    // Handle standard Error types
    if (err instanceof SyntaxError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request body - syntax error',
        code: 'SYNTAX_ERROR',
      });
      return;
    }

    // Handle unexpected errors
    console.error('[ErrorHandler] Unexpected error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      // TODO: (agent) In development: include error.message
      // TODO: (agent) In production: don't expose details
    });
  } catch (handlerErr) {
    // If error handler itself fails, send minimal response
    console.error('[ErrorHandler] Error handler crashed:', handlerErr);
    res.status(500).json({
      success: false,
      message: 'Internal server error - error handler failed',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Handle custom error with code and status
 */
function handleAppError(err: AppErrorType, res: Response): void {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    code: err.code,
    // TODO: (agent) Include validation details if available
    // TODO: (agent) Sanitize error details in production
  });
}

/**
 * Log error with appropriate level
 */
function logError(err: Error): void {
  const appErr = err as AppErrorType;
  if (appErr.code) {
    // TODO: (agent) Use logger.warn() for app errors
    console.warn('[ErrorHandler] AppError:', {
      code: appErr.code,
      message: err.message,
      statusCode: appErr.statusCode,
    });
  } else {
    // TODO: (agent) Use logger.error() for unexpected errors
    console.error('[ErrorHandler] Unexpected error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }
}

/**
 * 404 Not Found handler
 * 
 * Catch requests that don't match any route.
 * Should be registered AFTER all other route handlers but BEFORE error handler.
 * 
 * @example
 * ```ts
 * app.use(routes)
 * app.use(notFoundHandler)
 * app.use(errorHandler)
 * ```
 */
export function notFoundHandler(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    message: 'Not found - endpoint does not exist',
    code: 'NOT_FOUND',
  });
}

/**
 * Request validation error handler
 * 
 * Formats validation errors from zod or other validators.
 * 
 * @param errors - Array of validation errors
 * 
 * @example
 * ```ts
 * const schema = z.object({ email: z.string().email() })
 * const result = schema.safeParse(data)
 * if (!result.success) {
 *   return res.status(400).json(formatValidationError(result.error.errors))
 * }
 * ```
 */
export function formatValidationError(
  errors: Array<{ path: string; message: string }>
) {
  return {
    success: false,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errors.map((e) => ({
      field: e.path,
      message: e.message,
    })),
  };
}

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch errors and pass to error middleware.
 * Use when you can't use try/catch in async routes.
 * 
 * @example
 * ```ts
 * app.get('/loans/:id', asyncHandler(async (req, res) => {
 *   const loan = await loansService.getById(req.params.id)
 *   res.json(loan)
 *   // Errors automatically caught and passed to errorHandler
 * }))
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
