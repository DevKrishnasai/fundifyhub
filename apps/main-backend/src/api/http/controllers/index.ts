/**
 * HTTP Controllers
 * 
 * Thin request handlers for HTTP endpoints.
 * Controllers validate input, call domain services, format responses.
 * 
 * Pattern:
 * - One controller file per domain
 * - Each handler is a thin wrapper around service
 * - Use asyncHandler to catch errors
 * - Validate input with zod schemas
 * - No business logic in controllers
 * 
 * @module api/http/controllers
 */

export * from './auth.controller';
export * from './payments/razorpay.controller';
// TODO: (agent) Export remaining controllers: requests, loans, payments, auctions, admin
