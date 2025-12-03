/**
 * Notification Helper Service
 * 
 * Provides easy-to-use functions for queueing notifications from backend controllers.
 * This wraps the enqueue client and provides type-safe notification triggers.
 */

import queueClient from './queues';
import {
  TEMPLATE_NAMES,
  NotificationChannel,
  NotificationPriority,
  DeliveryMode,
} from '@fundifyhub/types';
import logger from './logger';

const notificationLogger = logger.child('[notifications]');

interface NotifyUserParams {
  userId: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
}

interface NotifyResult {
  success: boolean;
  correlationId?: string;
  error?: string;
}

/**
 * Send OTP verification notification
 */
export async function sendOTPNotification(
  recipient: NotifyUserParams,
  otpCode: string,
  expiresInMinutes: number = 10
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    if (channels.length === 0) {
      return { success: false, error: 'No contact information provided' };
    }

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.OTP_VERIFICATION,
      channels,
      deliveryMode: DeliveryMode.INDEPENDENT, // Different OTP per channel for security
      priority: NotificationPriority.HIGH,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        otpCode,
        expiresInMinutes,
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        verifyUrl: process.env.VERIFY_URL || 'https://fundifyhub.com/verify',
        logoUrl: process.env.LOGO_URL || '',
        companyUrl: process.env.COMPANY_URL || 'https://fundifyhub.com',
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue OTP notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending OTP notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send welcome notification to new user
 */
export async function sendWelcomeNotification(
  recipient: NotifyUserParams
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.WELCOME,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.NORMAL,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        companyUrl: process.env.COMPANY_URL || 'https://fundifyhub.com',
        logoUrl: process.env.LOGO_URL || '',
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue welcome notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending welcome notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send login alert notification
 */
export async function sendLoginAlertNotification(
  recipient: NotifyUserParams,
  loginInfo: { device: string; location: string; time: string }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.LOGIN_ALERT,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.HIGH,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        device: loginInfo.device,
        location: loginInfo.location,
        time: loginInfo.time,
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        resetPasswordUrl: process.env.RESET_PASSWORD_URL || 'https://fundifyhub.com/forgot-password',
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue login alert: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending login alert: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send password reset notification with reset link
 */
export async function sendPasswordResetNotification(
  recipient: NotifyUserParams,
  resetUrl: string,
  expiresInMinutes: number = 60
): Promise<NotifyResult> {
  try {
    // Only send via email - password reset should not go via WhatsApp/SMS
    const channels: NotificationChannel[] = [];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);

    if (channels.length === 0) {
      return { success: false, error: 'Email is required for password reset' };
    }

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.PASSWORD_RESET,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.HIGH,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        resetUrl,
        expiresInMinutes,
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        companyUrl: process.env.COMPANY_URL || 'https://fundifyhub.com',
        logoUrl: process.env.LOGO_URL || '',
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue password reset notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending password reset notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send request status update notification
 */
export async function sendRequestStatusNotification(
  recipient: NotifyUserParams,
  requestInfo: {
    requestId: string;
    currentStatus: string;
    previousStatus: string;
    header: string;
    description: string;
    footer: string;
    updatedBy?: string;
  }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.REQUEST_STATUS_NOTIFICATIONS,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.NORMAL,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        requestId: requestInfo.requestId,
        currentStatus: requestInfo.currentStatus,
        previousStatus: requestInfo.previousStatus,
        header: requestInfo.header,
        description: requestInfo.description,
        footer: requestInfo.footer,
        link: `${process.env.FRONTEND_URL || 'https://fundifyhub.com'}/request/${requestInfo.requestId}`,
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        updatedBy: requestInfo.updatedBy || 'System',
        time: new Date().toISOString(),
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue request status notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending request status notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send new request submitted notification (for admins)
 */
export async function sendRequestSubmittedNotification(
  recipient: NotifyUserParams,
  requestInfo: {
    requestId: string;
    assetName: string;
    amount: number;
    district: string;
    submittedAt: string;
  }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.REQUEST_SUBMITTED,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.NORMAL,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        requestId: requestInfo.requestId,
        assetName: requestInfo.assetName,
        amount: requestInfo.amount,
        district: requestInfo.district,
        submittedAt: requestInfo.submittedAt,
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://fundifyhub.com'}/request/${requestInfo.requestId}`,
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue request submitted notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending request submitted notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send EMI reminder notification
 */
export async function sendEMIReminderNotification(
  recipient: NotifyUserParams,
  emiInfo: {
    loanNumber: string;
    emiNumber: number;
    emiAmount: number;
    dueDate: string;
    daysUntilDue: number;
    totalOutstanding?: number;
  }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.EMI_REMINDER,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.NORMAL,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        loanNumber: emiInfo.loanNumber,
        emiNumber: emiInfo.emiNumber,
        emiAmount: emiInfo.emiAmount,
        dueDate: emiInfo.dueDate,
        daysUntilDue: emiInfo.daysUntilDue,
        totalOutstanding: emiInfo.totalOutstanding,
        companyName: 'FundifyHub',
        paymentUrl: `${process.env.FRONTEND_URL || 'https://fundifyhub.com'}/payments`,
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue EMI reminder: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending EMI reminder: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send EMI overdue notification
 */
export async function sendEMIOverdueNotification(
  recipient: NotifyUserParams,
  emiInfo: {
    loanNumber: string;
    emiNumber: number;
    emiAmount: number;
    dueDate: string;
    daysOverdue: number;
    lateFee: number;
    totalDue: number;
    overdueCount: number;
  }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.EMI_OVERDUE,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.HIGH,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        loanNumber: emiInfo.loanNumber,
        emiNumber: emiInfo.emiNumber,
        emiAmount: emiInfo.emiAmount,
        dueDate: emiInfo.dueDate,
        daysOverdue: emiInfo.daysOverdue,
        lateFee: emiInfo.lateFee,
        totalDue: emiInfo.totalDue,
        overdueCount: emiInfo.overdueCount,
        companyName: 'FundifyHub',
        paymentUrl: `${process.env.FRONTEND_URL || 'https://fundifyhub.com'}/payments`,
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue EMI overdue notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending EMI overdue notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send asset pledge notification (new request notification for admins)
 */
export async function sendAssetPledgeNotification(
  recipient: NotifyUserParams,
  assetInfo: {
    assetName: string;
    amount: number;
    district: string;
    requestId: string;
    timestamp: string;
    additionalDescription?: string;
  }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.ASSET_PLEDGE,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.NORMAL,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'Customer',
        assetName: assetInfo.assetName,
        amount: assetInfo.amount,
        district: assetInfo.district,
        requestId: assetInfo.requestId,
        timestamp: assetInfo.timestamp,
        additionalDescription: assetInfo.additionalDescription,
        companyName: 'FundifyHub',
        adminDashboardUrl: `${process.env.FRONTEND_URL || 'https://fundifyhub.com'}/admin/request/${assetInfo.requestId}`,
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue asset pledge notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending asset pledge notification: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Send notification to admin-created user with their credentials
 */
export async function sendAdminUserCreatedNotification(
  recipient: NotifyUserParams,
  userInfo: {
    tempPassword: string;
    createdByAdmin: string;
    assignedRoles: string[];
    assignedDistricts: string[];
  }
): Promise<NotifyResult> {
  try {
    const channels: NotificationChannel[] = [];
    if (recipient.email) channels.push(NotificationChannel.EMAIL);
    if (recipient.phoneNumber) channels.push(NotificationChannel.WHATSAPP);

    if (channels.length === 0) {
      return { success: false, error: 'No contact information provided' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://fundifyhub.com';

    const result = await queueClient.addNotificationJob({
      templateName: TEMPLATE_NAMES.ADMIN_USER_CREATED,
      channels,
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.HIGH,
      recipient: {
        userId: recipient.userId,
        email: recipient.email,
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
      },
      variables: {
        email: recipient.email || '',
        phoneNumber: recipient.phoneNumber || '',
        customerName: recipient.name || 'User',
        tempPassword: userInfo.tempPassword,
        loginUrl: `${frontendUrl}/login`,
        resetPasswordUrl: `${frontendUrl}/reset-password`,
        companyName: 'FundifyHub',
        supportUrl: process.env.SUPPORT_URL || 'https://fundifyhub.com/support',
        companyUrl: process.env.COMPANY_URL || 'https://fundifyhub.com',
        logoUrl: process.env.LOGO_URL || '',
        createdByAdmin: userInfo.createdByAdmin,
        assignedRoles: userInfo.assignedRoles,
        assignedDistricts: userInfo.assignedDistricts,
      },
    });

    if (result.error) {
      notificationLogger.error(`Failed to queue admin user created notification: ${result.error}`);
      return { success: false, error: result.error };
    }

    return { success: true, correlationId: result.correlationId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    notificationLogger.error(`Error sending admin user created notification: ${msg}`);
    return { success: false, error: msg };
  }
}

export default {
  sendOTPNotification,
  sendWelcomeNotification,
  sendLoginAlertNotification,
  sendPasswordResetNotification,
  sendRequestStatusNotification,
  sendRequestSubmittedNotification,
  sendEMIReminderNotification,
  sendEMIOverdueNotification,
  sendAssetPledgeNotification,
  sendAdminUserCreatedNotification,
};
