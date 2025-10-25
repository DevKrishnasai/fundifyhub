import { Job } from 'bullmq';
import { ServiceControlJobData, ServiceName } from '@fundifyhub/types';
import { QUEUE_NAMES, SERVICE_ACTIONS, CONNECTION_STATUS } from '@fundifyhub/utils';
import { configManager } from './config-manager';
import { progressEmitter } from './progress-emitter';
import { BaseWorker } from '../base-worker';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { serviceManager } from '../../services/service-manager';

/**
 * WhatsApp Service State
 * Encapsulates all WhatsApp-related state in a single object
 */
interface WhatsAppState {
  client: import('whatsapp-web.js').Client | null;
  isReady: boolean;
  isInitializing: boolean;
  qrTimeout: NodeJS.Timeout | null;
}

/**
 * Email Service State
 * Encapsulates all Email/SMTP-related state in a single object
 */
interface EmailState {
  transporter: import('nodemailer').Transporter | null;
}

export class ServiceControlWorker extends BaseWorker<ServiceControlJobData> {
  // Service state objects - encapsulate all related state
  private whatsappState: WhatsAppState = {
    client: null,
    isReady: false,
    isInitializing: false,
    qrTimeout: null
  };

  private emailState: EmailState = {
    transporter: null
  };

  constructor(logger: any) {
    super(QUEUE_NAMES.SERVICE_CONTROL, logger);
    // Initialize progress emitter with shared logger
    progressEmitter.setLogger(logger);
  }

  /**
   * Process Service Control Jobs
   * Routes jobs to appropriate service handlers based on serviceName and action
   */
  protected async processJob(job: Job<ServiceControlJobData>): Promise<{ success: boolean }> {
    const { serviceName, action, triggeredBy } = job.data;
    this.logger.info(`[Job ${job.id}] [ServiceControl] [${serviceName}] ${action}${triggeredBy ? ` (by ${triggeredBy})` : ''}`);

    // Route job to appropriate service handler
    if (serviceName === ServiceName.WHATSAPP) {
      switch (action) {
        case SERVICE_ACTIONS.START:
          await this.initializeWhatsApp();
          break;
        case SERVICE_ACTIONS.STOP:
          await this.destroyWhatsApp();
          break;
        default:
          this.logger.warn(`[WHATSAPP] Unhandled action: ${action}`);
      }
    } else if (serviceName === ServiceName.EMAIL) {
      switch (action) {
        case SERVICE_ACTIONS.START:
          await this.initializeEmail();
          break;
        case SERVICE_ACTIONS.STOP:
          await this.destroyEmail();
          break;
        default:
          this.logger.warn(`[EMAIL] Unhandled action: ${action}`);
      }
    } else {
      this.logger.warn(`[ServiceControl] Unknown service: ${serviceName}`);
    }
    return { success: true };
  }

  /**
   * Initialize WhatsApp Service
   * 
   * Connects to WhatsApp Web using whatsapp-web.js library.
   * Generates QR code for authentication if not already authenticated.
   * Monitors connection status and emits events to backend.
   */
  private async initializeWhatsApp() {
    if (this.whatsappState.isInitializing) {
      this.logger.info('[WHATSAPP] Already initializing, skipping');
      return;
    }
    this.whatsappState.isInitializing = true;
    try {
      const whatsappConfig = await configManager.getWhatsAppConfig();
      if (!whatsappConfig.enabled) {
        this.logger.info('[WHATSAPP] Service disabled');
        await this.destroyWhatsApp();
        await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED });
        return;
      }
      await progressEmitter.emitWhatsAppStatus('INITIALIZING', { message: 'Starting WhatsApp initialization...' });
      if (this.whatsappState.client) {
        this.logger.info('[WHATSAPP] Cleaning up existing client');
        this.whatsappState.isInitializing = false;
        await this.destroyWhatsApp();
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.whatsappState.isInitializing = true;
      }
      await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.INITIALIZING });
      this.logger.info('[WHATSAPP] Initializing client...');
      this.whatsappState.client = new Client({
        authStrategy: new LocalAuth({ clientId: whatsappConfig.clientId || 'fundifyhub-job-worker' }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'
          ]
        }
      });
      
      // Log when client is created
      this.logger.info('[WHATSAPP] Client instance created, registering event handlers...');
      
      // Add loading screen handler to track progress
      this.whatsappState.client.on('loading_screen', (percent: number, message: string) => {
        this.logger.info(`[WHATSAPP] Loading: ${percent}% - ${message}`);
      });
      
      this.whatsappState.client.on('qr', async (qr: string) => {
        this.logger.info('[WHATSAPP] QR code received, generating image...');
        const QRCode = (await import('qrcode')).default;
        // Set timeout only on first QR code
        if (!this.whatsappState.qrTimeout) {
          this.whatsappState.qrTimeout = setTimeout(async () => {
            this.logger.warn('[WHATSAPP] QR code scan timeout (3 minutes) - disabling service');
            await progressEmitter.emitWhatsAppStatus('TIMEOUT', { message: 'QR code scan timeout. Please try connecting again.' });
            await configManager.disableService('WHATSAPP', 'QR code not scanned within 3 minutes');
            await this.destroyWhatsApp();
          }, 180000);
        }
        const qrCodeImage = await QRCode.toDataURL(qr, { width: 300, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
        await progressEmitter.emitWhatsAppStatus('WAITING_FOR_QR_SCAN', { qrCode: qrCodeImage, qrText: qr, message: 'Scan this QR code with WhatsApp on your phone' });
        await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.WAITING_FOR_QR_SCAN });
        // Store QR code in database for frontend to pick up
        await configManager.storeQRCode('WHATSAPP', qrCodeImage);
      });
      this.whatsappState.client.on('ready', async () => {
        this.logger.info('[WHATSAPP] Connected and ready');
        this.whatsappState.isReady = true;
        if (this.whatsappState.qrTimeout) { clearTimeout(this.whatsappState.qrTimeout); this.whatsappState.qrTimeout = null; }
        
        // Register WhatsApp client with ServiceManager
        serviceManager.setWhatsAppClient(this.whatsappState.client);
        
        await progressEmitter.emitWhatsAppStatus('CONNECTED', { message: 'WhatsApp is connected and ready for OTP sending' });
        await configManager.updateServiceStatus('WHATSAPP', { isActive: true, connectionStatus: CONNECTION_STATUS.CONNECTED });
        // Clear QR code once connected
        await configManager.clearQRCode('WHATSAPP');
      });
      this.whatsappState.client.on('authenticated', async () => {
        this.logger.info('[WHATSAPP] Authenticated');
        await progressEmitter.emitWhatsAppStatus('AUTHENTICATED', { message: 'WhatsApp authentication successful' });
        await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.AUTHENTICATED });
      });
      this.whatsappState.client.on('auth_failure', async (msg: string) => {
        this.logger.error('[WHATSAPP] Authentication failed:', new Error(msg));
        this.whatsappState.isReady = false;
        await progressEmitter.emitWhatsAppStatus('AUTH_FAILURE', { message: `Authentication failed: ${msg}` });
        await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.AUTH_FAILURE, lastError: msg });
      });
      this.whatsappState.client.on('disconnected', async (reason: string) => {
        this.logger.warn(`[WHATSAPP] Disconnected: ${reason}`);
        this.whatsappState.isReady = false;
        
        // Unregister client from ServiceManager
        serviceManager.setWhatsAppClient(null);
        
        await progressEmitter.emitWhatsAppStatus('DISCONNECTED', { message: `WhatsApp disconnected: ${reason}` });
        await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.DISCONNECTED, lastError: reason });
        
        // If disconnected due to logout, destroy the client gracefully
        if (reason === 'LOGOUT') {
          // Don't call destroyWhatsApp() here - it causes race conditions
          // The client is already disconnecting, just clean up references
          this.whatsappState.client = null;
          this.whatsappState.isReady = false;
          
          // Delete session data after logout (schedule it to avoid race conditions)
          setTimeout(async () => {
            try {
              const fs = await import('fs/promises');
              const path = await import('path');
              const sessionPath = path.join(process.cwd(), '.wwebjs_auth', 'session-fundifyhub-job-worker');
              await fs.rm(sessionPath, { recursive: true, force: true });
              this.logger.info('[WHATSAPP] Session data deleted after logout from phone');
            } catch (fsError) {
              // Ignore if folder doesn't exist or is locked
              this.logger.warn(`[WHATSAPP] Could not delete session data: ${fsError}`);
            }
          }, 3000); // Wait 3 seconds for browser to fully close
          
          // Update service status
          await configManager.disableService('WHATSAPP', 'Logged out from phone');
          await progressEmitter.emitWhatsAppStatus('LOGGED_OUT', { 
            message: 'WhatsApp logged out from phone. Please enable and scan QR code again to reconnect.' 
          });
        }
      });
      
      this.logger.info('[WHATSAPP] Starting client initialization (this may take 10-60 seconds)...');
      await this.whatsappState.client.initialize();
      this.logger.info('[WHATSAPP] Client initialization method completed');
      this.whatsappState.isInitializing = false;
    } catch (error) {
      this.whatsappState.isInitializing = false;
      this.logger.error('[WHATSAPP] Initialization failed:', error as Error);
      await configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED, lastError: `Initialization failed: ${(error as Error).message}` });
    }
  }

  /**
   * Destroy WhatsApp Service
   * 
   * Gracefully disconnects from WhatsApp Web.
   * Cleans up resources, clears timeouts, and updates status in DB.
   */
  private async destroyWhatsApp() {
    if (this.whatsappState.qrTimeout) { clearTimeout(this.whatsappState.qrTimeout); this.whatsappState.qrTimeout = null; }
    if (this.whatsappState.isInitializing) return;
    
    // Unregister WhatsApp client from ServiceManager
    serviceManager.setWhatsAppClient(null);
    
    if (this.whatsappState.client) {
      try {
        // Only logout if not already disconnected
        if (this.whatsappState.isReady) {
          try {
            await Promise.race([
              this.whatsappState.client.logout(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
            ]);
          } catch (logoutError) {
            this.logger.warn(`[WHATSAPP] Logout failed (expected if already logged out): ${logoutError}`);
          }
        }
        
        try {
          // Use a longer timeout and wrap in try-catch
          await Promise.race([
            this.whatsappState.client.destroy().catch(() => {
              // Silently ignore destroy errors as session might already be closed
            }),
            new Promise((resolve) => setTimeout(resolve, 3000))
          ]);
        } catch (destroyError) {
          // This is expected when session is already closed, just log it
          this.logger.warn(`[WHATSAPP] Destroy failed (expected during logout): ${destroyError}`);
        }
        
        this.whatsappState.client = null;
        this.whatsappState.isReady = false;
        
        Promise.all([
          configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED }),
          progressEmitter.emitWhatsAppStatus('DISABLED', { message: 'WhatsApp service disabled' })
        ]);
      } catch (error) {
        this.logger.error('[WHATSAPP] Destroy error:', error as Error);
        this.whatsappState.client = null;
        this.whatsappState.isReady = false;
      }
    } else {
      await Promise.all([
        configManager.updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED }),
        progressEmitter.emitWhatsAppStatus('DISABLED', { message: 'WhatsApp service disabled' })
      ]);
    }
  }

  /**
   * Initialize Email Service
   * 
   * Connects to SMTP server using nodemailer.
   * Validates connection and sends test email.
   * Monitors connection status and emits events to backend.
   */
  private async initializeEmail() {
    try {
      await progressEmitter.emitEmailStatus('INITIALIZING', { message: 'Starting Email service initialization...' });
      const emailConfig = await configManager.getEmailConfig();
      if (!emailConfig.enabled) {
        this.logger.info('[EMAIL] Service disabled');
        this.emailState.transporter = null;
        await Promise.all([
          configManager.updateServiceStatus('EMAIL', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED }),
          progressEmitter.emitEmailStatus('DISABLED', { message: 'Email service disabled' })
        ]);
        return;
      }
      if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPass) {
        this.logger.error('[EMAIL] Config missing required fields');
        this.emailState.transporter = null;
        const errorMsg = 'Missing SMTP host, user, or password';
        await Promise.all([
          configManager.updateServiceStatus('EMAIL', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED, lastError: errorMsg }),
          progressEmitter.emitEmailStatus('AUTH_FAILURE', { message: errorMsg })
        ]);
        return;
      }
      const isGmail = emailConfig.smtpHost?.toLowerCase().includes('gmail');
      const transportConfig: any = {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort || 587,
        secure: emailConfig.smtpSecure || false,
        auth: { user: emailConfig.smtpUser, pass: emailConfig.smtpPass }
      };
      if (isGmail) {
        transportConfig.service = 'gmail';
        transportConfig.secure = emailConfig.smtpPort === 465;
        transportConfig.requireTLS = true;
      }
      const nodemailer = await import('nodemailer');
      this.emailState.transporter = nodemailer.default.createTransport(transportConfig);
      this.logger.info('[EMAIL] Testing SMTP connection...');
      if (this.emailState.transporter) {
        await this.emailState.transporter.verify();
      }
      const testResult = await this.testEmailService(this.emailState.transporter, emailConfig.smtpUser);
      if (testResult.success) {
        this.logger.info('[EMAIL] Service connected');
        
        // Register Email transporter with ServiceManager
        serviceManager.setEmailTransporter(this.emailState.transporter);
        
        await Promise.all([
          configManager.updateServiceStatus('EMAIL', { isActive: true, connectionStatus: CONNECTION_STATUS.CONNECTED }),
          progressEmitter.emitEmailStatus('CONNECTED', { message: 'Email service connected and test email sent successfully' })
        ]);
      } else {
        this.logger.error('Email service test failed:', new Error(testResult.error || 'Unknown error'));
        this.emailState.transporter = null;
        await Promise.all([
          configManager.updateServiceStatus('EMAIL', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED, lastError: `Test email failed: ${testResult.error}` }),
          progressEmitter.emitEmailStatus('AUTH_FAILURE', { message: `Test email failed: ${testResult.error}` })
        ]);
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error('Failed to initialize email transporter:', error as Error);
      const currentEmailConfig = await configManager.getEmailConfig();
      let helpfulError = errorMessage;
      if (currentEmailConfig.smtpHost?.toLowerCase().includes('gmail')) {
        if (errorMessage.includes('Invalid login') || errorMessage.includes('Username and Password not accepted')) {
          helpfulError = 'Gmail authentication failed. Please use an App Password instead of your regular Gmail password. Generate one at: https://myaccount.google.com/apppasswords';
        } else if (errorMessage.includes('Less secure app access')) {
          helpfulError = 'Gmail requires App Passwords for third-party applications. Please generate an App Password at: https://myaccount.google.com/apppasswords';
        }
      }
      this.emailState.transporter = null;
      await Promise.all([
        configManager.updateServiceStatus('EMAIL', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED, lastError: helpfulError }),
        progressEmitter.emitEmailStatus('AUTH_FAILURE', { message: helpfulError })
      ]);
    }
  }

  /**
   * Destroy Email Service
   * 
   * Disconnects from SMTP server.
   * Cleans up resources and updates status in DB.
   */
  private async destroyEmail() {
    // Unregister Email transporter from ServiceManager
    serviceManager.setEmailTransporter(null);
    
    if (this.emailState.transporter) {
      try {
        this.emailState.transporter = null;
        this.logger.info('✓ Email transporter destroyed');
      } catch (error) {
        this.logger.error('Error destroying email transporter:', error as Error);
        this.emailState.transporter = null;
      }
    }
    await Promise.all([
      configManager.updateServiceStatus('EMAIL', { isActive: false, connectionStatus: CONNECTION_STATUS.DISABLED }),
      progressEmitter.emitEmailStatus('DISABLED', { message: 'Email service disabled' })
    ]);
  }

  /**
   * Test Email Service
   * 
   * Sends a test email to verify SMTP configuration.
   * Returns success status and error message if any.
   */
  private async testEmailService(transporter: any, emailAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      await transporter.sendMail({
        from: `"FundifyHub Service" <${emailAddress}>`,
        to: emailAddress,
        subject: 'Test Email from Fundify',
        text: 'Its just a test mail from fundify'
      });
      return { success: true };
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error('📧 Test email failed:', error as Error);
      return { success: false, error: errorMessage };
    }
  }
}
