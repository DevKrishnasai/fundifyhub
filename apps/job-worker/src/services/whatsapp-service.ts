import { serviceManager } from './service-manager';
import { CONNECTION_STATUS } from '@fundifyhub/types';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { prisma } from '@fundifyhub/prisma';
import logger from '../utils/logger';

export const sendWhatsApp = async (opts: { to: string; text: string }) => {
  const client = serviceManager.getWhatsAppClient();
  if (!client) throw new Error('WhatsApp client not available');

  try {
    if (!opts.to || opts.to.trim() === '') {
      throw new Error('Recipient phone number is required');
    }
    
    if (opts.to.includes('@') && !opts.to.includes('@c.us')) {
      throw new Error(`Invalid phone number: received email address "${opts.to}" instead of phone number`);
    }
    
    let formattedNumber = opts.to;

    if (!formattedNumber.includes('@c.us')) {
      // remove non-digits but keep the raw digits
      let digits = formattedNumber.replace(/\D/g, '');

      if (!digits || digits.length === 0) {
        throw new Error(`Invalid phone number format: "${opts.to}" contains no digits`);
      }

      // Normalize to international format expected by WhatsApp (no leading 0, include country code)
  // Allow configuration via env DEFAULT_COUNTRY_DIAL (we primarily use Indian numbers here).
  // Fallback to '91' (India) when not provided.
  const DEFAULT_COUNTRY_DIAL = (process.env.DEFAULT_COUNTRY_DIAL || '91').replace(/\D/g, '');

      // If number starts with a leading zero (local format), replace it with country dial
      if (digits.startsWith('0')) {
        // local format like 0812... -> drop leading 0 and prepend country
        digits = `${DEFAULT_COUNTRY_DIAL}${digits.slice(1)}`;
      } else if (digits.length === 10) {
        // For Indian numbers provided as 10 digits (e.g. 9812345678), prepend country code 91
        digits = `${DEFAULT_COUNTRY_DIAL}${digits}`;
      }

      formattedNumber = `${digits}@c.us`;
    }
    
  const contextLogger = logger.child('[whatsapp-send]');
  contextLogger.debug(`Attempting WhatsApp send: original='${opts.to}', formatted='${formattedNumber}'`);

  const isRegistered = await client.isRegisteredUser(formattedNumber);
    if (!isRegistered) {
      throw new Error(`Phone number ${opts.to} is not registered on WhatsApp`);
    }
    
    const result = await client.sendMessage(formattedNumber, opts.text);
    return result;
  } catch (err: any) {
    const contextLogger = logger.child('[whatsapp-send]');
    contextLogger.error(`Failed to send to ${opts.to}:`, err);
    throw new Error(`WhatsApp send failed: ${err.message || 'Unknown error'}`);
  }
};

let whatsappClient: Client | null = null;

export const startWhatsAppService = async () => {
  try {
    if (whatsappClient) {
      const contextLogger = logger.child('[whatsapp-service]');
      contextLogger.warn('Service already running');
      return;
    }

    const serviceConfig = await prisma.serviceConfig.findUnique({
      where: { serviceName: 'WHATSAPP' }
    });

    if (!serviceConfig || !serviceConfig.isEnabled) {
      const contextLogger = logger.child('[whatsapp-service]');
      contextLogger.warn('Service not enabled in database');
      return;
    }

    await prisma.serviceConfig.upsert({
      where: { serviceName: 'WHATSAPP' },
      update: {
        connectionStatus: CONNECTION_STATUS.INITIALIZING,
        lastError: null,
      },
      create: {
        serviceName: 'WHATSAPP',
        isEnabled: true,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.INITIALIZING,
        config: {},
      }
    });

    const puppeteer = await import('puppeteer');
    const executablePath = puppeteer.executablePath();
    
    whatsappClient = new Client({
      authStrategy: new LocalAuth({ clientId: 'fundify-whatsapp' }),
      puppeteer: {
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      },
    });

    whatsappClient.on('qr', async (qr) => {
      const contextLogger = logger.child('[whatsapp-service]');
      contextLogger.info('QR Code received');
      
      try {
        const QRCode = await import('qrcode');
        const qrCodeDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        await prisma.serviceConfig.upsert({
          where: { serviceName: 'WHATSAPP' },
          update: {
            qrCode: qrCodeDataUrl,
            connectionStatus: CONNECTION_STATUS.WAITING_FOR_QR_SCAN,
          },
          create: {
            serviceName: 'WHATSAPP',
            isEnabled: true,
            isActive: false,
            connectionStatus: CONNECTION_STATUS.WAITING_FOR_QR_SCAN,
            config: {},
            qrCode: qrCodeDataUrl,
          }
        });
      } catch (err) {
        const errorLogger = logger.child('[whatsapp-service]');
        errorLogger.error('Failed to save QR code:', err as Error);
      }
    });

    whatsappClient.on('ready', async () => {
      const contextLogger = logger.child('[whatsapp-service]');
      contextLogger.info('Client ready');
      
      serviceManager.setWhatsAppClient(whatsappClient);
      
      await prisma.serviceConfig.upsert({
        where: { serviceName: 'WHATSAPP' },
        update: {
          isActive: true,
          connectionStatus: CONNECTION_STATUS.CONNECTED,
          lastConnectedAt: new Date(),
          lastError: null,
          qrCode: null,
        },
        create: {
          serviceName: 'WHATSAPP',
          isEnabled: true,
          isActive: true,
          connectionStatus: CONNECTION_STATUS.CONNECTED,
          config: {},
          lastConnectedAt: new Date(),
        }
      });
    });

    whatsappClient.on('authenticated', async () => {
      await prisma.serviceConfig.upsert({
        where: { serviceName: 'WHATSAPP' },
        update: {
          connectionStatus: CONNECTION_STATUS.AUTHENTICATED,
          qrCode: null,
        },
        create: {
          serviceName: 'WHATSAPP',
          isEnabled: true,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.AUTHENTICATED,
          config: {},
        }
      });
    });

    whatsappClient.on('auth_failure', async (msg) => {
      const contextLogger = logger.child('[whatsapp-service]');
      contextLogger.error(`Authentication failure: ${msg}`);
      await prisma.serviceConfig.upsert({
        where: { serviceName: 'WHATSAPP' },
        update: {
          isActive: false,
          connectionStatus: CONNECTION_STATUS.ERROR,
          lastError: 'Authentication failed',
          qrCode: null,
        },
        create: {
          serviceName: 'WHATSAPP',
          isEnabled: true,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.ERROR,
          config: {},
          lastError: 'Authentication failed',
        }
      });
    });

    whatsappClient.on('disconnected', async (reason) => {
      const contextLogger = logger.child('[whatsapp-service]');
      contextLogger.warn(`Client disconnected: ${reason}`);
      serviceManager.setWhatsAppClient(null);
      whatsappClient = null;
      
      await prisma.serviceConfig.upsert({
        where: { serviceName: 'WHATSAPP' },
        update: {
          isActive: false,
          connectionStatus: CONNECTION_STATUS.DISCONNECTED,
          qrCode: null,
        },
        create: {
          serviceName: 'WHATSAPP',
          isEnabled: false,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.DISCONNECTED,
          config: {},
        }
      });
    });

    await whatsappClient.initialize();
    
    const contextLogger = logger.child('[whatsapp-service]');
    contextLogger.info('Initialization started');
  } catch (error) {
    const contextLogger = logger.child('[whatsapp-service]');
    contextLogger.error('Failed to start service:', error as Error);
    
    whatsappClient = null;
    
    await prisma.serviceConfig.upsert({
      where: { serviceName: 'WHATSAPP' },
      update: {
        isActive: false,
        connectionStatus: CONNECTION_STATUS.ERROR,
        lastError: (error as Error).message,
        qrCode: null,
      },
      create: {
        serviceName: 'WHATSAPP',
        isEnabled: false,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.ERROR,
        config: {},
        lastError: (error as Error).message,
      }
    }).catch((err: unknown) => {
      const errorLogger = logger.child('[whatsapp-service]');
      errorLogger.error('Failed to update error status:', err instanceof Error ? err : new Error(String(err)));
    });
    
    throw error;
  }
};

export const stopWhatsAppService = async () => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
      whatsappClient = null;
    }
    
    serviceManager.setWhatsAppClient(null);
    
    await prisma.serviceConfig.upsert({
      where: { serviceName: 'WHATSAPP' },
      update: {
        isActive: false,
        connectionStatus: CONNECTION_STATUS.DISCONNECTED,
        qrCode: null,
      },
      create: {
        serviceName: 'WHATSAPP',
        isEnabled: false,
        isActive: false,
        connectionStatus: CONNECTION_STATUS.DISCONNECTED,
        config: {},
        qrCode: null,
      }
    });
    
    const contextLogger = logger.child('[whatsapp-service]');
    contextLogger.info('Service stopped successfully');
  } catch (error) {
    const contextLogger = logger.child('[whatsapp-service]');
    contextLogger.error('Failed to stop service:', error as Error);
    throw error;
  }
};

export default { sendWhatsApp, startWhatsAppService, stopWhatsAppService };