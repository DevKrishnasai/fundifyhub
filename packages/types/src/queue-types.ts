/**
 * Shared Supported Services List
 * Use this constant across backend, job-worker, and frontend
 */
// ...existing code...
// ...existing code...
export enum ServiceName {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export const SUPPORTED_SERVICES: ServiceName[] = [ServiceName.EMAIL, ServiceName.WHATSAPP];
/**
 * Shared Queue Job Types and Interfaces
 * Used across backend, job-worker, and frontend
 * These types define the contract for all job queues
 */

// ============================================
// OTP Queue Types
// ============================================

export enum OTPType {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export enum OTPTemplateType {
  VERIFICATION = 'VERIFICATION',
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export interface OTPJobData {
  userId?: string;
  recipient: string; // phone number or email
  otp: string;
  userName: string;
  firstName?: string;
  lastName?: string;
  type: OTPType | 'EMAIL' | 'WHATSAPP';
  // serviceType indicates which downstream adapter should process the job
  // (e.g. EMAIL, WHATSAPP). Prefer using the ServiceName enum for clarity.
  serviceType?: ServiceName | 'EMAIL' | 'WHATSAPP';
  templateType?: OTPTemplateType | 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
}

// ============================================
// Service Control Queue Types
// ============================================

export interface ServiceControlJobData {
  // Use shared enum for actions
  action: import('./queue-constants').ServiceControlAction | string;
  serviceName: ServiceName | 'WHATSAPP' | 'EMAIL';
  reason?: string;
  triggeredBy?: string; // admin user id
}

// ============================================
// Service Status Queue Types
// ============================================

export interface ServiceStatusJobData {
  serviceName: ServiceName | 'WHATSAPP' | 'EMAIL';
  isActive: boolean;
  connectionStatus: import('./queue-constants').ConnectionStatus | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'CONNECTING';
  lastError?: string;
  timestamp: Date;
}

// ============================================
// Template / Enqueue shared types & constants
// These are used by job-worker and any caller that needs to enqueue template-driven jobs
// ============================================

export const EMAIL_QUEUE = 'email-queue';
export const WHATSAPP_QUEUE = 'whatsapp-queue';

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface TemplateDefinition {
  /** Unique template key */
  name: string;
  /** Services supported by this template */
  supportedServices: ServiceName[];
  /** Required variable names that must be present in job variables */
  requiredVariables?: string[];
  /** Optional variable names */
  optionalVariables?: string[];
  /** Default job options applied when enqueueing from callers (can be overridden by caller options) */
  defaults?: JobOptions;
}

export interface TemplateJobPayload {
  templateName: string;
  variables: Record<string, unknown>;
}

export interface EnqueueOptions {
  services?: ServiceName[];
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface EnqueueResult {
  service: ServiceName;
  jobId?: string | number | null;
  warning?: string;
  error?: string;
}
