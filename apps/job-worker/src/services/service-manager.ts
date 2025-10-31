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
import nodemailer from 'nodemailer';
import { prisma } from '@fundifyhub/prisma';
import { SimpleLogger } from '@fundifyhub/logger';

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
  public initialize(logger: SimpleLogger) {
    this.logger = logger;
    const contextLogger = this.logger.child('[service-manager]');
    contextLogger.info('Initialized');
    
    try {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const fromEmail = process.env.SMTP_FROM;

      if (host && port && user && pass) {
        this.state.emailConfig = {
          smtpHost: host,
          smtpPort: port,
          smtpUser: user,
          smtpPass: pass,
          fromEmail,
          smtpSecure: port === 465,
        };

        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });

        this.setEmailTransporter(transporter);
        const emailLogger = this.logger.child('[email-service]');
        emailLogger.info('Transporter created from environment');
      }
    } catch (envErr) {
      // Silent - no SMTP env vars configured
    }

    this.startPeriodicCheck();
  }

  /**
   * Start periodic checking of service status from database
   */
  private startPeriodicCheck() {
    this.checkAndAutoStartServices();
    
    this.checkInterval = setInterval(() => {
      this.checkServices();
    }, 10000);
  }
  
  /**
   * Check services and auto-start enabled ones on first initialization
   */
  private async checkAndAutoStartServices() {
    try {
      const services = await prisma.serviceConfig.findMany({
        where: {
          serviceName: {
            in: ['EMAIL', 'WHATSAPP']
          }
        }
      });

      for (const service of services) {
        if (service.serviceName === 'WHATSAPP' && service.isEnabled && !this.state.whatsappClient) {
          const contextLogger = this.logger.child('[whatsapp-service]');
          contextLogger.info('Auto-starting enabled service');
          
          const { startWhatsAppService } = await import('./whatsapp-service');;
          await startWhatsAppService();
        }
        
        if (service.serviceName === 'EMAIL') {
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
            in: ['EMAIL', 'WHATSAPP']
          }
        }
      });

      for (const service of services) {
        if (service.serviceName === 'EMAIL') {
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
            
            if (JSON.stringify(this.state.emailConfig) !== JSON.stringify(newEmailConfig)) {
              this.state.emailConfig = newEmailConfig;
            }
          } else {
            if (this.state.emailConfig !== null) {
              this.state.emailConfig = null;
            }
          }
        }
        
        if (service.serviceName === 'WHATSAPP') {
          if (service.isEnabled && service.isActive && this.lastWhatsAppState === false) {
            this.lastWhatsAppState = true;
            const contextLogger = this.logger.child('[whatsapp-service]');
            contextLogger.info('Connected and ready');
          } else if (!service.isActive && this.lastWhatsAppState !== false) {
            this.lastWhatsAppState = false;
          }
        }
      }
    } catch (error) {
      const contextLogger = this.logger.child('[service-manager]');
      contextLogger.error('Failed to check services:', error);
    }
  }

  /**
   * Set WhatsApp client (called by service-control worker)
   */
  public setWhatsAppClient(client: Client | null) {
    this.state.whatsappClient = client;
  }

  /**
   * Set Email transporter (called by service-control worker)
   */
  public setEmailTransporter(transporter: Transporter | null) {
    this.state.emailTransporter = transporter;
  }

  /**
   * Check if WhatsApp service is available
   */
  public async isWhatsAppAvailable(): Promise<boolean> {
    try {
      const service = await prisma.serviceConfig.findUnique({
        where: { serviceName: 'WHATSAPP' }
      });
      
      // Check if service is enabled, client exists, AND client is ready
      if (!service?.isEnabled) {
        return false;
      }
      
      if (!this.state.whatsappClient) {
        return false;
      }
      
      // Check if client is in a ready state
      const clientState = await this.state.whatsappClient.getState();
      return clientState === 'CONNECTED';
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
