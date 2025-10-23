import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';
import { jobQueueService } from './job-queue';
import { OTPData, SendOTPResponse, VerifyOTPResponse } from '../types';

const logger = createLogger({ serviceName: 'otp-service' });

// In-memory OTP storage (replace with database in production)
const otpStorage = new Map<string, OTPData>();

class OTPService {
  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store OTP in memory
   */
  private storeOTP(userId: string, otp: string, type: 'PHONE' | 'EMAIL'): void {
    const key = `${userId}-${type}`;
    const expiresAt = new Date(Date.now() + config.otp.expiresInMinutes * 60 * 1000);
    
    otpStorage.set(key, {
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
      type,
      userId
    });
    
    logger.info(`📝 OTP stored for user ${userId} (${type}): expires at ${expiresAt.toLocaleString()}`);
  }

  /**
   * Check which OTP services are available
   */
  private async getAvailableServices(): Promise<{
    whatsapp: boolean;
    email: boolean;
  }> {
    try {
      // Import service config service to check database configuration
      const { serviceConfigService } = await import('./service-config');
      const result = await serviceConfigService.getEnabledServices();
      
      if (!result.success || !result.data) {
        return { whatsapp: false, email: false };
      }

      const whatsappService = result.data.find(s => s.serviceName === 'WHATSAPP');
      const emailService = result.data.find(s => s.serviceName === 'EMAIL');

      return {
        whatsapp: !!(whatsappService?.isEnabled && whatsappService?.isActive),
        email: !!(emailService?.isEnabled && emailService?.isActive)
      };
    } catch (error) {
      logger.error('Error checking available services:', error as Error);
      return { whatsapp: false, email: false };
    }
  }

  /**
   * Send WhatsApp OTP via job queue (checks if service is enabled)
   */
  async sendWhatsAppOTP(
    userId: string,
    phoneNumber: string,
    userName: string = 'User',
    templateType: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD' = 'VERIFICATION'
  ): Promise<SendOTPResponse> {
    try {
      // Check if any OTP service is available (WhatsApp or Email)
      const availableServices = await this.getAvailableServices();
      if (!availableServices.whatsapp && !availableServices.email) {
        return {
          success: false,
          message: 'No OTP services are currently configured. Please contact administrator.'
        };
      }

      if (!availableServices.whatsapp) {
        return {
          success: false,
          message: 'WhatsApp OTP service is not currently available. Please try email OTP or contact administrator.'
        };
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP
      this.storeOTP(userId, otp, 'PHONE');
      
      // Queue WhatsApp job
      await jobQueueService.addWhatsAppOTP({
        recipient: phoneNumber,
        otp,
        userName,
        templateType
      });
      
      logger.info(`✅ WhatsApp OTP queued for ${phoneNumber}`);
      return {
        success: true,
        message: 'WhatsApp OTP queued successfully',
        ...(config.env.isDevelopment && { otp })
      };
      
    } catch (error) {
      logger.error('Error sending WhatsApp OTP:', error as Error);
      return {
        success: false,
        message: 'Failed to send WhatsApp OTP. Please try again.'
      };
    }
  }

  /**
   * Send Email OTP via job queue (checks if service is enabled)
   */
  async sendEmailOTP(
    userId: string,
    email: string,
    userName: string = 'User',
    templateType: 'VERIFICATION' | 'LOGIN' | 'RESET_PASSWORD' = 'VERIFICATION'
  ): Promise<SendOTPResponse> {
    try {
      // Check if any OTP service is available
      const availableServices = await this.getAvailableServices();
      if (!availableServices.whatsapp && !availableServices.email) {
        return {
          success: false,
          message: 'No OTP services are currently configured. Please contact administrator.'
        };
      }

      if (!availableServices.email) {
        return {
          success: false,
          message: 'Email OTP service is not currently available. Please try WhatsApp OTP or contact administrator.'
        };
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP
      this.storeOTP(userId, otp, 'EMAIL');
      
      // Queue Email job
      await jobQueueService.addEmailOTP({
        recipient: email,
        otp,
        userName,
        templateType
      });
      
      logger.info(`✅ Email OTP queued for ${email}`);
      return {
        success: true,
        message: 'Email OTP queued successfully',
        ...(config.env.isDevelopment && { otp })
      };
      
    } catch (error) {
      logger.error('Error sending Email OTP:', error as Error);
      return {
        success: false,
        message: 'Failed to send Email OTP. Please try again.'
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    userId: string,
    inputOtp: string,
    type: 'PHONE' | 'EMAIL' = 'PHONE'
  ): Promise<VerifyOTPResponse> {
    try {
      const key = `${userId}-${type}`;
      const stored = otpStorage.get(key);
      
      if (!stored) {
        return {
          success: false,
          message: 'No OTP found. Please request a new one.'
        };
      }
      
      // Check if already verified
      if (stored.verified) {
        return {
          success: false,
          message: 'OTP already used. Please request a new one.'
        };
      }
      
      // Check expiry
      if (new Date() > stored.expiresAt) {
        otpStorage.delete(key);
        return {
          success: false,
          message: 'OTP expired. Please request a new one.'
        };
      }
      
      // Check attempts
      if (stored.attempts >= config.otp.maxAttempts) {
        otpStorage.delete(key);
        return {
          success: false,
          message: 'Too many attempts. Please request a new OTP.'
        };
      }
      
      // Verify OTP
      if (stored.otp === inputOtp) {
        stored.verified = true;
        logger.info(`✅ OTP verified successfully for user ${userId} (${type})`);
        return {
          success: true,
          message: 'OTP verified successfully'
        };
      } else {
        stored.attempts++;
        logger.warn(`❌ Invalid OTP attempt for user ${userId} (${type}). Attempts: ${stored.attempts}/${config.otp.maxAttempts}`);
        return {
          success: false,
          message: `Invalid OTP. ${config.otp.maxAttempts - stored.attempts} attempts remaining.`
        };
      }
      
    } catch (error) {
      logger.error('Error verifying OTP:', error as Error);
      return {
        success: false,
        message: 'OTP verification failed. Please try again.'
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    success: boolean;
    stats?: any;
    message: string;
  }> {
    try {
      const stats = await jobQueueService.getQueueStats();
      return {
        success: true,
        stats,
        message: 'Queue stats retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error as Error);
      return {
        success: false,
        message: 'Failed to get queue stats'
      };
    }
  }

  /**
   * Get stored OTPs for debugging (development only)
   */
  getStoredOTPs(): Array<{
    userId: string;
    type: string;
    otp: string;
    expiresAt: string;
    attempts: number;
    verified: boolean;
  }> {
    if (!config.env.isDevelopment) {
      return [];
    }

    const otps = [];
    for (const [key, value] of otpStorage.entries()) {
      const [userId, type] = key.split('-');
      otps.push({
        userId,
        type,
        otp: value.otp,
        expiresAt: value.expiresAt.toLocaleString(),
        attempts: value.attempts,
        verified: value.verified
      });
    }
    return otps;
  }

  /**
   * Cleanup expired OTPs
   */
  private cleanupExpiredOTPs(): void {
    const now = new Date();
    let cleared = 0;
    
    for (const [key, data] of otpStorage.entries()) {
      if (now > data.expiresAt) {
        otpStorage.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      logger.info(`🧹 Cleared ${cleared} expired OTPs`);
    }
  }

  /**
   * Initialize cleanup interval
   */
  constructor() {
    // Clean up expired OTPs every 5 minutes
    setInterval(() => this.cleanupExpiredOTPs(), 5 * 60 * 1000);
    logger.info('OTP Service initialized with queue integration');
  }
}

// Singleton instance
export const otpService = new OTPService();
export default otpService;