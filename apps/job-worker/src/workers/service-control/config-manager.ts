// configManager: Handles service config and status updates using Prisma ORM
import { prisma } from '@fundifyhub/prisma';
import { CONNECTION_STATUS } from '@fundifyhub/utils';
import { ServiceName } from '@fundifyhub/types';

export const configManager = {
  /**
   * Fetch WhatsApp service config from DB
   * Returns config with enabled status and WhatsApp-specific settings
   */
  async getWhatsAppConfig() {
    const config = await prisma.serviceConfig.findUnique({ 
      where: { serviceName: 'WHATSAPP' } 
    });
    
    if (!config) {
      return { 
        enabled: false, 
        clientId: 'fundifyhub-job-worker' 
      };
    }
    
    // Parse WhatsApp-specific config from JSON
    const whatsappConfig = (config.config as any) || {};
    return {
      enabled: config.isEnabled,
      clientId: whatsappConfig.clientId || 'fundifyhub-job-worker',
      ...whatsappConfig
    };
  },

  /**
   * Fetch Email service config from DB
   * Returns config with enabled status and SMTP settings
   */
  async getEmailConfig() {
    const config = await prisma.serviceConfig.findUnique({ 
      where: { serviceName: 'EMAIL' } 
    });
    
    if (!config) {
      return { 
        enabled: false, 
        smtpHost: '', 
        smtpUser: '', 
        smtpPass: '',
        smtpPort: 587,
        smtpSecure: false
      };
    }
    
    // Parse Email-specific config from JSON
    const emailConfig = (config.config as any) || {};
    return {
      enabled: config.isEnabled,
      smtpHost: emailConfig.smtpHost || '',
      smtpUser: emailConfig.smtpUser || '',
      smtpPass: emailConfig.smtpPass || '',
      smtpPort: emailConfig.smtpPort || 587,
      smtpSecure: emailConfig.smtpSecure || false,
      ...emailConfig
    };
  },

  /**
   * Check if WhatsApp service can process jobs
   * Service must be both enabled (configured) and active (connected)
   */
  async canProcessWhatsAppJobs(): Promise<boolean> {
    const config = await prisma.serviceConfig.findUnique({ 
      where: { serviceName: 'WHATSAPP' } 
    });
    return config ? (config.isEnabled && config.isActive) : false;
  },

  /**
   * Check if Email service can process jobs
   * Service must be both enabled (configured) and active (connected)
   */
  async canProcessEmailJobs(): Promise<boolean> {
    const config = await prisma.serviceConfig.findUnique({ 
      where: { serviceName: 'EMAIL' } 
    });
    return config ? (config.isEnabled && config.isActive) : false;
  },

  /**
   * Update service status in DB
   * Updates active state, connection status, and error info
   * @param service Service name (e.g., 'WHATSAPP', 'EMAIL')
   * @param status Status object (isActive, connectionStatus, lastError?)
   */
  async updateServiceStatus(
    service: string, 
    status: { 
      isActive: boolean; 
      connectionStatus: string; 
      lastError?: string 
    }
  ) {
    await prisma.serviceConfig.upsert({
      where: { serviceName: service },
      create: {
        serviceName: service,
        isEnabled: false,
        isActive: status.isActive,
        connectionStatus: status.connectionStatus,
        lastError: status.lastError || null,
        lastErrorAt: status.lastError ? new Date() : null,
        lastConnectedAt: status.isActive && status.connectionStatus === 'CONNECTED' ? new Date() : undefined,
      },
      update: {
        isActive: status.isActive,
        connectionStatus: status.connectionStatus,
        lastError: status.lastError || null,
        lastErrorAt: status.lastError ? new Date() : null,
        lastConnectedAt: status.isActive && status.connectionStatus === 'CONNECTED' ? new Date() : undefined,
      },
    });
  },

  /**
   * Disable service completely
   * Sets isEnabled to false and updates status
   */
  async disableService(
    service: string,
    reason?: string
  ) {
    await prisma.serviceConfig.upsert({
      where: { serviceName: service },
      create: {
        serviceName: service,
        isEnabled: false,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.DISABLED,
        lastError: reason || null,
        lastErrorAt: reason ? new Date() : null,
      },
      update: {
        isEnabled: false,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.DISABLED,
        lastError: reason || null,
        lastErrorAt: reason ? new Date() : null,
      },
    });
  },

  /**
   * Store QR code in database
   * @param service Service name (e.g., 'WHATSAPP')
   * @param qrCode Base64 encoded QR code image
   */
  async storeQRCode(
    service: string,
    qrCode: string
  ) {
    await prisma.serviceConfig.upsert({
      where: { serviceName: service },
      create: {
        serviceName: service,
        isEnabled: false,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.DISCONNECTED,
        qrCode: qrCode,
        updatedAt: new Date(),
      },
      update: {
        qrCode: qrCode,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Clear QR code from database
   * @param service Service name (e.g., 'WHATSAPP')
   */
  async clearQRCode(service: string) {
    await prisma.serviceConfig.upsert({
      where: { serviceName: service },
      create: {
        serviceName: service,
        isEnabled: false,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.DISCONNECTED,
        qrCode: null,
        updatedAt: new Date(),
      },
      update: {
        qrCode: null,
        updatedAt: new Date(),
      },
    });
  },
};
