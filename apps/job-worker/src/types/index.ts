export interface OTPJobData {
  userId: string;
  recipient: string; // phone number or email
  otp: string;
  userName: string;
  type: 'WHATSAPP' | 'EMAIL';
  templateType?: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
}

export interface ServiceCommand {
  command: 'INITIALIZE' | 'DESTROY';
  timestamp: Date;
}

export interface WhatsAppEventData {
  type: 'QR_CODE' | 'AUTHENTICATED' | 'READY' | 'DISCONNECTED' | 'AUTH_FAILURE' | 'STATUS';
  data?: {
    qrCode?: string;
    message?: string;
    timestamp?: Date;
    connectionStatus?: string;
  };
}

export interface ServiceConfig {
  enabled: boolean;
  clientId?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

export interface ServiceStatus {
  isActive: boolean;
  connectionStatus: string;
  lastError?: string;
}

export interface ConfigManagerConfig {
  whatsapp: ServiceConfig;
  email: ServiceConfig;
}