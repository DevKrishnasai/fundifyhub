/**
 * HTTP Error Helpers
 * Convenience functions for creating HTTP error responses
 */

import {
  DomainError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from '../../errors/domain-error';

export function createValidationError(field: string, message: string): ValidationError {
  return new ValidationError([{ field, message }]);
}

export function createAuthError(message?: string): AuthenticationError {
  return new AuthenticationError(message);
}

export function createForbiddenError(message?: string): AuthorizationError {
  return new AuthorizationError(message);
}

export function createNotFoundError(resource: string, id?: string): NotFoundError {
  return new NotFoundError(resource, id);
}

export function createConflictError(message?: string): ConflictError {
  return new ConflictError(message);
}
