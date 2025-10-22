import { createLogger } from '@fundifyhub/logger';
import { prisma } from '@fundifyhub/prisma';
import { config } from '../config';

const logger = createLogger({ serviceName: 'service-config' });

export interface ServiceConfigData {
  serviceName: 'WHATSAPP' | 'EMAIL';
  isEnabled: boolean;
  config: {
    // WhatsApp specific
    clientId?: string;
    // Email specific
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
  };
}

export interface ServiceStatus {
  serviceName: string;
  isEnabled: boolean;
  isActive: boolean;
  connectionStatus: string;
  lastConnectedAt?: Date;
  lastError?: string;
  config?: any;
}

class ServiceConfigService {
  /**
   * Get all service configurations
   */
  async getAllConfigs(): Promise<{
    success: boolean;
    data?: ServiceStatus[];
    message: string;
  }> {
    try {
      const configs = await prisma.serviceConfig.findMany({
        orderBy: { serviceName: 'asc' }
      });

      const serviceStatuses: ServiceStatus[] = configs.map(config => ({
        serviceName: config.serviceName,
        isEnabled: config.isEnabled,
        isActive: config.isActive,
        connectionStatus: config.connectionStatus,
        lastConnectedAt: config.lastConnectedAt || undefined,
        lastError: config.lastError || undefined,
        config: config.config
      }));

      return {
        success: true,
        data: serviceStatuses,
        message: 'Service configurations retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting service configs:', error as Error);
      return {
        success: false,
        message: 'Failed to get service configurations'
      };
    }
  }

  /**
   * Get specific service configuration
   */
  async getServiceConfig(serviceName: string): Promise<{
    success: boolean;
    data?: ServiceStatus;
    message: string;
  }> {
    try {
      const config = await prisma.serviceConfig.findUnique({
        where: { serviceName: serviceName.toUpperCase() }
      });

      if (!config) {
        return {
          success: false,
          message: `Service configuration for ${serviceName} not found`
        };
      }

      const serviceStatus: ServiceStatus = {
        serviceName: config.serviceName,
        isEnabled: config.isEnabled,
        isActive: config.isActive,
        connectionStatus: config.connectionStatus,
        lastConnectedAt: config.lastConnectedAt || undefined,
        lastError: config.lastError || undefined,
        config: config.config
      };

      return {
        success: true,
        data: serviceStatus,
        message: 'Service configuration retrieved successfully'
      };
    } catch (error) {
      logger.error(`Error getting service config for ${serviceName}:`, error as Error);
      return {
        success: false,
        message: `Failed to get service configuration for ${serviceName}`
      };
    }
  }

  /**
   * Update service configuration
   */
  async updateServiceConfig(
    serviceName: string,
    configData: Partial<ServiceConfigData>,
    adminUserId: string
  ): Promise<{
    success: boolean;
    data?: ServiceStatus;
    message: string;
  }> {
    try {
      const updatedConfig = await prisma.serviceConfig.upsert({
        where: { serviceName: serviceName.toUpperCase() },
        update: {
          isEnabled: configData.isEnabled ?? undefined,
          config: configData.config ?? undefined,
          configuredBy: adminUserId,
          configuredAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          serviceName: serviceName.toUpperCase(),
          isEnabled: configData.isEnabled ?? false,
          config: configData.config ?? {},
          configuredBy: adminUserId,
          configuredAt: new Date()
        }
      });

      const serviceStatus: ServiceStatus = {
        serviceName: updatedConfig.serviceName,
        isEnabled: updatedConfig.isEnabled,
        isActive: updatedConfig.isActive,
        connectionStatus: updatedConfig.connectionStatus,
        lastConnectedAt: updatedConfig.lastConnectedAt || undefined,
        lastError: updatedConfig.lastError || undefined,
        config: updatedConfig.config
      };

      logger.info(`Service configuration updated for ${serviceName} by admin ${adminUserId}`);

      return {
        success: true,
        data: serviceStatus,
        message: `Service configuration for ${serviceName} updated successfully`
      };
    } catch (error) {
      logger.error(`Error updating service config for ${serviceName}:`, error as Error);
      return {
        success: false,
        message: `Failed to update service configuration for ${serviceName}`
      };
    }
  }

  /**
   * Update service status (called by job-worker)
   */
  async updateServiceStatus(
    serviceName: string,
    status: {
      isActive: boolean;
      connectionStatus: string;
      lastError?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await prisma.serviceConfig.upsert({
        where: { serviceName: serviceName.toUpperCase() },
        update: {
          isActive: status.isActive,
          connectionStatus: status.connectionStatus,
          lastConnectedAt: status.isActive ? new Date() : undefined,
          lastError: status.lastError,
          lastErrorAt: status.lastError ? new Date() : undefined,
          updatedAt: new Date()
        },
        create: {
          serviceName: serviceName.toUpperCase(),
          isEnabled: false,
          isActive: status.isActive,
          connectionStatus: status.connectionStatus,
          lastConnectedAt: status.isActive ? new Date() : undefined,
          lastError: status.lastError,
          lastErrorAt: status.lastError ? new Date() : undefined
        }
      });

      logger.info(`Service status updated for ${serviceName}: ${status.connectionStatus}`);

      return {
        success: true,
        message: `Service status updated for ${serviceName}`
      };
    } catch (error) {
      logger.error(`Error updating service status for ${serviceName}:`, error as Error);
      return {
        success: false,
        message: `Failed to update service status for ${serviceName}`
      };
    }
  }

  /**
   * Get enabled services only
   */
  async getEnabledServices(): Promise<{
    success: boolean;
    data?: ServiceStatus[];
    message: string;
  }> {
    try {
      const configs = await prisma.serviceConfig.findMany({
        where: { isEnabled: true },
        orderBy: { serviceName: 'asc' }
      });

      const serviceStatuses: ServiceStatus[] = configs.map(config => ({
        serviceName: config.serviceName,
        isEnabled: config.isEnabled,
        isActive: config.isActive,
        connectionStatus: config.connectionStatus,
        lastConnectedAt: config.lastConnectedAt || undefined,
        lastError: config.lastError || undefined,
        config: config.config
      }));

      return {
        success: true,
        data: serviceStatuses,
        message: 'Enabled service configurations retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting enabled services:', error as Error);
      return {
        success: false,
        message: 'Failed to get enabled service configurations'
      };
    }
  }

  /**
   * Initialize default service configurations
   */
  async initializeDefaultConfigs(): Promise<void> {
    try {
      const defaultServices = ['WHATSAPP', 'EMAIL'];
      
      for (const serviceName of defaultServices) {
        const existing = await prisma.serviceConfig.findUnique({
          where: { serviceName }
        });

        if (!existing) {
          await prisma.serviceConfig.create({
            data: {
              serviceName,
              isEnabled: false,
              isActive: false,
              connectionStatus: 'DISCONNECTED',
              config: {}
            }
          });
          logger.info(`Default configuration created for ${serviceName}`);
        }
      }
    } catch (error) {
      logger.error('Error initializing default configs:', error as Error);
    }
  }
}

// Singleton instance
export const serviceConfigService = new ServiceConfigService();
export default serviceConfigService;