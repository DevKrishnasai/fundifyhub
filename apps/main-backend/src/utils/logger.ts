/**
 * Server Logger
 *
 * Centralized logging utility for the main backend server.
 * Uses the shared @fundifyhub/logger package for consistent logging across services.
 */

import { createLogger } from "@fundifyhub/logger";

export const logger = createLogger({ serviceName: 'server' });