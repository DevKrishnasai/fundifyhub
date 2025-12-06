/**
 * Service configuration types for external integrations
 * @module common/service.types
 */

import { SERVICE_NAMES, CONNECTION_STATUS } from './notification.constants';

/**
 * Email service configuration
 */
export interface EmailConfigType {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

/**
 * Generic service configuration
 * Used for tracking and managing external service connections
 */
export interface ServiceConfigType {
  serviceName: SERVICE_NAMES;
  status: string;
  isEnabled: boolean;
  isActive: boolean;
  connectionStatus: CONNECTION_STATUS;
  lastConnectedAt?: Date;
  lastError?: string;
  config?: EmailConfigType | Record<string, unknown>;
  /** QR code for WhatsApp connection */
  qrCode?: string;
}

/**
 * Utils package environment configuration
 */
export interface UtilsEnvConfigType {
  redis: {
    host: string;
    port: number;
    url?: string;
  };
}
