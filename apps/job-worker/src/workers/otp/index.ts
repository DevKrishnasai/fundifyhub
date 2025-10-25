/**
 * OTP Worker
 * 
 * Handles OTP delivery jobs for WhatsApp and Email.
 * Extends BaseWorker for common functionality and single logger instance.
 */

import { Job } from 'bullmq';
import { BaseWorker } from '../base-worker';
import { QUEUE_NAMES } from '@fundifyhub/utils';
import { OTPJobData } from '@fundifyhub/types';
import { serviceManager } from '../../services/service-manager';

export class OTPWorker extends BaseWorker<OTPJobData> {
  constructor(logger: any) {
    super(QUEUE_NAMES.OTP, logger);
  }

  /**
   * Process OTP Jobs
   * Routes jobs to appropriate OTP handler (WhatsApp/Email)
   */
  protected async processJob(job: Job<OTPJobData>): Promise<{ success: boolean }> {
    const { type, recipient, otp } = job.data;
    
    try {
      // Normalize type to string for comparison
      const otpType = String(type).toUpperCase();
      
      if (otpType === 'EMAIL') {
        // Check if Email service is available (enabled + configured)
        const isAvailable = await serviceManager.isEmailAvailable();
        if (!isAvailable) {
          this.logger.warn(`[Job ${job.id}] [EMAIL OTP] Service not available - will retry`);
          throw new Error('Email service is not enabled or not configured');
        }
        
        await this.sendEmailOTP(recipient, otp);
        this.logger.info(`[Job ${job.id}] [EMAIL] OTP sent to ${recipient}`);
      } else if (otpType === 'WHATSAPP') {
        // Check if WhatsApp service is available (enabled + connected)
        const isAvailable = await serviceManager.isWhatsAppAvailable();
        if (!isAvailable) {
          this.logger.warn(`[Job ${job.id}] [WhatsApp OTP] Service not available - will retry`);
          throw new Error('WhatsApp service is not enabled or not connected');
        }
        
        await this.sendWhatsAppOTP(recipient, otp);
        this.logger.info(`[Job ${job.id}] [WHATSAPP] OTP sent to ${recipient}`);
      } else {
        this.logger.warn(`[Job ${job.id}] [OTP] Invalid type: ${type}`);
        throw new Error(`Invalid OTP type: ${type}`);
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] [OTP] Failed:`, error as Error);
      throw error;
    }
  }

  /**
   * Send OTP via Email
   */
  private async sendEmailOTP(email: string, otp: string): Promise<void> {
    try {
      // Get email config from ServiceManager
      const emailConfig = serviceManager.getEmailConfig();
      
      if (!emailConfig) {
        throw new Error('Email service configuration is not available');
      }
      
      // Create transporter dynamically (ServiceManager provides latest config)
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort || 587,
        secure: emailConfig.smtpSecure || emailConfig.smtpPort === 465,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPass,
        },
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
              .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>FundifyHub</h1>
                <p>Verify Your Email Address</p>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Thank you for registering with FundifyHub. To complete your registration, please use the following One-Time Password (OTP):</p>
                <div class="otp-box">
                  <p style="margin: 0; color: #666;">Your OTP Code</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
                </div>
                <p>If you didn't request this code, please ignore this email.</p>
                <p>Best regards,<br>The FundifyHub Team</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 FundifyHub. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await transporter.sendMail({
        from: emailConfig.fromEmail || emailConfig.smtpUser,
        to: email,
        subject: 'Your FundifyHub Verification Code',
        html: htmlContent,
        text: `Your FundifyHub verification code is: ${otp}. Valid for 10 minutes.`
      });
    } catch (error) {
      this.logger.error(`[EMAIL] Failed to send OTP to ${email}:`, error as Error);
      throw error;
    }
  }

  /**
   * Send OTP via WhatsApp
   * Uses the WhatsApp client from ServiceManager
   */
  private async sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<void> {
    try {
      // Get WhatsApp client from ServiceManager
      const whatsappClient = serviceManager.getWhatsAppClient();
      
      if (!whatsappClient) {
        throw new Error('WhatsApp client is not available');
      }

      // Check if client is ready
      const state = await whatsappClient.getState();
      
      if (state !== 'CONNECTED') {
        throw new Error(`WhatsApp client is not ready. Current state: ${state}`);
      }

      // Format phone number (ensure it has country code and @c.us suffix)
      // Remove any non-digit characters (including + sign)
      let cleanNumber = phoneNumber.replace(/\D/g, '');
      
      // If already has @c.us, extract the number part
      if (phoneNumber.includes('@c.us')) {
        cleanNumber = phoneNumber.split('@')[0].replace(/\D/g, '');
      }
      
      const formattedNumber = `${cleanNumber}@c.us`;

      // Check if the number is registered on WhatsApp
      const numberId = await whatsappClient.getNumberId(cleanNumber);
      
      if (!numberId) {
        throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`);
      }
      
      // Use the verified number ID
      const chatId = numberId._serialized;

      // Send OTP message
      const message = `Your FundifyHub verification code is: *${otp}*\n\nValid for 10 minutes.\n\nDo not share this code with anyone.`;
      
      await whatsappClient.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error(`[WHATSAPP] Failed to send OTP to ${phoneNumber}:`, error as Error);
      throw error;
    }
  }
}
