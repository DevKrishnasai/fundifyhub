// OTP job processing functions for the job worker
import { createLogger } from '@fundifyhub/logger';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import { configManager } from './config-manager';
import { jobWorkerEventService } from './event-service';

const logger = createLogger({ serviceName: 'otp-job-processor' });

export interface OTPJobData {
  userId: string;
  recipient: string; // phone number or email
  otp: string;
  userName: string;
  type: 'WHATSAPP' | 'EMAIL';
  templateType?: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD';
}

// WhatsApp client for OTP sending
let whatsappClient: Client | null = null;
let isWhatsAppReady = false;

// Email transporter
let emailTransporter: nodemailer.Transporter | null = null;

/**
 * Properly destroy WhatsApp client
 */
export async function destroyWhatsApp(): Promise<void> {
  if (whatsappClient) {
    try {
      await whatsappClient.logout();
      await whatsappClient.destroy();
      whatsappClient = null;
      isWhatsAppReady = false;
    } catch (error) {
      logger.error('Error destroying WhatsApp client:', error as Error);
      // Force cleanup
      whatsappClient = null;
      isWhatsAppReady = false;
    }
  }
  
  // Always update status to disabled when destroying
  const { configManager } = await import('./config-manager');
  await configManager.updateServiceStatus('WHATSAPP', {
    isActive: false,
    connectionStatus: 'DISABLED'
  });
}

/**
 * Properly destroy Email transporter
 */
export async function destroyEmail(): Promise<void> {
  if (emailTransporter) {
    try {
      emailTransporter = null;
    } catch (error) {
      logger.error('Error destroying email transporter:', error as Error);
      emailTransporter = null;
    }
  }
  
  // Always update status to disabled when destroying
  const { configManager } = await import('./config-manager');
  await configManager.updateServiceStatus('EMAIL', {
    isActive: false,
    connectionStatus: 'DISABLED'
  });
}

/**
 * Test email service by sending a test email to itself
 */
async function testEmailService(transporter: nodemailer.Transporter, emailAddress: string): Promise<{success: boolean, error?: string}> {
  try {
    const testSubject = 'Test Email from Fundify';
    const testMessage = 'Its just a test mail from fundify';

    await transporter.sendMail({
      from: `"FundifyHub Service" <${emailAddress}>`,
      to: emailAddress,
      subject: testSubject,
      text: testMessage
    });

    return { success: true };
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('📧 Test email failed:', error as Error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Initialize WhatsApp client from database config
 */
export async function initializeWhatsApp(): Promise<void> {
  const whatsappConfig = await configManager.getWhatsAppConfig();
  
  if (!whatsappConfig.enabled) {
    // Destroy existing client if any
    await destroyWhatsApp();
    await configManager.updateServiceStatus('WHATSAPP', {
      isActive: false,
      connectionStatus: 'DISABLED'
    });
    return;
  }

  // Always destroy previous instance to ensure clean initialization
  if (whatsappClient) {
    await destroyWhatsApp();
  }

  try {
    // Mark as initializing
    await configManager.updateServiceStatus('WHATSAPP', {
      isActive: false,
      connectionStatus: 'INITIALIZING'
    });
    
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: whatsappConfig.clientId || 'fundifyhub-job-worker'
      }),
      puppeteer: {
        headless: true,
        executablePath: 'C:\\Users\\aksga\\.cache\\puppeteer\\chromium\\win64-1045629\\chrome-win\\chrome.exe',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // QR Code event
    whatsappClient.on('qr', async (qr) => {
      qrcode.generate(qr, { small: true });

      
      try {
        // Generate base64 QR code image for frontend
        const qrCodeImage = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Emit QR code event to main backend
        await jobWorkerEventService.publishWhatsAppEvent({
          type: 'QR_CODE',
          data: {
            qrCode: qrCodeImage,
            qrText: qr,
            message: 'Scan this QR code with WhatsApp on your phone',
            timestamp: new Date(),
            connectionStatus: 'WAITING_FOR_QR_SCAN'
          }
        });

      } catch (error) {
        logger.error('Error generating/publishing QR code:', error as Error);
      }
      
      await configManager.updateServiceStatus('WHATSAPP', {
        isActive: false,
        connectionStatus: 'WAITING_FOR_QR_SCAN'
      });
    });

    // Ready event
    whatsappClient.on('ready', async () => {
      isWhatsAppReady = true;
      
      // Emit ready event to main backend
      await jobWorkerEventService.publishWhatsAppEvent({
        type: 'READY',
        data: {
          message: 'WhatsApp is connected and ready for OTP sending',
          timestamp: new Date(),
          connectionStatus: 'CONNECTED'
        }
      });
      
      await configManager.updateServiceStatus('WHATSAPP', {
        isActive: true,
        connectionStatus: 'CONNECTED'
      });
    });

    // Authentication events
    whatsappClient.on('authenticated', async () => {
      
      // Emit authenticated event to main backend
      await jobWorkerEventService.publishWhatsAppEvent({
        type: 'AUTHENTICATED',
        data: {
          message: 'WhatsApp authentication successful',
          timestamp: new Date(),
          connectionStatus: 'AUTHENTICATED'
        }
      });
      
      await configManager.updateServiceStatus('WHATSAPP', {
        isActive: false,
        connectionStatus: 'AUTHENTICATED'
      });
    });

    whatsappClient.on('auth_failure', async (msg) => {
      isWhatsAppReady = false;
      
      // Emit auth failure event to main backend
      await jobWorkerEventService.publishWhatsAppEvent({
        type: 'AUTH_FAILURE',
        data: {
          message: `Authentication failed: ${msg}`,
          timestamp: new Date(),
          connectionStatus: 'AUTH_FAILURE'
        }
      });
      
      await configManager.updateServiceStatus('WHATSAPP', {
        isActive: false,
        connectionStatus: 'AUTH_FAILURE',
        lastError: msg
      });
    });

    whatsappClient.on('disconnected', async (reason) => {
      isWhatsAppReady = false;
      
      // Emit disconnected event to main backend
      await jobWorkerEventService.publishWhatsAppEvent({
        type: 'DISCONNECTED',
        data: {
          message: `WhatsApp disconnected: ${reason}`,
          timestamp: new Date(),
          connectionStatus: 'DISCONNECTED'
        }
      });
      
      await configManager.updateServiceStatus('WHATSAPP', {
        isActive: false,
        connectionStatus: 'DISCONNECTED',
        lastError: reason
      });
    });

    await whatsappClient.initialize();
  } catch (error) {
    logger.error('Failed to initialize WhatsApp job worker:', error as Error);
    // Set to disabled state on initialization failure
    await configManager.updateServiceStatus('WHATSAPP', {
      isActive: false,
      connectionStatus: 'DISABLED',
      lastError: `Initialization failed: ${(error as Error).message}`
    });
  }
}

/**
 * Initialize email transporter from database config
 */
export async function initializeEmail(): Promise<void> {
  try {
    const emailConfig = await configManager.getEmailConfig();
    
    if (!emailConfig.enabled) {
      emailTransporter = null;
      await configManager.updateServiceStatus('EMAIL', {
        isActive: false,
        connectionStatus: 'DISABLED'
      });
      return;
    }

    if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPass) {
      emailTransporter = null;
      await configManager.updateServiceStatus('EMAIL', {
        isActive: false,
        connectionStatus: 'DISABLED',
        lastError: 'Missing SMTP host, user, or password'
      });
      return;
    }

    // Gmail-specific configuration
    const isGmail = emailConfig.smtpHost?.toLowerCase().includes('gmail');
    const transportConfig: any = {
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort || 587,
      secure: emailConfig.smtpSecure || false,
      auth: {
        user: emailConfig.smtpUser,
        pass: emailConfig.smtpPass
      }
    };

    // Add Gmail-specific settings
    if (isGmail) {
      transportConfig.service = 'gmail';
      transportConfig.secure = emailConfig.smtpPort === 465;
      transportConfig.requireTLS = true;
      logger.info('📧 Detected Gmail - applying Gmail-specific SMTP settings');
    }

    emailTransporter = nodemailer.createTransport(transportConfig);

    // Test the connection
    await emailTransporter.verify();
    
    // Auto-test by sending email to itself
    const testResult = await testEmailService(emailTransporter, emailConfig.smtpUser);
    
    if (testResult.success) {
      logger.info('📧 Email service test successful - service ready');
      await configManager.updateServiceStatus('EMAIL', {
        isActive: true,
        connectionStatus: 'CONNECTED'
      });
    } else {
      logger.error('📧 Email service test failed:', new Error(testResult.error || 'Unknown error'));
      emailTransporter = null;
      await configManager.updateServiceStatus('EMAIL', {
        isActive: false,
        connectionStatus: 'DISABLED',
        lastError: `Test email failed: ${testResult.error}`
      });
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    logger.error('Failed to initialize email transporter:', error as Error);
    
    // Get config again for error handling
    const currentEmailConfig = await configManager.getEmailConfig();
    
    // Provide Gmail-specific error guidance
    let helpfulError = errorMessage;
    if (currentEmailConfig.smtpHost?.toLowerCase().includes('gmail')) {
      if (errorMessage.includes('Invalid login') || errorMessage.includes('Username and Password not accepted')) {
        helpfulError = 'Gmail authentication failed. Please use an App Password instead of your regular Gmail password. Generate one at: https://myaccount.google.com/apppasswords';
      } else if (errorMessage.includes('Less secure app access')) {
        helpfulError = 'Gmail requires App Passwords for third-party applications. Please generate an App Password at: https://myaccount.google.com/apppasswords';
      }
    }
    
    emailTransporter = null;
    await configManager.updateServiceStatus('EMAIL', {
      isActive: false,
      connectionStatus: 'DISABLED',
      lastError: helpfulError
    });
  }
}

/**
 * Process OTP sending job
 */
export async function processOTPJob(job: { id: string; data: OTPJobData }): Promise<any> {
  const { userId, recipient, otp, userName, type, templateType = 'VERIFICATION' } = job.data;
  
  try {
    logger.info(`Processing OTP job ${job.id} - Type: ${type}`);
    
    switch (type) {
      case 'WHATSAPP':
        return await processWhatsAppOTP(job.id, recipient, otp, userName, templateType);
        
      case 'EMAIL':
        return await processEmailOTP(job.id, recipient, otp, userName, templateType);
        
      default:
        throw new Error(`Unknown OTP job type: ${type}`);
    }
  } catch (error) {
    logger.error(`OTP job ${job.id} failed:`, error as Error);
    throw error;
  }
}

/**
 * Process WhatsApp OTP with service availability check
 */
async function processWhatsAppOTP(
  jobId: string,
  phoneNumber: string,
  otp: string,
  userName: string,
  templateType: string
): Promise<any> {
  // Check if WhatsApp service is enabled in database
  const whatsappConfig = await configManager.getWhatsAppConfig();
  
  if (!whatsappConfig.enabled) {
    logger.warn(`⏸️ WhatsApp service disabled for job ${jobId} - keeping in queue`);
    throw new Error('WhatsApp service is disabled in admin configuration');
  }

  // Check if WhatsApp client is ready
  if (!whatsappClient || !isWhatsAppReady) {
    logger.warn(`⏳ WhatsApp client not ready for job ${jobId} - will retry`);
    throw new Error('WhatsApp client not initialized. Please connect WhatsApp first.');
  }

  return await sendWhatsAppOTP(phoneNumber, otp, userName, templateType);
}

/**
 * Process Email OTP with service availability check
 */
async function processEmailOTP(
  jobId: string,
  email: string,
  otp: string,
  userName: string,
  templateType: string
): Promise<any> {
  // Check if Email service is enabled in database
  const emailConfig = await configManager.getEmailConfig();
  
  if (!emailConfig.enabled) {
    logger.warn(`⏸️ Email service disabled for job ${jobId} - keeping in queue`);
    throw new Error('Email service is disabled in admin configuration');
  }

  // Check if Email service is configured and transporter is available
  if (!emailTransporter) {
    logger.warn(`⏳ Email transporter not ready for job ${jobId} - will retry`);
    throw new Error('Email service not configured. Please configure SMTP settings.');
  }

  return await sendEmailOTP(email, otp, userName, templateType);
}

/**
 * Format phone number for WhatsApp with country code handling
 */
function formatPhoneForWhatsApp(phoneNumber: string): string {
  try {
    // Remove all non-digit characters first
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Indian numbers (add 91 if missing)
    if (cleaned.length === 10) {
      // Standard 10-digit Indian number without country code
      cleaned = '91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // Handle numbers like 09299998626 (remove leading 0 and add 91)
      cleaned = '91' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // Already has Indian country code - keep as is
    } else if (cleaned.length === 13 && cleaned.startsWith('911')) {
      // Handle cases like 9119299998626 (remove extra 1)
      cleaned = cleaned.substring(1);
    } else if (cleaned.length < 10) {
      throw new Error(`Invalid phone number: too short (${cleaned.length} digits)`);
    } else if (cleaned.length > 13) {
      throw new Error(`Invalid phone number: too long (${cleaned.length} digits)`);
    }
    
    // Final validation for Indian numbers
    if (cleaned.length !== 12 || !cleaned.startsWith('91')) {
      throw new Error(`Invalid Indian phone number format: ${phoneNumber} -> ${cleaned}`);
    }
    
    return cleaned;
  } catch (error) {
    logger.error(`Phone formatting error: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Send WhatsApp OTP
 */
async function sendWhatsAppOTP(
  phoneNumber: string,
  otp: string,
  userName: string,
  templateType: string
): Promise<{ success: boolean; message: string }> {
  if (!whatsappClient || !isWhatsAppReady) {
    throw new Error('WhatsApp client not ready. Please initialize first.');
  }

  try {
    const message = generateWhatsAppMessage(otp, userName, templateType);
    
    // Use the improved phone formatting function
    const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
    const chatId = `${formattedPhone}@c.us`;

    await whatsappClient.sendMessage(chatId, message);
    
    logger.info(`WhatsApp OTP sent successfully`);
    return { success: true, message: 'WhatsApp OTP sent successfully' };
  } catch (error) {
    logger.error(`❌ Failed to send WhatsApp OTP to ${phoneNumber}:`, error as Error);
    throw error;
  }
}

/**
 * Send Email OTP
 */
async function sendEmailOTP(
  email: string,
  otp: string,
  userName: string,
  templateType: string
): Promise<{ success: boolean; message: string }> {
  if (!emailTransporter) {
    logger.warn(`❌ Email transporter not available. SMTP not configured.`);
    return { 
      success: false, 
      message: 'Email service not configured. Please configure SMTP settings.' 
    };
  }

  try {
    const { subject, html } = generateEmailTemplate(otp, userName, templateType);
    const emailConfig = await configManager.getEmailConfig();

    await emailTransporter.sendMail({
      from: emailConfig.smtpFrom || emailConfig.smtpUser || 'noreply@fundifyhub.com',
      to: email,
      subject,
      html
    });

    logger.info(`Email OTP sent successfully`);
    return { success: true, message: 'Email OTP sent successfully' };
  } catch (error) {
    logger.error(`❌ Failed to send email OTP to ${email}:`, error as Error);
    throw error;
  }
}

/**
 * Generate WhatsApp message
 */
function generateWhatsAppMessage(otp: string, userName: string, templateType: string): string {
  const templates = {
    VERIFICATION: `🔐 *FundifyHub Verification*

Hi ${userName}!

Your verification code is: *${otp}*

This code will expire in 10 minutes.

_Please do not share this code with anyone._`,

    LOGIN: `🔑 *FundifyHub Login*

Hi ${userName}!

Your login verification code is: *${otp}*

This code will expire in 5 minutes.

_If you didn't request this, please ignore._`,

    RESET_PASSWORD: `🔄 *FundifyHub Password Reset*

Hi ${userName}!

Your password reset code is: *${otp}*

This code will expire in 15 minutes.

_If you didn't request this, please secure your account._`
  };

  return templates[templateType as keyof typeof templates] || templates.VERIFICATION;
}

/**
 * Generate email template
 */
function generateEmailTemplate(otp: string, userName: string, templateType: string): { subject: string; html: string } {
  const templates = {
    VERIFICATION: {
      subject: 'Verify Your FundifyHub Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Account Verification</h2>
          <p>Hi ${userName},</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #1f2937; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    },
    LOGIN: {
      subject: 'FundifyHub Login Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Login Verification</h2>
          <p>Hi ${userName},</p>
          <p>Your login verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #1f2937; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please secure your account.</p>
        </div>
      `
    },
    RESET_PASSWORD: {
      subject: 'Reset Your FundifyHub Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Password Reset</h2>
          <p>Hi ${userName},</p>
          <p>Your password reset code is:</p>
          <div style="background: #fef2f2; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #dc2626; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please secure your account immediately.</p>
        </div>
      `
    }
  };

  return templates[templateType as keyof typeof templates] || templates.VERIFICATION;
}

/**
 * Get OTP service status
 */
export function getOTPServiceStatus(): {
  whatsapp: { ready: boolean; initialized: boolean };
  email: { ready: boolean; initialized: boolean };
} {
  return {
    whatsapp: {
      ready: isWhatsAppReady,
      initialized: whatsappClient !== null
    },
    email: {
      ready: emailTransporter !== null,
      initialized: emailTransporter !== null
    }
  };
}