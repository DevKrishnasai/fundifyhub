import { serviceManager } from './service-manager';
import { ConnectionStatus } from '@fundifyhub/types';
import nodemailer from 'nodemailer';
import { prisma } from '@fundifyhub/prisma';
import { logger } from '../logger';

export const sendEmail = async (opts: { to: string; subject: string; html?: string; text?: string }) => {
  const transporter = serviceManager.getEmailTransporter();
  const emailConfig = serviceManager.getEmailConfig();

  if (!transporter) throw new Error('Email transporter not available');

  const from = emailConfig?.fromEmail || undefined;

  return transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
};

export const startEmailService = async () => {
  try {
    const serviceConfig = await prisma.serviceConfig.findUnique({
      where: { serviceName: 'EMAIL' }
    });

    if (!serviceConfig || !serviceConfig.isEnabled) {
      const contextLogger = logger.child('[email-service]');
      contextLogger.warn('Service not enabled in database');
      return;
    }

    const config = serviceConfig.config as Record<string, any>;
    
    const transporter = nodemailer.createTransport({
      host: String(config.smtpHost || ''),
      port: parseInt(String(config.smtpPort || '587')),
      secure: config.smtpSecure === true || parseInt(String(config.smtpPort || '587')) === 465,
      auth: {
        user: String(config.smtpUser || ''),
        pass: String(config.smtpPass || ''),
      },
    });

    await transporter.verify();
    serviceManager.setEmailTransporter(transporter);
    
    await prisma.serviceConfig.upsert({
      where: { serviceName: 'EMAIL' },
      update: {
        isActive: true,
        connectionStatus: ConnectionStatus.CONNECTED,
        lastConnectedAt: new Date(),
        lastError: null,
      },
      create: {
        serviceName: 'EMAIL',
        isEnabled: true,
        isActive: true,
        connectionStatus: ConnectionStatus.CONNECTED,
        config: {},
        lastConnectedAt: new Date(),
      }
    });

    const contextLogger = logger.child('[email-service]');
    contextLogger.info('Service started successfully');
  } catch (error) {
    const contextLogger = logger.child('[email-service]');
    contextLogger.error('Failed to start service:', error as Error);
    
    await prisma.serviceConfig.upsert({
      where: { serviceName: 'EMAIL' },
      update: {
        isActive: false,
        connectionStatus: ConnectionStatus.ERROR,
        lastError: (error as Error).message,
      },
      create: {
        serviceName: 'EMAIL',
        isEnabled: false,
        isActive: false,
        connectionStatus: ConnectionStatus.ERROR,
        config: {},
        lastError: (error as Error).message,
      }
    }).catch((err: unknown) => {
      const errorLogger = logger.child('[email-service]');
      errorLogger.error('Failed to update error status:', err instanceof Error ? err : new Error(String(err)));
    });
    
    throw error;
  }
};

export const stopEmailService = async () => {
  try {
    serviceManager.setEmailTransporter(null);
    
    await prisma.serviceConfig.upsert({
      where: { serviceName: 'EMAIL' },
      update: {
        isActive: false,
        connectionStatus: ConnectionStatus.DISCONNECTED,
      },
      create: {
        serviceName: 'EMAIL',
        isEnabled: false,
        isActive: false,
        connectionStatus: ConnectionStatus.DISCONNECTED,
        config: {},
      }
    });

    const contextLogger = logger.child('[email-service]');
    contextLogger.info('Service stopped successfully');
  } catch (error) {
    const contextLogger = logger.child('[email-service]');
    contextLogger.error('Failed to stop service:', error as Error);
    throw error;
  }
};

export default { sendEmail, startEmailService, stopEmailService };