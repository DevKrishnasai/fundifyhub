import { createLogger } from '@fundifyhub/logger';
import { prisma } from '@fundifyhub/prisma';

const logger = createLogger({ serviceName: 'config-manager' });

class ConfigManager {
  /**
   * Get WhatsApp configuration directly from database
   */
  async getWhatsAppConfig(): Promise<{
    enabled: boolean;
    clientId?: string;
  }> {
    const config = await prisma.serviceConfig.findUnique({
      where: { serviceName: 'WHATSAPP' }
    });
    
    const configData = config?.config as any;
    return {
      enabled: config?.isEnabled || false,
      clientId: configData?.clientId || 'fundifyhub-job-worker'
    };
  }

  /**
   * Get Email configuration directly from database
   */
  async getEmailConfig(): Promise<{
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
  }> {
    const config = await prisma.serviceConfig.findUnique({
      where: { serviceName: 'EMAIL' }
    });
    
    const configData = config?.config as any;
    return {
      enabled: config?.isEnabled || false,
      smtpHost: configData?.smtpHost,
      smtpPort: configData?.smtpPort || 587,
      smtpSecure: configData?.smtpSecure || false,
      smtpUser: configData?.smtpUser,
      smtpPass: configData?.smtpPass,
      smtpFrom: configData?.smtpFrom || 'noreply@fundifyhub.com'
    };
  }

  /**
   * Check if WhatsApp should process jobs (both enabled AND active)
   */
  async canProcessWhatsAppJobs(): Promise<boolean> {
    const config = await prisma.serviceConfig.findUnique({
      where: { serviceName: 'WHATSAPP' }
    });
    
    return (config?.isEnabled && config?.isActive) || false;
  }

  /**
   * Check if Email should process jobs (both enabled AND active)
   */
  async canProcessEmailJobs(): Promise<boolean> {
    const config = await prisma.serviceConfig.findUnique({
      where: { serviceName: 'EMAIL' }
    });
    
    return (config?.isEnabled && config?.isActive) || false;
  }

  /**
   * Update service status in database
   */
  async updateServiceStatus(
    serviceName: string,
    status: {
      isActive: boolean;
      connectionStatus: string;
      lastError?: string;
    }
  ): Promise<void> {
    try {
      await prisma.serviceConfig.upsert({
        where: { serviceName: serviceName.toUpperCase() },
        update: {
          isActive: status.isActive,
          connectionStatus: status.connectionStatus,
          lastConnectedAt: status.isActive ? new Date() : undefined,
          lastError: status.lastError || null,
          lastErrorAt: status.lastError ? new Date() : null,
          updatedAt: new Date()
        },
        create: {
          serviceName: serviceName.toUpperCase(),
          isEnabled: false,
          isActive: status.isActive,
          connectionStatus: status.connectionStatus,
          lastConnectedAt: status.isActive ? new Date() : undefined,
          lastError: status.lastError || null,
          lastErrorAt: status.lastError ? new Date() : null
        }
      });

      logger.info(`✓ ${serviceName} status: ${status.connectionStatus}`);
    } catch (error) {
      logger.error(`Error updating ${serviceName} status:`, error as Error);
    }
  }
}

// Singleton instance
export const configManager = new ConfigManager();
export default configManager;