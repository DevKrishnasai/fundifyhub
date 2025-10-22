// OTP job processing functions for the job worker
import { createLogger } from '@fundifyhub/logger';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import { configManager } from './config-manager';
import { progressEmitter } from './progress-emitter';

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
let isWhatsAppInitializing = false; // Lock to prevent concurrent initialization
let whatsappQRTimeout: NodeJS.Timeout | null = null; // Timeout for QR code scanning

// Email transporter
let emailTransporter: nodemailer.Transporter | null = null;
let isEmailInitializing = false; // Lock to prevent concurrent initialization

/**
 * Properly destroy WhatsApp client
 */
export async function destroyWhatsApp(): Promise<void> {
  // Clear QR timeout if it exists
  if (whatsappQRTimeout) {
    clearTimeout(whatsappQRTimeout);
    whatsappQRTimeout = null;
  }

  // Don't destroy if currently initializing
  if (isWhatsAppInitializing) {
    logger.info('⏳ WhatsApp is initializing, skipping destroy');
    return;
  }

  if (whatsappClient) {
    try {
      logger.info('🔄 Destroying WhatsApp client...');
      
      // First, try to logout gracefully
      try {
        await Promise.race([
          whatsappClient!.logout(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
        ]);
        logger.info('✓ WhatsApp logout successful');
      } catch (logoutError) {
        logger.warn(`⚠️ WhatsApp logout failed or timed out, proceeding with destroy: ${logoutError}`);
      }

      // Then destroy the client
      try {
        await Promise.race([
          whatsappClient!.destroy(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Destroy timeout')), 5000))
        ]);
        logger.info('✓ WhatsApp client destroy successful');
      } catch (destroyError) {
        logger.warn(`⚠️ WhatsApp destroy failed or timed out: ${destroyError}`);
      }

      // Clear the reference first
      whatsappClient = null;
      isWhatsAppReady = false;

      // Update status in parallel (don't wait for these)
      Promise.all([
        (async () => {
          const { configManager } = await import('./config-manager');
          await configManager.updateServiceStatus('WHATSAPP', {
            isActive: false,
            connectionStatus: 'DISABLED'
          });
        })().catch(err => logger.error('Error updating DB status:', err)),
        (async () => {
          await progressEmitter.emitWhatsAppStatus('DISABLED', {
            message: 'WhatsApp service disabled'
          });
        })().catch(err => logger.error('Error emitting status:', err))
      ]);

      logger.info('✓ WhatsApp client cleanup completed');
    } catch (error) {
      logger.error('❌ Error destroying WhatsApp client:', error as Error);
      // Force cleanup even on error
      whatsappClient = null;
      isWhatsAppReady = false;
    }
  } else {
    // No client exists, just update status
    await Promise.all([
      (async () => {
        const { configManager } = await import('./config-manager');
        await configManager.updateServiceStatus('WHATSAPP', {
          isActive: false,
          connectionStatus: 'DISABLED'
        });
      })(),
      (async () => {
        await progressEmitter.emitWhatsAppStatus('DISABLED', {
          message: 'WhatsApp service disabled'
        });
      })()
    ]);
  }
}

/**
 * Properly destroy Email transporter
 */
export async function destroyEmail(): Promise<void> {
  if (emailTransporter) {
    try {
      emailTransporter = null;
      logger.info('✓ Email transporter destroyed');
    } catch (error) {
      logger.error('Error destroying email transporter:', error as Error);
      emailTransporter = null;
    }
  }
  
  // Wait for ALL async operations to complete
  await Promise.all([
    (async () => {
      const { configManager } = await import('./config-manager');
      await configManager.updateServiceStatus('EMAIL', {
        isActive: false,
        connectionStatus: 'DISABLED'
      });
    })(),
    (async () => {
      await progressEmitter.emitEmailStatus('DISABLED', {
        message: 'Email service disabled'
      });
    })()
  ]);
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
  // Prevent concurrent initialization - CHECK LOCK FIRST!
  if (isWhatsAppInitializing) {
    logger.info('⏳ WhatsApp initialization already in progress, skipping...');
    return;
  }

  // Set initialization lock IMMEDIATELY before doing anything else
  isWhatsAppInitializing = true;

  try {
    const whatsappConfig = await configManager.getWhatsAppConfig();
    
    if (!whatsappConfig.enabled) {
      logger.info('WhatsApp service is disabled, skipping initialization');
      await destroyWhatsApp();
      await configManager.updateServiceStatus('WHATSAPP', {
        isActive: false,
        connectionStatus: 'DISABLED'
      });
      return;
    }

    logger.info('🚀 Starting WhatsApp initialization...');
    
    // Emit initializing status
    await progressEmitter.emitWhatsAppStatus('INITIALIZING', {
      message: 'Starting WhatsApp initialization...'
    });
    
    // Destroy any existing client
    if (whatsappClient) {
      logger.info('🔄 Cleaning up existing WhatsApp client...');
      // Temporarily clear the lock to allow destruction
      isWhatsAppInitializing = false;
      await destroyWhatsApp();
      
      // Wait for Windows to release file locks (important on Windows)
      logger.info('⏳ Waiting for file locks to be released...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      isWhatsAppInitializing = true;
    }

    // Mark as initializing
    await configManager.updateServiceStatus('WHATSAPP', {
      isActive: false,
      connectionStatus: 'INITIALIZING'
    });
    
    logger.info('📱 Creating new WhatsApp client instance...');
    
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
        // Clear any existing timeout
        if (whatsappQRTimeout) {
          clearTimeout(whatsappQRTimeout);
        }

        // Set timeout for 3 minutes (180 seconds)
        whatsappQRTimeout = setTimeout(async () => {
          logger.warn('⏱️ QR code scan timeout (3 minutes) - destroying WhatsApp client');
          
          try {
            await Promise.all([
              progressEmitter.emitWhatsAppStatus('TIMEOUT', {
                message: 'QR code scan timeout. Please try connecting again.'
              }),
              configManager.updateServiceStatus('WHATSAPP', {
                isActive: false,
                connectionStatus: 'TIMEOUT',
                lastError: 'QR code not scanned within 3 minutes'
              })
            ]);

            // Destroy the client
            await destroyWhatsApp();
          } catch (error) {
            logger.error('Error handling QR timeout:', error as Error);
          }
        }, 180000); // 3 minutes

        // Wait for ALL async operations to complete
        await Promise.all([
          (async () => {
            // Generate base64 QR code image for frontend
            const qrCodeImage = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            // Emit QR code event to main backend via progress emitter
            await progressEmitter.emitWhatsAppStatus('WAITING_FOR_QR_SCAN', {
              qrCode: qrCodeImage,
              qrText: qr,
              message: 'Scan this QR code with WhatsApp on your phone (expires in 3 minutes)'
            });
          })(),
          (async () => {
            await configManager.updateServiceStatus('WHATSAPP', {
              isActive: false,
              connectionStatus: 'WAITING_FOR_QR_SCAN'
            });
          })()
        ]);
      } catch (error) {
        logger.error('Error in QR code handler:', error as Error);
      }
    });

    // Ready event
    whatsappClient.on('ready', async () => {
      try {
        isWhatsAppReady = true;
        
        // Clear QR timeout since we're now connected
        if (whatsappQRTimeout) {
          clearTimeout(whatsappQRTimeout);
          whatsappQRTimeout = null;
        }
        
        // Wait for ALL async operations to complete
        await Promise.all([
          progressEmitter.emitWhatsAppStatus('CONNECTED', {
            message: 'WhatsApp is connected and ready for OTP sending'
          }),
          configManager.updateServiceStatus('WHATSAPP', {
            isActive: true,
            connectionStatus: 'CONNECTED'
          })
        ]);
      } catch (error) {
        logger.error('Error in ready handler:', error as Error);
      }
    });

    // Authentication events
    whatsappClient.on('authenticated', async () => {
      try {
        // Wait for ALL async operations to complete
        await Promise.all([
          progressEmitter.emitWhatsAppStatus('AUTHENTICATED', {
            message: 'WhatsApp authentication successful'
          }),
          configManager.updateServiceStatus('WHATSAPP', {
            isActive: false,
            connectionStatus: 'AUTHENTICATED'
          })
        ]);
      } catch (error) {
        logger.error('Error in authenticated handler:', error as Error);
      }
    });

    whatsappClient.on('auth_failure', async (msg) => {
      try {
        isWhatsAppReady = false;
        
        // Wait for ALL async operations to complete
        await Promise.all([
          progressEmitter.emitWhatsAppStatus('AUTH_FAILURE', {
            message: `Authentication failed: ${msg}`
          }),
          configManager.updateServiceStatus('WHATSAPP', {
            isActive: false,
            connectionStatus: 'AUTH_FAILURE',
            lastError: msg
          })
        ]);
      } catch (error) {
        logger.error('Error in auth_failure handler:', error as Error);
      }
    });

    whatsappClient.on('disconnected', async (reason) => {
      try {
        isWhatsAppReady = false;
        
        // Wait for ALL async operations to complete
        await Promise.all([
          progressEmitter.emitWhatsAppStatus('DISCONNECTED', {
            message: `WhatsApp disconnected: ${reason}`
          }),
          configManager.updateServiceStatus('WHATSAPP', {
            isActive: false,
            connectionStatus: 'DISCONNECTED',
            lastError: reason
          })
        ]);
      } catch (error) {
        logger.error('Error in disconnected handler:', error as Error);
      }
    });

    await whatsappClient.initialize();
    isWhatsAppInitializing = false; // Release lock after initialization starts
  } catch (error) {
    isWhatsAppInitializing = false; // Release lock on error
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
    logger.info('📧 Starting Email initialization...');
    
    // Emit initializing status
    await progressEmitter.emitEmailStatus('INITIALIZING', {
      message: 'Starting Email service initialization...'
    });

    const emailConfig = await configManager.getEmailConfig();
    
    if (!emailConfig.enabled) {
      logger.info('Email service is disabled, skipping initialization');
      emailTransporter = null;
      
      await Promise.all([
        configManager.updateServiceStatus('EMAIL', {
          isActive: false,
          connectionStatus: 'DISABLED'
        }),
        progressEmitter.emitEmailStatus('DISABLED', {
          message: 'Email service disabled'
        })
      ]);
      return;
    }

    if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPass) {
      emailTransporter = null;
      const errorMsg = 'Missing SMTP host, user, or password';
      
      await Promise.all([
        configManager.updateServiceStatus('EMAIL', {
          isActive: false,
          connectionStatus: 'DISABLED',
          lastError: errorMsg
        }),
        progressEmitter.emitEmailStatus('AUTH_FAILURE', {
          message: errorMsg
        })
      ]);
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

    logger.info('📧 Creating email transporter and testing connection...');
    emailTransporter = nodemailer.createTransport(transportConfig);

    // Test the connection
    await emailTransporter.verify();
    logger.info('📧 SMTP connection verified, sending test email...');
    
    // Auto-test by sending email to itself
    const testResult = await testEmailService(emailTransporter, emailConfig.smtpUser);
    
    if (testResult.success) {
      logger.info('📧 Email service test successful - service ready');
      
      await Promise.all([
        configManager.updateServiceStatus('EMAIL', {
          isActive: true,
          connectionStatus: 'CONNECTED'
        }),
        progressEmitter.emitEmailStatus('CONNECTED', {
          message: 'Email service connected and test email sent successfully'
        })
      ]);
    } else {
      logger.error('📧 Email service test failed:', new Error(testResult.error || 'Unknown error'));
      emailTransporter = null;
      
      await Promise.all([
        configManager.updateServiceStatus('EMAIL', {
          isActive: false,
          connectionStatus: 'DISABLED',
          lastError: `Test email failed: ${testResult.error}`
        }),
        progressEmitter.emitEmailStatus('AUTH_FAILURE', {
          message: `Test email failed: ${testResult.error}`
        })
      ]);
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
    
    await Promise.all([
      configManager.updateServiceStatus('EMAIL', {
        isActive: false,
        connectionStatus: 'DISABLED',
        lastError: helpfulError
      }),
      progressEmitter.emitEmailStatus('AUTH_FAILURE', {
        message: helpfulError
      })
    ]);
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
  // Check if WhatsApp service can process jobs (isEnabled AND isActive)
  const canProcess = await configManager.canProcessWhatsAppJobs();
  
  if (!canProcess) {
    logger.warn(`⏸️ WhatsApp service not ready for job ${jobId} - keeping in queue`);
    throw new Error('WhatsApp service is not active');
  }

  // Check if WhatsApp client is ready
  if (!whatsappClient || !isWhatsAppReady) {
    logger.warn(`⏳ WhatsApp client not ready for job ${jobId} - will retry`);
    throw new Error('WhatsApp client not initialized');
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
  // Check if Email service can process jobs (isEnabled AND isActive)
  const canProcess = await configManager.canProcessEmailJobs();
  
  if (!canProcess) {
    logger.warn(`⏸️ Email service not ready for job ${jobId} - keeping in queue`);
    throw new Error('Email service is not active');
  }

  // Check if Email transporter is available
  if (!emailTransporter) {
    logger.warn(`⏳ Email transporter not ready for job ${jobId} - will retry`);
    throw new Error('Email service not configured');
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