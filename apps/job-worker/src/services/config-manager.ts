import { createLogger } from '@fundifyhub/logger';
import { prisma } from '@fundifyhub/prisma';

const logger = createLogger({ serviceName: 'config-manager' });

export interface ServiceConfig {
  serviceName: string;
  isEnabled: boolean;
  isActive: boolean;
  config: any;
}

class ConfigManager {
  private configs: Map<string, ServiceConfig> = new Map();
  private lastFetch: Date | null = null;
  private readonly CACHE_DURATION = 60000; // 60 seconds

  /**
   * Fetch service configurations from database
   */
  async fetchConfigs(): Promise<ServiceConfig[]> {
    try {
      const dbConfigs = await prisma.serviceConfig.findMany({
        where: { isEnabled: true }
      });

      const configs: ServiceConfig[] = dbConfigs.map(config => ({
        serviceName: config.serviceName,
        isEnabled: config.isEnabled,
        isActive: config.isActive,
        config: config.config
      }));

      // Update cache
      this.configs.clear();
      configs.forEach(config => {
        this.configs.set(config.serviceName, config);
      });
      this.lastFetch = new Date();

      logger.info(`Fetched ${configs.length} enabled service configurations`);
      return configs;
    } catch (error) {
      logger.error('Error fetching service configs:', error as Error);
      return [];
    }
  }

  /**
   * Get service configuration with caching
   */
  async getServiceConfig(serviceName: string): Promise<ServiceConfig | null> {
    // Check if cache is valid
    const now = new Date();
    const cacheValid = this.lastFetch && 
      (now.getTime() - this.lastFetch.getTime()) < this.CACHE_DURATION;

    if (!cacheValid) {
      await this.fetchConfigs();
    }

    return this.configs.get(serviceName.toUpperCase()) || null;
  }

  /**
   * Check if service is enabled and get its config
   */
  async isServiceEnabled(serviceName: string): Promise<boolean> {
    const config = await this.getServiceConfig(serviceName);
    return config?.isEnabled || false;
  }

  /**
   * Get WhatsApp configuration
   */
  async getWhatsAppConfig(): Promise<{
    enabled: boolean;
    clientId?: string;
  }> {
    const config = await this.getServiceConfig('WHATSAPP');
    return {
      enabled: config?.isEnabled || false,
      clientId: config?.config?.clientId || 'fundifyhub-job-worker'
    };
  }

  /**
   * Get email configuration
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
    const config = await this.getServiceConfig('EMAIL');
    return {
      enabled: config?.isEnabled || false,
      smtpHost: config?.config?.smtpHost,
      smtpPort: config?.config?.smtpPort || 587,
      smtpSecure: config?.config?.smtpSecure || false,
      smtpUser: config?.config?.smtpUser,
      smtpPass: config?.config?.smtpPass,
      smtpFrom: config?.config?.smtpFrom || 'noreply@fundifyhub.com'
    };
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

      // Update local cache
      const existing = this.configs.get(serviceName.toUpperCase());
      if (existing) {
        existing.isActive = status.isActive;
        this.configs.set(serviceName.toUpperCase(), existing);
      }

      logger.info(`Service status updated: ${serviceName} - ${status.connectionStatus}`);
    } catch (error) {
      logger.error(`Error updating service status for ${serviceName}:`, error as Error);
    }
  }

  /**
   * Initialize with periodic config refresh
   */
  startPeriodicRefresh(): void {
    // Fetch configs every 2 minutes
    setInterval(async () => {
      await this.fetchConfigs();
    }, 2 * 60 * 1000);

    logger.info('Config manager started with periodic refresh (2 minutes)');
  }
}

// Singleton instance
export const configManager = new ConfigManager();
export default configManager;