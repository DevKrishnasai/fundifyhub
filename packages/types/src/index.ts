/**
 * FundifyHub Types Package - Domain-Driven Exports
 *
 * This package provides all shared types, constants, and schemas
 * organized by domain for the FundifyHub application.
 *
 * @packageDocumentation
 */

// ============================================
// DOMAIN EXPORTS
// ============================================

// Common utilities and base types
export * from './common';

// API request/response types
export * from './api';

// Authentication & Authorization
export * from './auth';

// Geography (Country, State, District)
export * from './geography';

// Loan Request management
export * from './request';

// Loan lifecycle
export * from './loan';

// Auction system
export * from './auction';

// Document management
export * from './document';

// Payment processing
export * from './payment';

// Notifications
export * from './notification';

// Socket/Realtime
export * from './socket';

// UI-specific constants (frontend only)
export * from './ui';

// Workflow/Status System
export * from './workflow';

// Providers
export * from './providers';
