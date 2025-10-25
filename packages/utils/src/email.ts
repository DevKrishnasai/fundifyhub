import * as nodemailer from 'nodemailer';
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'utils-email' });

export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

/**
 * Create a nodemailer transporter from EmailConfig
 */
export function createTransporter(cfg: EmailConfig) {
  const transportConfig: any = {
    host: cfg.smtpHost,
    port: cfg.smtpPort ?? 587,
    secure: cfg.smtpSecure ?? false,
    auth: cfg.smtpUser && cfg.smtpPass ? { user: cfg.smtpUser, pass: cfg.smtpPass } : undefined,
  };

  // Gmail heuristics
  if (cfg.smtpHost && cfg.smtpHost.includes('gmail.com')) {
    transportConfig.port = 587;
    transportConfig.secure = false;
  }

  return nodemailer.createTransport(transportConfig);
}

/**
 * Test email configuration by verifying transporter and optionally sending a quick test mail
 */
export async function testEmailConfiguration(cfg: EmailConfig) {
  try {
    const transporter = createTransporter(cfg);
    // verify connection
    await transporter.verify();

    // If smtpUser provided, try a harmless self-send to smtpUser
    if (cfg.smtpUser) {
      await transporter.sendMail({
        from: cfg.smtpFrom || cfg.smtpUser,
        to: cfg.smtpUser,
        subject: 'Fundify - Test Mail',
        text: 'This is a test email to validate SMTP configuration.',
        html: '<p>This is a test email to validate SMTP configuration.</p>',
      });
    }

    logger.info('✅ Email configuration test passed');
    return { success: true };
  } catch (error: any) {
    logger.error('❌ Email configuration test failed', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export default { createTransporter, testEmailConfiguration };
