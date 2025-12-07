/**
 * Simple notification dispatcher for job-worker
 * Replaces @fundifyhub/notifications package with direct service calls
 */

import { NotificationChannel, NotificationPriority, DeliveryMode } from '@fundifyhub/types';
import { sendEmail } from '../services/email-service';
import { sendWhatsApp } from '../services/whatsapp-service';
import { prisma } from '@fundifyhub/prisma';
import logger from '../utils/logger';

// Helper to convert numeric NotificationPriority enum to Prisma string enum
function priorityToPrismaString(priority?: NotificationPriority): 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'BULK' {
  if (!priority) return 'NORMAL';
  switch (priority) {
    case NotificationPriority.CRITICAL: return 'CRITICAL';
    case NotificationPriority.HIGH: return 'HIGH';
    case NotificationPriority.NORMAL: return 'NORMAL';
    case NotificationPriority.LOW: return 'LOW';
    case NotificationPriority.BULK: return 'BULK';
    default: return 'NORMAL';
  }
}

// Helper to convert DeliveryMode enum to Prisma string enum
function deliveryModeToPrismaString(mode?: DeliveryMode): 'BROADCAST' | 'INDEPENDENT' | 'FALLBACK' | 'SINGLE' {
  if (!mode) return 'BROADCAST';
  return mode as any; // DeliveryMode already uses string values
}

export interface NotificationRecipient {
  email?: string;
  phoneNumber?: string;
  userId?: string;
  name?: string;
}

export interface NotificationRequest {
  correlationId?: string;
  templateName: string;
  variables: Record<string, any>;
  channels: NotificationChannel[];
  recipient: NotificationRecipient;
  deliveryMode?: DeliveryMode;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface ChannelResult {
  channel: NotificationChannel;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  error?: string;
  messageId?: string;
}

export interface NotificationResult {
  success: boolean;
  channelResults: ChannelResult[];
  error?: string;
}

/**
 * Simple template renderer - just returns the message with variables replaced
 */
function renderTemplate(templateName: string, variables: Record<string, any>): { subject: string; body: string } {
  // Simple template mapping - extend as needed
  const templates: Record<string, { subject: string; body: (v: any) => string }> = {
    OTP_VERIFICATION: {
      subject: 'Your OTP Code',
      body: (v) => `Your OTP code is: ${v.otpCode}. Valid for ${v.expiresInMinutes || 10} minutes.`,
    },
    WELCOME: {
      subject: 'Welcome to FundifyHub!',
      body: (v) => `Welcome ${v.userName || 'User'}! Thank you for joining FundifyHub.`,
    },
    EMI_REMINDER: {
      subject: 'EMI Payment Reminder',
      body: (v) => `Dear ${v.userName}, your EMI of ₹${v.emiAmount} is due on ${v.dueDate}.`,
    },
    EMI_OVERDUE: {
      subject: 'EMI Payment Overdue',
      body: (v) => `Dear ${v.userName}, your EMI of ₹${v.emiAmount} is overdue. Please pay immediately to avoid penalties.`,
    },
    REQUEST_SUBMITTED: {
      subject: 'Request Submitted Successfully',
      body: (v) => `Your request #${v.requestNumber} has been submitted successfully.`,
    },
    REQUEST_STATUS_NOTIFICATIONS: {
      subject: 'Request Status Update',
      body: (v) => `Your request #${v.requestNumber} status: ${v.status}`,
    },
    PASSWORD_RESET: {
      subject: 'Password Reset Request',
      body: (v) => `Click here to reset your password: ${v.resetLink}`,
    },
    LOGIN_ALERT: {
      subject: 'New Login Detected',
      body: (v) => `New login detected from ${v.device || 'unknown device'} at ${v.loginTime}.`,
    },
    ADMIN_USER_CREATED: {
      subject: 'Admin Account Created',
      body: (v) => `An admin account has been created for you. Your temporary password is: ${v.temporaryPassword}`,
    },
    ASSET_PLEDGE: {
      subject: 'Asset Pledge Confirmation',
      body: (v) => `Your asset #${v.assetId} has been pledged successfully.`,
    },
  };

  const template = templates[templateName];
  if (!template) {
    return {
      subject: templateName,
      body: JSON.stringify(variables),
    };
  }

  return {
    subject: template.subject,
    body: template.body(variables),
  };
}

/**
 * Send notification through multiple channels
 */
export async function sendNotification(request: NotificationRequest): Promise<NotificationResult> {
  const results: ChannelResult[] = [];
  const contextLogger = logger.child('[NotificationDispatcher]');

  // Render template
  const { subject, body } = renderTemplate(request.templateName, request.variables);

  // Send through each channel
  for (const channel of request.channels) {
    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (request.recipient.email) {
            await sendEmail({
              to: request.recipient.email,
              subject,
              html: body,
            });
            results.push({ channel, status: 'SENT' });
            contextLogger.info(`Email sent to ${request.recipient.email}`);
          } else {
            results.push({ channel, status: 'SKIPPED', error: 'No email provided' });
          }
          break;

        case NotificationChannel.WHATSAPP:
          if (request.recipient.phoneNumber) {
            await sendWhatsApp({
              to: request.recipient.phoneNumber,
              text: body,
            });
            results.push({ channel, status: 'SENT' });
            contextLogger.info(`WhatsApp sent to ${request.recipient.phoneNumber}`);
          } else {
            results.push({ channel, status: 'SKIPPED', error: 'No phone number provided' });
          }
          break;

        case NotificationChannel.IN_APP:
          if (request.recipient.userId) {
            // Create in-app notification using InAppNotification model
            await prisma.inAppNotification.create({
              data: {
                userId: request.recipient.userId,
                title: subject,
                message: body,
                category: request.variables.category as any || 'SYSTEM_ALERT', // TODO: Map from template name to NotificationCategoryType
                priority: 'NORMAL', // TODO: Map from request.priority to NotificationPriorityLevel
                isRead: false,
                requestId: request.variables.requestId as string || undefined,
                loanId: request.variables.loanId as string || undefined,
                metadata: request.metadata as any,
              },
            });
            results.push({ channel, status: 'SENT' });
            contextLogger.info(`In-app notification created for user ${request.recipient.userId}`);
          } else {
            results.push({ channel, status: 'SKIPPED', error: 'No userId provided' });
          }
          break;

        default:
          results.push({ channel, status: 'SKIPPED', error: `Channel ${channel} not implemented` });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ channel, status: 'FAILED', error: errorMsg });
      contextLogger.error(`Failed to send via ${channel}: ${errorMsg}`);
    }
  }

  // Determine overall success
  const sentCount = results.filter((r) => r.status === 'SENT').length;
  const success = sentCount > 0;

  return {
    success,
    channelResults: results,
    error: success ? undefined : 'All channels failed',
  };
}
