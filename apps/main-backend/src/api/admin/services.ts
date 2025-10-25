import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { prisma } from '@fundifyhub/prisma';
import { logger } from '../../utils/logger';
import { Queue, QueueEvents } from 'bullmq';
import { config } from '../../env-config';
import type { OTPJobData, OTPJobOptions, OTPQueueStats, ServiceControlJobData, ServiceControlQueueStats, ServiceStatusJobData, ServiceStatusQueueStats } from '@fundifyhub/types';


// Redis connection for BullMQ (reuse backend config)
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
};

// --- Service Control Queue (admin-owned) ---
let adminServiceControlQueueInstance: Queue<ServiceControlJobData> | null = null;

export function getServiceControlQueue(): Queue<ServiceControlJobData> {
  if (!adminServiceControlQueueInstance) {
    adminServiceControlQueueInstance = new Queue('service-control', { connection: redisConnection });
    logger.info('✅ Admin Service Control queue initialized');
  }
  return adminServiceControlQueueInstance;
}

export async function addServiceControlJob(data: ServiceControlJobData): Promise<string> {
  const queue = getServiceControlQueue();
  const jobOptions = {
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  };

  const job = await queue.add('control-service', data, jobOptions);
  logger.info(`📤 Queued ${data.action} job for ${data.serviceName} service (${job.id})`);
  return job.id as string;
}

export async function startService(serviceName: string, triggeredBy?: string): Promise<string> {
  return addServiceControlJob({
    action: 'START',
    serviceName: serviceName as any,
    reason: 'Service start requested',
    triggeredBy,
  });
}

export async function stopService(serviceName: string, reason?: string, triggeredBy?: string): Promise<string> {
  return addServiceControlJob({
    action: 'STOP',
    serviceName: serviceName as any,
    reason: reason || 'Service stop requested',
    triggeredBy,
  });
}

export async function restartService(serviceName: string, reason?: string, triggeredBy?: string): Promise<string> {
  return addServiceControlJob({
    action: 'RESTART',
    serviceName: serviceName as any,
    reason: reason || 'Service restart requested',
    triggeredBy,
  });
}

export async function queueWhatsAppInitialize(): Promise<string> {
  return startService('WHATSAPP', undefined);
}

export async function queueWhatsAppDestroy(): Promise<string> {
  return stopService('WHATSAPP', 'Service stop requested', undefined);
}

export async function queueEmailInitialize(config?: any): Promise<string> {
  return startService('EMAIL', undefined);
}

export async function queueEmailDestroy(): Promise<string> {
  return stopService('EMAIL', 'Service stop requested', undefined);
}

export async function getServiceControlQueueStats(): Promise<ServiceControlQueueStats> {
  const queue = getServiceControlQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function getServiceControlJob(jobId: string) {
  const queue = getServiceControlQueue();
  return queue.getJob(jobId);
}

// --- OTP Queue (admin-owned) ---
let adminOtpQueueInstance: Queue<OTPJobData> | null = null;

export function getOTPQueue(): Queue<OTPJobData> {
  if (!adminOtpQueueInstance) {
    adminOtpQueueInstance = new Queue('otp', { connection: redisConnection });
    logger.info('✅ Admin OTP queue initialized');
  }
  return adminOtpQueueInstance;
}

export async function addOTPJob(data: OTPJobData, options?: OTPJobOptions): Promise<string> {
  const queue = getOTPQueue();
  const jobOptions = {
    delay: options?.delay || 0,
    attempts: options?.attempts || 3,
    backoff: options?.backoff || {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  };

  const job = await queue.add('send-otp', data, jobOptions);
  logger.info(`📤 Queued ${data.type} OTP job ${job.id} for ${data.recipient}`);
  return job.id as string;
}

export async function addEmailOTPJob(data: Omit<OTPJobData, 'type'> & { type?: never }): Promise<string> {
  return addOTPJob({ ...data, type: 'EMAIL' });
}

export async function addWhatsAppOTPJob(data: Omit<OTPJobData, 'type'> & { type?: never }): Promise<string> {
  return addOTPJob({ ...data, type: 'WHATSAPP' });
}

export async function getOTPQueueStats(): Promise<OTPQueueStats> {
  const queue = getOTPQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function clearOTPQueue(): Promise<void> {
  const queue = getOTPQueue();
  await queue.clean(0, 10000);
  logger.warn('⚠️ Admin OTP queue cleared');
}

export async function getOTPJob(jobId: string) {
  const queue = getOTPQueue();
  return queue.getJob(jobId);
}

// --- Service Status Queue (admin-owned) ---
let adminServiceStatusQueueInstance: Queue<ServiceStatusJobData> | null = null;
let adminServiceStatusQueueEventsInstance: QueueEvents | null = null;

export function getServiceStatusQueue(): Queue<ServiceStatusJobData> {
  if (!adminServiceStatusQueueInstance) {
    adminServiceStatusQueueInstance = new Queue('service-status', { connection: redisConnection });
    logger.info('✅ Admin Service Status queue initialized');
  }
  return adminServiceStatusQueueInstance;
}

export async function addServiceStatusJob(data: ServiceStatusJobData): Promise<string> {
  const queue = getServiceStatusQueue();
  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: 20,
    removeOnFail: 10,
  };

  const job = await queue.add('update-status', data, jobOptions);
  logger.info(`📤 Queued status update for ${data.serviceName}: ${data.connectionStatus} (${job.id})`);
  return job.id as string;
}

export async function markServiceConnected(serviceName: string, timestamp?: Date): Promise<string> {
  return addServiceStatusJob({
    serviceName: serviceName as any,
    isActive: true,
    connectionStatus: 'CONNECTED',
    timestamp: timestamp || new Date(),
  });
}

export async function markServiceDisconnected(serviceName: string, error?: string, timestamp?: Date): Promise<string> {
  return addServiceStatusJob({
    serviceName: serviceName as any,
    isActive: false,
    connectionStatus: 'DISCONNECTED',
    lastError: error,
    timestamp: timestamp || new Date(),
  });
}

export async function markServiceError(serviceName: string, error: string, timestamp?: Date): Promise<string> {
  return addServiceStatusJob({
    serviceName: serviceName as any,
    isActive: false,
    connectionStatus: 'ERROR',
    lastError: error,
    timestamp: timestamp || new Date(),
  });
}

export async function markServiceConnecting(serviceName: string, timestamp?: Date): Promise<string> {
  return addServiceStatusJob({
    serviceName: serviceName as any,
    isActive: true,
    connectionStatus: 'CONNECTING',
    timestamp: timestamp || new Date(),
  });
}

export async function getServiceStatusQueueStats(): Promise<ServiceStatusQueueStats> {
  const queue = getServiceStatusQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function getServiceStatusJob(jobId: string) {
  const queue = getServiceStatusQueue();
  return queue.getJob(jobId);
}

export function getServiceStatusQueueEvents() {
  if (!adminServiceStatusQueueEventsInstance) {
    adminServiceStatusQueueEventsInstance = new QueueEvents('service-status', { connection: redisConnection });
  }
  return adminServiceStatusQueueEventsInstance;
}

/**
 * Generate a numeric OTP with the requested number of digits using a
 * cryptographically secure RNG. Defaults to 6 digits.
 */
function generateOtp(digits = 6) {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return String(randomInt(min, max + 1));
}

/**
 * Normalizes connection status values returned to API consumers.
 * We centralize formatting so the controllers receive consistent values.
 */
function formatConnectionStatus(rawData: any) {
  if (!rawData) return { connectionStatus: 'unknown' };
  if (!rawData.isEnabled) return { ...rawData, connectionStatus: 'disabled' };
  if (rawData.connectionStatus === 'CONNECTED') return { ...rawData, connectionStatus: 'connected' };
  return { ...rawData, connectionStatus: 'disabled' };
}

/**
 * Get all service configurations
 */
export async function getAllServiceConfigs(): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  try {
    const result = await getAllConfigs();
    return { success: true, data: result.data ?? result, message: result.message || 'OK' } as any;
  } catch (error) {
    logger.error('Error getting service configurations:', error as Error);
    return {
      success: false,
      message: 'Failed to get service configurations',
    };
  }
}

/**
 * Get specific service configuration
 */
export async function getServiceConfigByName(serviceName: string): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  try {
    if (!serviceName) {
      return {
        success: false,
        message: 'Service name is required',
      };
    }

    const result = await getServiceConfig(serviceName);
    if (!result.success) return { success: false, message: result.message || 'Failed to fetch service config' };

    // Normalize a small view that clients expect
    const normalized = formatConnectionStatus(result.data);
    return { success: true, data: normalized, message: 'OK' };
  } catch (error) {
    logger.error('Error getting service configuration:', error as Error);
    return {
      success: false,
      message: 'Failed to get service configuration',
    };
  }
}

/**
 * Update service configuration (enable/disable)
 */
export async function updateServiceConfigByName(
  serviceName: string,
  isEnabled: boolean,
  config: any,
  adminUserId: string
): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  try {
    if (!serviceName) {
      return {
        success: false,
        message: 'Service name is required',
      };
    }
    const svc = serviceName.toUpperCase();

    // When disabling: call the relevant disable flow and return fresh status
    if (!isEnabled) {
      switch (svc) {
        case 'WHATSAPP': {
          const result = await disableWhatsAppService(adminUserId);
          const status = await getServiceConfig('WHATSAPP');
          return { success: result.success, message: result.message || '', data: status.data };
        }
        case 'EMAIL': {
          const result = await disableEmailService(adminUserId);
          const status = await getServiceConfig('EMAIL');
          return { success: result.success, message: result.message || '', data: status.data };
        }
        default:
          return { success: false, message: `Unknown service: ${serviceName}` };
      }
    }

    // Enabling flows — branch per service with clear behavior and post-status fetch
    switch (svc) {
      case 'EMAIL': {
        const payload = {
          smtpHost: config?.smtpHost,
          smtpPort: config?.smtpPort,
          smtpSecure: config?.smtpSecure,
          smtpUser: config?.smtpUser,
          smtpPass: config?.smtpPass,
          smtpFrom: config?.smtpFrom,
        };
        const result = await testAndConnectEmailAdmin(payload, adminUserId);
        const status = await getServiceConfig('EMAIL');
        return { success: result.success, message: result.message || '', data: result.data || status.data };
      }
      case 'WHATSAPP': {
        const result = await enableWhatsAppService(adminUserId);
        const status = await getServiceConfig('WHATSAPP');
        return { success: result.success, message: result.message || '', data: status.data };
      }
      default:
        return { success: false, message: `Unknown service: ${serviceName}` };
    }
  } catch (error) {
    logger.error('Error updating service configuration:', error as Error);
    return {
      success: false,
      message: 'Failed to update service configuration',
    };
  }
}

/**
 * Initialize default service configurations
 */
export async function initializeDefaultServiceConfigs(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await initializeDefaultConfigs();
    return {
      success: true,
      message: 'Default service configurations initialized successfully',
    };
  } catch (error) {
    logger.error('Error initializing service configurations:', error as Error);
    return {
      success: false,
      message: 'Failed to initialize service configurations',
    };
  }
}

/**
 * Admin-only: send a test email (queues a small test job)
 */
export async function sendTestEmail(testEmail: string, adminUserId: string) {
  try {
    if (!testEmail) return { success: false, message: 'Test email address is required' };
    // queue a lightweight verification email. Job-worker will render templates
    // and perform the actual send. Use a secure OTP for testing.
    const otp = generateOtp(6);
    await addEmailOTPJob({ recipient: testEmail, otp, userName: 'Admin Test', templateType: 'VERIFICATION' } as any);
    logger.info(`Test email queued for ${testEmail}`);
    return { success: true, message: 'Test email queued for sending', data: { testEmail } };
  } catch (error) {
    logger.error('Error sending test email:', error as Error);
    return { success: false, message: 'Failed to send test email' };
  }
}

/**
 * Admin-only: test and connect email service (enable + poll for active)
 */
export async function testAndConnectEmailAdmin(config: any, adminUserId: string) {
  try {
    const validation = await validateEmailConfig(config);
    if (!validation.valid) {
      return { success: false, message: validation.error, data: { isActive: false, isEnabled: false, connectionStatus: 'AUTH_FAILURE' } };
    }

    const enableResult = await enableEmailService(config, adminUserId);
    if (!enableResult.success) {
      return { success: false, message: enableResult.message, data: { isActive: false, isEnabled: false, connectionStatus: 'AUTH_FAILURE' } };
    }

    // Poll for up to ~15 seconds
    const maxAttempts = 30;
    let attempts = 0;
    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 500));
      const statusCheck = await getServiceConfig('EMAIL');
      if (statusCheck.success && statusCheck.data?.isActive) break;
      if (statusCheck.success && statusCheck.data?.lastError) break;
      attempts++;
    }

    const statusResult = await getServiceConfig('EMAIL');
    if (statusResult.success && statusResult.data?.isActive) {
      logger.info('Email service connected successfully');
      // Return the actual status from DB but normalized for clients
      return { success: true, message: 'Email service connected successfully!', data: formatConnectionStatus(statusResult.data) };
    } else {
      // attempt to disable on failure
      try { await disableEmailService(adminUserId); } catch (e) { logger.error('Failed to disable email after failed connect', e as Error); }
      const errorMessage = statusResult.data?.lastError || 'Failed to connect to Email service. Please check your SMTP credentials.';
      logger.error(`Email service connection failed: ${errorMessage}`);
      return { success: false, message: errorMessage, data: { ...formatConnectionStatus(statusResult.data), connectionStatus: 'AUTH_FAILURE' } };
    }
  } catch (error) {
    logger.error('Error testing email connection:', error as Error);
    try { await disableEmailService(adminUserId); } catch (e) { logger.error('Failed to disable email after error', e as Error); }
    return { success: false, message: 'Failed to test email connection', data: { isActive: false, isEnabled: false, connectionStatus: 'AUTH_FAILURE' } };
  }
}

/**
 * Admin test helper: validate or send lightweight test for a service
 */
export async function testServiceConfigByName(
  serviceName: string,
  payload: any,
  adminUserId: string
): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  try {
    if (!serviceName) return { success: false, message: 'Service name is required' };
    const sn = serviceName.toUpperCase();
    if (sn === 'EMAIL') {
      const cfg = payload?.config || {};
      const validation = await validateEmailConfig(cfg);
      if (!validation.valid) return { success: false, message: validation.error || 'Email validation failed' };
      if (payload?.testRecipient) {
        return await sendTestEmail(payload.testRecipient, adminUserId);
      }
      return { success: true, message: 'Email configuration validated successfully' };
    }

    if (sn === 'WHATSAPP') {
      const testPhone = payload?.testPhone;
      const current = await getServiceConfig('WHATSAPP');
      if (!current.success || !current.data) return { success: false, message: 'WhatsApp configuration not found' };
      if (!current.data.isActive) return { success: false, message: 'WhatsApp service is not active. Enable the service and authenticate (scan QR) before sending test messages.' };
  if (!testPhone) return { success: true, message: 'WhatsApp service is active. Provide a testPhone to send a test OTP.' };
  const otp = generateOtp(6);
  const jobId = await addWhatsAppOTPJob({ recipient: testPhone, otp, userName: 'Admin Test' } as any);
      return { success: true, message: 'Test WhatsApp OTP queued', data: { jobId } };
    }

    return { success: false, message: `Unknown service: ${serviceName}` };
  } catch (error) {
    logger.error('Error testing service configuration:', error as Error);
    return { success: false, message: 'Failed to test service configuration' };
  }
}

export async function getAllConfigs(): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const configs = await prisma.serviceConfig.findMany({
      orderBy: { serviceName: 'asc' },
    });
    const serviceStatuses = configs.map((cfg) => ({
      serviceName: cfg.serviceName,
      isEnabled: cfg.isEnabled,
      isActive: cfg.isActive,
      connectionStatus: cfg.connectionStatus,
      lastConnectedAt: cfg.lastConnectedAt || undefined,
      lastError: cfg.lastError || undefined,
      config: cfg.config,
    }));
    return {
      success: true,
      data: serviceStatuses,
      message: 'Service configurations retrieved successfully',
    };
  } catch (error) {
    logger.error('Error getting service configs:', error as Error);
    return {
      success: false,
      message: 'Failed to get service configurations',
    };
  }
}

export async function getServiceConfig(serviceName: string): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const cfg = await prisma.serviceConfig.findUnique({
      where: { serviceName: serviceName.toUpperCase() },
    });
    if (!cfg) {
      return { success: false, message: `Service configuration for ${serviceName} not found` };
    }
    const serviceStatus = {
      serviceName: cfg.serviceName,
      isEnabled: cfg.isEnabled,
      isActive: cfg.isActive,
      connectionStatus: cfg.connectionStatus,
      lastConnectedAt: cfg.lastConnectedAt || undefined,
      lastError: cfg.lastError || undefined,
      config: cfg.config,
    };
    return { success: true, data: serviceStatus, message: 'Service configuration retrieved successfully' };
  } catch (error) {
    logger.error(`Error getting service config for ${serviceName}:`, error as Error);
    return { success: false, message: `Failed to get service configuration for ${serviceName}` };
  }
}

export async function updateServiceConfig(serviceName: string, configData: any, adminUserId: string): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const updatedConfig = await prisma.serviceConfig.upsert({
      where: { serviceName: serviceName.toUpperCase() },
      update: {
        isEnabled: configData.isEnabled ?? undefined,
        config: configData.config ?? undefined,
        configuredBy: adminUserId,
        configuredAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        serviceName: serviceName.toUpperCase(),
        isEnabled: configData.isEnabled ?? false,
        config: configData.config ?? {},
        configuredBy: adminUserId,
        configuredAt: new Date(),
      },
    });
    const serviceStatus = {
      serviceName: updatedConfig.serviceName,
      isEnabled: updatedConfig.isEnabled,
      isActive: updatedConfig.isActive,
      connectionStatus: updatedConfig.connectionStatus,
      lastConnectedAt: updatedConfig.lastConnectedAt || undefined,
      lastError: updatedConfig.lastError || undefined,
      config: updatedConfig.config,
    };
    logger.info(`Service configuration updated for ${serviceName} by admin ${adminUserId}`);
    return { success: true, data: serviceStatus, message: `Service configuration for ${serviceName} updated successfully` };
  } catch (error) {
    logger.error(`Error updating service config for ${serviceName}:`, error as Error);
    return { success: false, message: `Failed to update service configuration for ${serviceName}` };
  }
}

export async function updateServiceStatus(serviceName: string, status: any): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.serviceConfig.upsert({
      where: { serviceName: serviceName.toUpperCase() },
      update: {
        isActive: status.isActive,
        connectionStatus: status.connectionStatus,
        lastConnectedAt: status.isActive ? new Date() : undefined,
        lastError: status.lastError,
        lastErrorAt: status.lastError ? new Date() : undefined,
        updatedAt: new Date(),
      },
      create: {
        serviceName: serviceName.toUpperCase(),
        isEnabled: false,
        isActive: status.isActive,
        connectionStatus: status.connectionStatus,
        lastConnectedAt: status.isActive ? new Date() : undefined,
        lastError: status.lastError,
        lastErrorAt: status.lastError ? new Date() : undefined,
      },
    });
    logger.info(`Service status updated for ${serviceName}: ${status.connectionStatus}`);
    return { success: true, message: `Service status updated for ${serviceName}` };
  } catch (error) {
    logger.error(`Error updating service status for ${serviceName}:`, error as Error);
    return { success: false, message: `Failed to update service status for ${serviceName}` };
  }
}

export async function getEnabledServices(): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const configs = await prisma.serviceConfig.findMany({ where: { isEnabled: true }, orderBy: { serviceName: 'asc' } });
    const serviceStatuses = configs.map((cfg) => ({
      serviceName: cfg.serviceName,
      isEnabled: cfg.isEnabled,
      isActive: cfg.isActive,
      connectionStatus: cfg.connectionStatus,
      lastConnectedAt: cfg.lastConnectedAt || undefined,
      lastError: cfg.lastError || undefined,
      config: cfg.config,
    }));
    return { success: true, data: serviceStatuses, message: 'Enabled service configurations retrieved successfully' };
  } catch (error) {
    logger.error('Error getting enabled services:', error as Error);
    return { success: false, message: 'Failed to get enabled service configurations' };
  }
}

export async function initializeDefaultConfigs(): Promise<void> {
  try {
    const defaultServices = ['WHATSAPP', 'EMAIL'];
    for (const serviceName of defaultServices) {
      const existing = await prisma.serviceConfig.findUnique({ where: { serviceName } });
      if (!existing) {
        await prisma.serviceConfig.create({ data: { serviceName, isEnabled: false, isActive: false, connectionStatus: 'DISCONNECTED', config: {} } });
        logger.info(`Default configuration created for ${serviceName}`);
      }
    }
  } catch (error) {
    logger.error('Error initializing default configs:', error as Error);
  }
}

export async function enableWhatsAppService(adminUserId: string) {
  try {
    const updateResult = await updateServiceConfig('WHATSAPP', { isEnabled: true }, adminUserId);
    if (!updateResult.success) {
      return { success: false, message: 'Failed to update WhatsApp configuration' };
    }

    await queueWhatsAppInitialize();
    logger.info('WhatsApp service enabled successfully');
    return { success: true, message: 'WhatsApp service enabled successfully. Scan QR code to authenticate.' };
  } catch (error) {
    logger.error('Error enabling WhatsApp service:', error as Error);
    return { success: false, message: 'Failed to enable WhatsApp service' };
  }
}

export async function disableWhatsAppService(adminUserId: string) {
  try {
    await queueWhatsAppDestroy();
    const updateResult = await updateServiceConfig('WHATSAPP', { isEnabled: false }, adminUserId);
    if (updateResult.success) {
      await updateServiceStatus('WHATSAPP', { isActive: false, connectionStatus: 'DISABLED' });
    }
    logger.info('WhatsApp service disabled successfully');
    return { success: true, message: 'WhatsApp service disabled successfully' };
  } catch (error) {
    logger.error('Error disabling WhatsApp service:', error as Error);
    return { success: false, message: 'Failed to disable WhatsApp service' };
  }
}


export interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

/**
 * Validate email configuration using nodemailer under the hood
 */
export async function validateEmailConfig(config: EmailConfig): Promise<{ valid: boolean; error?: string }> {
  const requiredFields = {
    'config.smtpHost': config?.smtpHost,
    'config.smtpUser': config?.smtpUser,
    'config.smtpPass': config?.smtpPass,
  };

  const missing = Object.entries(requiredFields).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    const err = `Missing required email configuration: ${missing.join(', ')}`;
    logger.warn(`Email validation failed: ${err}`);
    return { valid: false, error: err };
  }

  try {
    const transportConfig: any = {
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpSecure || false,
      auth: config.smtpUser && config.smtpPass ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    };
    if (config.smtpHost?.includes('gmail.com')) {
      transportConfig.port = 587;
      transportConfig.secure = false;
    }
    const transporter = nodemailer.createTransport(transportConfig);
    await transporter.verify();
    // optional self-send
    if (config.smtpUser) {
      await transporter.sendMail({
        from: config.smtpFrom || config.smtpUser,
        to: config.smtpUser,
        subject: 'Test Mail - Fundify',
        text: 'Test message',
      });
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return { valid: false, error: errorMsg };
  }

  return { valid: true };
}

/**
 * Enable email service: persist config and request worker initialization
 */
export async function enableEmailService(config: EmailConfig, adminUserId: string) {
  try {
    const validation = await validateEmailConfig(config);
    if (!validation.valid) {
      return { success: false, message: validation.error };
    }

    const updateResult = await updateServiceConfig('EMAIL', {
      isEnabled: true,
      config: {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort || 587,
        smtpSecure: config.smtpSecure || false,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        smtpFrom: config.smtpFrom || config.smtpUser,
      }
    }, adminUserId);

    if (!updateResult.success) {
      return { success: false, message: 'Failed to update email configuration' };
    }

    await queueEmailInitialize(config);
    logger.info('Email service enabled successfully');
    return { success: true, message: 'Email service enabled successfully' };
  } catch (error: any) {
    logger.error('Error enabling email service:', error);
    return { success: false, message: 'Failed to enable email service', error: error?.message };
  }
}

export async function disableEmailService(adminUserId: string) {
  try {
    await queueEmailDestroy();
    const updateResult = await updateServiceConfig('EMAIL', { isEnabled: false }, adminUserId);
    if (updateResult.success) {
      await updateServiceStatus('EMAIL', { isActive: false, connectionStatus: 'DISABLED' });
    }
    logger.info('Email service disabled successfully');
    return { success: true, message: 'Email service disabled successfully' };
  } catch (error) {
    logger.error('Error disabling email service:', error as Error);
    return { success: false, message: 'Failed to disable email service' };
  }
}
