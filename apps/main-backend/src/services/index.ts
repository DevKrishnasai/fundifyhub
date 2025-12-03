/**
 * Services Index
 * 
 * This folder contains business logic services separated from HTTP concerns.
 * 
 * Services should:
 * - Accept plain JS objects (not Express Request)
 * - Return typed result objects
 * - Be testable in isolation
 * - Use injected dependencies for audit/socket/etc
 */

// Session management
export * from './session.service';

// Request management
export * from './request.service';

// Version
export const SERVICES_VERSION = '1.0.0';
