/**
 * ServiceManager - Singleton
 * 
 * Centralized service instance manager that:
 * 1. Periodically checks database for enabled services
 * 2. Provides access to WhatsApp client and Email transporter
 * 3. Used by OTP worker to check service availability before processing
 */

import { Client } from 'whatsapp-web.js';
import type { Transporter } from 'nodemailer';
import { prisma } from '@fundifyhub/prisma';

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

  private constructor() {}

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
  public initialize(logger: any) {
    this.logger = logger;
    this.logger.info('[ServiceManager] Initialized');
    
    // Start periodic check every 10 seconds
    this.startPeriodicCheck();
  }

  /**
   * Start periodic checking of service status from database
   */
  private startPeriodicCheck() {
    // Initial check
    this.checkServices();
    
    // Periodic check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkServices();
    }, 10000);
  }

  /**
   * Check service status from database
   */
  private async checkServices() {
    try {
      const services = await prisma.serviceConfig.findMany({
        where: {
          serviceName: {
            in: ['EMAIL', 'WHATSAPP']
          }
        }
      });

      for (const service of services) {
        if (service.serviceName === 'EMAIL') {
          // Check if email config has changed
          if (service.isEnabled && service.config) {
            const config = service.config as Record<string, any>;
            
            const newEmailConfig: EmailConfig = {
              smtpHost: String(config.smtpHost || ''),
              smtpPort: parseInt(String(config.smtpPort || '587')),
              smtpUser: String(config.smtpUser || ''),
              smtpPass: String(config.smtpPass || ''),
              fromEmail: config.fromEmail || config.from,
              smtpSecure: config.smtpSecure === true || parseInt(String(config.smtpPort || '587')) === 465,
            };
            
            // Update email config if changed
            if (JSON.stringify(this.state.emailConfig) !== JSON.stringify(newEmailConfig)) {
              this.state.emailConfig = newEmailConfig;
              this.logger.info('[EMAIL] Configuration updated');
            }
          } else {
            if (this.state.emailConfig !== null) {
              this.state.emailConfig = null;
            }
          }
        }
        
        if (service.serviceName === 'WHATSAPP') {
          // Only log when state changes
          if (service.isEnabled && service.isActive !== this.lastWhatsAppState) {
            this.lastWhatsAppState = service.isActive;
            if (service.isActive) {
              this.logger.info('[WHATSAPP] Service is active and ready');
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to check services:', error);
    }
  }

  /**
   * Set WhatsApp client (called by service-control worker)
   */
  public setWhatsAppClient(client: Client | null) {
    this.state.whatsappClient = client;
    if (client) {
      this.logger.info('[WHATSAPP] Client registered in ServiceManager');
    } else {
      this.logger.info('[WHATSAPP] Client unregistered from ServiceManager');
    }
  }

  /**
   * Set Email transporter (called by service-control worker)
   */
  public setEmailTransporter(transporter: Transporter | null) {
    this.state.emailTransporter = transporter;
    if (transporter) {
      this.logger.info('[EMAIL] Transporter registered in ServiceManager');
    } else {
      this.logger.info('[EMAIL] Transporter unregistered from ServiceManager');
    }
  }

  /**
   * Check if WhatsApp service is available
   */
  public async isWhatsAppAvailable(): Promise<boolean> {
    try {
      const service = await prisma.serviceConfig.findUnique({
        where: { serviceName: 'WHATSAPP' }
      });
      
      return !!(service?.isEnabled && this.state.whatsappClient);
    } catch (error) {
      this.logger.error('Failed to check WhatsApp availability:', error);
      return false;
    }
  }

  /**
   * Check if Email service is available
   */
  public async isEmailAvailable(): Promise<boolean> {
    try {
      const service = await prisma.serviceConfig.findUnique({
        where: { serviceName: 'EMAIL' }
      });
      
      return !!(service?.isEnabled && this.state.emailConfig);
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
