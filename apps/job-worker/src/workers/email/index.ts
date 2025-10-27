/**
 * Email Worker
 *
 * Handles email delivery jobs for user notifications.
 * Extends BaseWorker for common functionality and single logger instance.
 */

import { Job } from 'bullmq';
import { BaseWorker } from '../base-worker';
import { QUEUE_NAMES } from '@fundifyhub/utils';
import { EmailJobData } from '@fundifyhub/types';
import { serviceManager } from '../../services/service-manager';

export class EmailWorker extends BaseWorker<EmailJobData> {
  constructor(logger: any) {
    super(QUEUE_NAMES.EMAIL, logger);
  }

  /**
   * Process Email Jobs
   * Routes jobs to appropriate email handler
   */
  protected async processJob(job: Job<EmailJobData>): Promise<{ success: boolean }> {
    const { recipient, subject, template, templateData, userId } = job.data;

    try {
      // Check if Email service is available
      const isAvailable = await serviceManager.isEmailAvailable();
      if (!isAvailable) {
        this.logger.warn(`[Job ${job.id}] [EMAIL] Service not available - will retry`);
        throw new Error('Email service is not enabled or not configured');
      }

      await this.sendEmail(recipient, subject, template, templateData || {});
      this.logger.info(`[Job ${job.id}] [EMAIL] Sent to ${recipient}: ${subject}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`[Job ${job.id}] [EMAIL] Failed:`, error as Error);
      throw error;
    }
  }

  /**
   * Send Email
   */
  private async sendEmail(
    email: string,
    subject: string,
    template: string,
    templateData: Record<string, any>
  ): Promise<void> {
    try {
      // Get email config from ServiceManager
      const emailConfig = serviceManager.getEmailConfig();

      if (!emailConfig) {
        throw new Error('Email service configuration is not available');
      }

      // Create transporter dynamically
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

      // Process template with data
      let processedSubject = subject;
      let processedHtml = template;

      // Replace template variables
      Object.entries(templateData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedSubject = processedSubject.replace(regex, String(value));
        processedHtml = processedHtml.replace(regex, String(value));
      });

      await transporter.sendMail({
        from: emailConfig.fromEmail || emailConfig.smtpUser,
        to: email,
        subject: processedSubject,
        html: processedHtml,
      });
    } catch (error) {
      this.logger.error(`[EMAIL] Failed to send email to ${email}:`, error as Error);
      throw error;
    }
  }
}