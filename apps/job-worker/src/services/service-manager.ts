import { Client } from 'whatsapp-web.js';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { prisma } from '@fundifyhub/prisma';
import { SimpleLogger } from '@fundifyhub/logger';
import { CONNECTION_STATUS, SERVICE_NAMES } from '@fundifyhub/types';
import EventEmitter from 'events';

interface ServiceState {
  whatsappClient: Client | null;
  emailTransporter: Transporter | null;
  emailConfig: EmailConfig | null;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail?: string;
  smtpSecure?: boolean;
}

class ServiceManager {
  private static instance: ServiceManager;
  private state: ServiceState = {
    whatsappClient: null,
    emailTransporter: null,
    emailConfig: null,
  };
  
  private checkInterval: NodeJS.Timeout | null = null;
  private logger: any;
  private lastWhatsAppState: boolean | null = null;
  private emitter = new EventEmitter();
  // cached availability per service name
  private statusMap: Record<string, boolean | null> = {};

  private constructor() {}

  // Get singleton instance
  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * Initialize service manager with logger
   * Starts periodic checking of service status
   */
  public initialize(logger: SimpleLogger) {
    this.logger = logger;
    const contextLogger = this.logger.child('[service-manager]');
    contextLogger.info('Initialized');
    
    // Email transporter will be provided / updated from DB-driven service configs
    // (see checkServices() which reads service.config and starts email service accordingly).

    this.startPeriodicCheck();
  }

  /**
   * Start periodic checking of service status from database
   */
  private startPeriodicCheck() {
    // Initial check and auto-start
    this.checkAndAutoStartServices();
    
    // Check every 2 minutes (120000ms)
    this.checkInterval = setInterval(() => {
      this.checkServices();
    }, 120000);
  }
  
  /**
   * Check services and auto-start enabled ones on first initialization
   */
  private async checkAndAutoStartServices() {
    try {
      const services = await prisma.serviceConfig.findMany({
        where: {
          serviceName: {
            in: Object.values(SERVICE_NAMES)
          }
        }
      });

      for (const service of services) {
        if (service.serviceName === SERVICE_NAMES.WHATSAPP && service.isEnabled && !this.state.whatsappClient) {
          const contextLogger = this.logger.child('[whatsapp-service]');
          contextLogger.info('Auto-starting enabled service');

          const { startWhatsAppService } = await import('./whatsapp-service');
          await startWhatsAppService();
        }
        
        if (service.serviceName === SERVICE_NAMES.EMAIL) {
          if (service.isEnabled && this.state.emailTransporter) {
            const contextLogger = this.logger.child('[email-service]');
            contextLogger.info('Service enabled and ready');
          }
        }
      }
      
      this.checkServices();
    } catch (error) {
      const contextLogger = this.logger.child('[service-manager]');
      contextLogger.error('Failed to auto-start services:', error);
      this.checkServices();
    }
  }

  /**
   * Check service status from database
   */
  private async checkServices() {
    try {
      const services = await prisma.serviceConfig.findMany({
        where: {
          serviceName: {
            in: Object.values(SERVICE_NAMES)
          }
        }
      });

  for (const service of services) {
  // Handle Email Service
        if (service.serviceName === SERVICE_NAMES.EMAIL) {
          const contextLogger = this.logger.child('[email-service]');
          
          if (service.isEnabled) {
            // Check if we need to start or reconfigure email service
            if (service.config) {
              const config = service.config as Record<string, any>;
              
              const newEmailConfig: EmailConfig = {
                smtpHost: String(config.smtpHost || ''),
                smtpPort: parseInt(String(config.smtpPort || '587')),
                smtpUser: String(config.smtpUser || ''),
                smtpPass: String(config.smtpPass || ''),
                fromEmail: config.fromEmail || config.from,
                smtpSecure: config.smtpSecure === true || parseInt(String(config.smtpPort || '587')) === 465,
              };

              // If config changed or no transporter exists, (re)start email service
              if (!this.state.emailTransporter || JSON.stringify(this.state.emailConfig) !== JSON.stringify(newEmailConfig)) {
                contextLogger.info('Starting/updating email service with new configuration');
                this.state.emailConfig = newEmailConfig;
                
                try {
                  const { startEmailService } = await import('./email-service');
                  await startEmailService();
                } catch (err) {
                  contextLogger.error('Failed to start/update email service:', err);
                }
              } else {
                // Verify existing transporter is still working
                try {
                  await this.state.emailTransporter.verify();
                  contextLogger.debug('Email transporter verified successfully');
                } catch (err) {
                  contextLogger.warn('Email transporter verification failed, attempting restart');
                  const { startEmailService } = await import('./email-service');
                  await startEmailService();
                }
              }
            }
          } else if (!service.isEnabled && this.state.emailTransporter) {
            // Service is disabled but we have an active transporter - stop it
            contextLogger.info('Stopping disabled email service');
            try {
              const { stopEmailService } = await import('./email-service');
              await stopEmailService();
            } catch (err) {
              contextLogger.error('Error stopping email service:', err);
            }
          }
  }
        
  // Handle WhatsApp Service
        if (service.serviceName === SERVICE_NAMES.WHATSAPP) {
          const contextLogger = this.logger.child('[whatsapp-service]');
          
          if (service.isEnabled) {
            if (!this.state.whatsappClient) {
              contextLogger.info('Starting WhatsApp service');
              try {
                const { startWhatsAppService } = await import('./whatsapp-service');
                await startWhatsAppService();
              } catch (err) {
                contextLogger.error('Failed to start WhatsApp service:', err);
              }
            } else {
              // Update state tracking
              if (service.isActive && this.lastWhatsAppState === false) {
                this.lastWhatsAppState = true;
                contextLogger.info('Connected and ready');
              }
            }
          } else if (!service.isEnabled && this.state.whatsappClient) {
            // Service is disabled but client exists - stop it
            contextLogger.info('Stopping disabled WhatsApp service');
            try {
              const { stopWhatsAppService } = await import('./whatsapp-service');
              await stopWhatsAppService();
              this.lastWhatsAppState = false;
            } catch (err) {
              contextLogger.error('Error stopping WhatsApp service:', err);
            }
          } else if (!service.isActive && this.lastWhatsAppState !== false) {
            this.lastWhatsAppState = false;
          }

        // Emit status change event if availability changed
        try {
          const available = await this.computeAvailabilityForService(service.serviceName as SERVICE_NAMES);
          const prev = this.statusMap[service.serviceName] ?? null;
          if (prev !== available) {
            this.statusMap[service.serviceName] = available;
            this.emitter.emit('serviceStatus', { serviceName: service.serviceName, available });
            const statusLogger = this.logger.child('[service-manager]');
            statusLogger.info(`Service status changed: ${service.serviceName} -> ${available ? 'available' : 'unavailable'}`);
          }
        } catch (emitErr) {
          const statusLogger = this.logger.child('[service-manager]');
          statusLogger.warn('Failed to compute/emit status for', service.serviceName, emitErr);
        }
        }
      }
    } catch (error) {
      const contextLogger = this.logger.child('[service-manager]');
      contextLogger.error('Failed to check services:', error);
    }
  }

  // compute availability for a specific service name (shared logic)
  private async computeAvailabilityForService(name: SERVICE_NAMES): Promise<boolean> {
    if (name === SERVICE_NAMES.WHATSAPP) {
      try {
        const service = await prisma.serviceConfig.findUnique({ where: { serviceName: SERVICE_NAMES.WHATSAPP } });
        if (!service?.isEnabled) return false;
        if (!this.state.whatsappClient) return false;
        const clientState = await this.state.whatsappClient.getState() as string;
        return clientState === CONNECTION_STATUS.CONNECTED;
      } catch (err) {
        return false;
      }
    }

    if (name === SERVICE_NAMES.EMAIL) {
      try {
        const service = await prisma.serviceConfig.findUnique({ where: { serviceName: SERVICE_NAMES.EMAIL } });
        return !!(service?.isEnabled && this.state.emailTransporter);
      } catch (err) {
        return false;
      }
    }

    return false;
  }

  /**
   * Set WhatsApp client (called by service-control worker)
   */
  public setWhatsAppClient(client: Client | null) {
    this.state.whatsappClient = client;
    // emit immediate change when client object changes
    const available = !!client;
    const prev = this.statusMap[SERVICE_NAMES.WHATSAPP] ?? null;
    if (prev !== available) {
      this.statusMap[SERVICE_NAMES.WHATSAPP] = available;
      this.emitter.emit('serviceStatus', { serviceName: SERVICE_NAMES.WHATSAPP, available });
    }
  }

  /**
   * Set Email transporter (called by service-control worker)
   */
  public setEmailTransporter(transporter: Transporter | null) {
    this.state.emailTransporter = transporter;
    const available = !!transporter;
    const prev = this.statusMap[SERVICE_NAMES.EMAIL] ?? null;
    if (prev !== available) {
      this.statusMap[SERVICE_NAMES.EMAIL] = available;
      this.emitter.emit('serviceStatus', { serviceName: SERVICE_NAMES.EMAIL, available });
    }
  }

  /**
   * Check if WhatsApp service is available
   */
  public async isWhatsAppAvailable(): Promise<boolean> {
    try {
      const service = await prisma.serviceConfig.findUnique({
        where: { serviceName: SERVICE_NAMES.WHATSAPP }
      });
      
      // Check if service is enabled, client exists, AND client is ready
      if (!service?.isEnabled) {
        return false;
      }
      
      if (!this.state.whatsappClient) {
        return false;
      }
      
      // Check if client is in a ready state
      const clientState = await this.state.whatsappClient.getState() as string;
      return clientState === CONNECTION_STATUS.CONNECTED;
    } catch (error) {
      this.logger.error('Failed to check WhatsApp availability:', error);
      return false;
    }
  }

  /**
   * Subscribe to service status changes.
   * Listener receives payload { serviceName, available }
   */
  public onServiceStatus(listener: (payload: { serviceName: string; available: boolean }) => void) {
    this.emitter.on('serviceStatus', listener);
  }

  /**
   * Get last known cached availability for a service (may be null if unknown)
   */
  public getCachedStatus(serviceName: SERVICE_NAMES): boolean | null {
    return this.statusMap[serviceName] ?? null;
  }

  /**
   * Check if Email service is available
   */
  public async isEmailAvailable(): Promise<boolean> {
    try {
      const service = await prisma.serviceConfig.findUnique({
        where: { serviceName: SERVICE_NAMES.EMAIL }
      });
      // Consider email available only when it's enabled in DB and a transporter is registered
      return !!(service?.isEnabled && this.state.emailTransporter);
    } catch (error) {
      this.logger.error('Failed to check Email availability:', error);
      return false;
    }
  }

  /**
   * Get WhatsApp client (returns null if not available)
   */
  public getWhatsAppClient(): Client | null {
    return this.state.whatsappClient;
  }

  /**
   * Get Email transporter (returns null if not available)
   */
  public getEmailTransporter(): Transporter | null {
    return this.state.emailTransporter;
  }

  /**
   * Get Email config (returns null if not available)
   */
  public getEmailConfig(): EmailConfig | null {
    return this.state.emailConfig;
  }

  /**
   * Stop periodic checking
   */
  public shutdown() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.logger.info('[ServiceManager] Shutdown complete');
    }
  }
}

export const serviceManager = ServiceManager.getInstance();
