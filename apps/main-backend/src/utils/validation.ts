/**
 * Zod Validation Middleware for Express
 * 
 * Provides request validation using Zod schemas for:
 * - Request body validation
 * - Query params validation
 * - URL params validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import logger from './logger';

/**
 * Validation error response format
 */
interface ValidationErrorItem {
  field: string;
  message: string;
  code?: string;
}

/**
 * Formats Zod errors into a consistent validation error structure
 */
function formatZodErrors(error: ZodError): ValidationErrorItem[] {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Middleware to validate request body against a Zod schema
 * 
 * @example
 * ```typescript
 * import { createUserSchema } from '@fundifyhub/types';
 * 
 * router.post('/users', 
 *   authMiddleware,
 *   validateBody(createUserSchema), 
 *   createUserController
 * );
 * ```
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        logger.warn('Validation failed for request body', { 
          path: req.path, 
          errors: errors.slice(0, 5) // Log first 5 errors
        });
        
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }
      
      // Replace body with validated/transformed data
      req.body = result.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Validation error occurred',
      });
    }
  };
}

/**
 * Middleware to validate request query parameters against a Zod schema
 * 
 * @example
 * ```typescript
 * const querySchema = z.object({
 *   page: z.coerce.number().min(1).default(1),
 *   limit: z.coerce.number().min(1).max(100).default(20),
 * });
 * 
 * router.get('/users', 
 *   validateQuery(querySchema), 
 *   listUsersController
 * );
 * ```
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        logger.warn('Validation failed for query params', { 
          path: req.path, 
          errors: errors.slice(0, 5)
        });
        
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors,
        });
        return;
      }
      
      // Replace query with validated/transformed data
      // Note: Express types query as ParsedQs, but we override with validated data
      (req.query as unknown) = result.data;
      next();
    } catch (error) {
      logger.error('Query validation middleware error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Validation error occurred',
      });
    }
  };
}

/**
 * Middleware to validate URL parameters against a Zod schema
 * 
 * @example
 * ```typescript
 * const paramsSchema = z.object({
 *   id: z.string().cuid(),
 * });
 * 
 * router.get('/users/:id', 
 *   validateParams(paramsSchema), 
 *   getUserController
 * );
 * ```
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        logger.warn('Validation failed for URL params', { 
          path: req.path, 
          errors: errors.slice(0, 5)
        });
        
        res.status(400).json({
          success: false,
          message: 'Invalid URL parameters',
          errors,
        });
        return;
      }
      
      // Replace params with validated/transformed data
      req.params = result.data as Record<string, string>;
      next();
    } catch (error) {
      logger.error('Params validation middleware error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Validation error occurred',
      });
    }
  };
}

/**
 * Combined validation for body, query, and params
 * Useful when you need to validate multiple parts of the request at once
 */
interface ValidationSchemas<B = unknown, Q = unknown, P = unknown> {
  body?: ZodSchema<B>;
  query?: ZodSchema<Q>;
  params?: ZodSchema<P>;
}

export function validate<B = unknown, Q = unknown, P = unknown>(
  schemas: ValidationSchemas<B, Q, P>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: ValidationErrorItem[] = [];
    
    try {
      // Validate body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error).map(e => ({ 
            ...e, 
            field: `body.${e.field}` 
          })));
        } else {
          req.body = result.data;
        }
      }
      
      // Validate query
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error).map(e => ({ 
            ...e, 
            field: `query.${e.field}` 
          })));
        } else {
          (req.query as unknown) = result.data;
        }
      }
      
      // Validate params
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error).map(e => ({ 
            ...e, 
            field: `params.${e.field}` 
          })));
        } else {
          req.params = result.data as Record<string, string>;
        }
      }
      
      if (allErrors.length > 0) {
        logger.warn('Combined validation failed', { 
          path: req.path, 
          errors: allErrors.slice(0, 5)
        });
        
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: allErrors,
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Combined validation middleware error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Validation error occurred',
      });
    }
  };
}
