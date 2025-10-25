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

export interface OTPJobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface OTPQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

// ============================================
// Service Control Queue Types
// ============================================

export enum ServiceName {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export interface ServiceControlJobData {
  action: 'START' | 'STOP' | 'RESTART';
  serviceName: ServiceName | 'WHATSAPP' | 'EMAIL';
  reason?: string;
  triggeredBy?: string; // admin user id
}

export interface ServiceControlQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

// ============================================
// Service Status Queue Types
// ============================================

export interface ServiceStatusJobData {
  serviceName: ServiceName | 'WHATSAPP' | 'EMAIL';
  isActive: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'CONNECTING';
  lastError?: string;
  timestamp: Date;
}

export interface ServiceStatusQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

// ============================================
// Email Service Queue Types (Future)
// ============================================

export interface EmailJobData {
  userId?: string;
  recipient: string;
  subject: string;
  template: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

// ============================================
// WhatsApp Service Queue Types (Future)
// ============================================

export interface WhatsAppJobData {
  userId?: string;
  recipient: string;
  message: string;
  templateName?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

// ============================================
// Generic Queue Result Types
// ============================================

export interface QueueJobResult<T = any> {
  success: boolean;
  jobId?: string;
  data?: T;
  message: string;
  error?: string;
}
