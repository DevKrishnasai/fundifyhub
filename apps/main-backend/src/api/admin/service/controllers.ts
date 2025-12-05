import { Request, Response } from 'express';
import { prisma, Prisma } from '@fundifyhub/prisma';
import { SERVICE_NAMES, CONNECTION_STATUS, SERVICE_CONTROL_ACTIONS } from '@fundifyhub/types';
import { createEnqueueClient } from '@fundifyhub/utils/server';
import logger from 'apps/main-backend/src/utils/logger';
import { APIResponseType } from 'apps/main-backend/src/types';
import { cache, CACHE_KEYS, CACHE_TTL } from 'apps/main-backend/src/utils/cache';
import config from 'apps/main-backend/src/utils/config';

/** Email config shape for transformation */
interface EmailConfigTransformed {
  host: unknown;
  port: unknown;
  user: unknown;
  password: unknown;
  from: unknown;
}

// Create enqueue client for service control jobs
const enqueueClient = createEnqueueClient({
  host: config.redis.host,
  port: config.redis.port,
});


/**
 * GET /admin/services
 * Get all service configurations (auto-create if missing)
 * Uses Redis caching to reduce database load
 * Pass ?fresh=true to skip cache (useful when polling for QR code updates)
 */

export async function getAllServicesController(req: Request, res: Response): Promise<void> {
  try {
    const skipCache = req.query.fresh === 'true';
    
    // Try to get from cache first (unless skipCache is true)
    if (!skipCache) {
      const cachedServices = await cache.get<Record<string, unknown>[]>(CACHE_KEYS.ALL_SERVICES());
      if (cachedServices) {
        res.status(200).json({
          success: true,
          message: 'Service configurations retrieved successfully',
          data: cachedServices,
          cached: true,
        } as APIResponseType);
        return;
      }
    }

    let configs = await prisma.serviceConfig.findMany({ orderBy: { serviceName: 'asc' } });

    const SUPPORTED_SERVICES = Object.values(SERVICE_NAMES);
    
    // Create missing service configs - handle race conditions gracefully
    for (const serviceName of SUPPORTED_SERVICES) {
      if (!configs.find((cfg) => cfg.serviceName === serviceName)) {
        try {
          await prisma.serviceConfig.create({
            data: {
              serviceName,
              isEnabled: false,
              isActive: false,
              connectionStatus: CONNECTION_STATUS.DISCONNECTED,
              config: {},
              createdAt: new Date(),
              updatedAt: new Date(),
              configuredBy: 'system',
            }
          });
        } catch (createError) {
          // Ignore unique constraint errors - record was created by another concurrent request
          const isPrismaUniqueError = createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002';
          if (!isPrismaUniqueError) {
            throw createError;
          }
        }
      }
    }
    
    configs = await prisma.serviceConfig.findMany({ orderBy: { serviceName: 'asc' } });
    const serviceStatuses = configs.map((cfg) => {
      let transformedConfig: Prisma.JsonValue | EmailConfigTransformed = cfg.config;
      
      if (cfg.serviceName === 'EMAIL' && cfg.config && typeof cfg.config === 'object') {
        const emailConfig = cfg.config as Record<string, unknown>;
        transformedConfig = {
          host: emailConfig.smtpHost,
          port: emailConfig.smtpPort,
          user: emailConfig.smtpUser,
          password: emailConfig.smtpPass,
          from: emailConfig.from,
        };
      }
      
      return {
        serviceName: cfg.serviceName,
        status: cfg.isActive ? (cfg.isEnabled ? 'enabled' : 'disabled') : 'disconnected',
        isEnabled: cfg.isEnabled,
        isActive: cfg.isActive,
        connectionStatus: cfg.connectionStatus,
        lastConnectedAt: cfg.lastConnectedAt || undefined,
        lastError: cfg.lastError || undefined,
        config: transformedConfig,
        qrCode: cfg.qrCode || undefined,
      };
    });
    
    // Cache the results (5 minutes TTL)
    await cache.set(CACHE_KEYS.ALL_SERVICES(), serviceStatuses, CACHE_TTL.MEDIUM);
    
    res.status(200).json({
      success: true,
      message: 'Service configurations retrieved successfully',
      data: serviceStatuses,
    } as APIResponseType);
  } catch (error) {
    const contextLogger = logger.child('[get-services]');
    contextLogger.error('Failed to get services:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service configurations',
    } as APIResponseType);
  }
}

/**
 * POST /admin/service/:serviceName/enable
 * Enable a service (set isEnabled=true)
 * Queues an immediate service control job to start the service
 */
export async function enableServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const upperServiceName = serviceName.toUpperCase() as SERVICE_NAMES;
    
    // Validate service name
    if (!Object.values(SERVICE_NAMES).includes(upperServiceName)) {
      res.status(400).json({ success: false, message: `Invalid service name: ${serviceName}` } as APIResponseType);
      return;
    }
    
    let serviceConfig = await prisma.serviceConfig.findUnique({ where: { serviceName: upperServiceName } });
    
    if (!serviceConfig) {
      serviceConfig = await prisma.serviceConfig.create({
        data: {
          serviceName: upperServiceName,
          isEnabled: true,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.INITIALIZING,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          configuredBy: 'system',
        }
      });
    } else {
      serviceConfig = await prisma.serviceConfig.update({
        where: { serviceName: upperServiceName },
        data: { 
          isEnabled: true, 
          connectionStatus: CONNECTION_STATUS.INITIALIZING,
          updatedAt: new Date() 
        },
      });
    }
    
    // Invalidate service config cache
    await cache.invalidateServiceConfig(upperServiceName);
    
    // Queue immediate service control job to start the service
    const result = await enqueueClient.addServiceControlJob({
      serviceName: upperServiceName,
      action: SERVICE_CONTROL_ACTIONS.START,
    });
    
    if (result.error) {
      logger.child('[enable-service]').warn(`Failed to queue service control job: ${result.error}`);
    } else {
      logger.child('[enable-service]').info(`Queued service start job: ${result.jobId}`);
    }
    
    res.status(200).json({ 
      success: true, 
      message: `${serviceName} enabled - service is starting`,
      data: serviceConfig 
    } as APIResponseType);
  } catch (error) {
    const contextLogger = logger.child('[enable-service]');
    contextLogger.error('Failed to enable service:', error as Error);
    res.status(500).json({ success: false, message: `Failed to enable ${req.params.serviceName}` } as APIResponseType);
  }
}

/**
 * POST /admin/service/:serviceName/disable
 * Disable a service (set isEnabled=false)
 * Queues an immediate service control job to stop the service
 */
export async function disableServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const upperServiceName = serviceName.toUpperCase() as SERVICE_NAMES;
    
    // Validate service name
    if (!Object.values(SERVICE_NAMES).includes(upperServiceName)) {
      res.status(400).json({ success: false, message: `Invalid service name: ${serviceName}` } as APIResponseType);
      return;
    }
    
    let serviceConfig = await prisma.serviceConfig.findUnique({ where: { serviceName: upperServiceName } });
    
    if (!serviceConfig) {
      // Create it in disabled state if it doesn't exist
      serviceConfig = await prisma.serviceConfig.create({
        data: {
          serviceName: upperServiceName,
          isEnabled: false,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.DISCONNECTED,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          configuredBy: 'system',
        }
      });
    } else {
      // Queue immediate service control job to stop the service first
      const result = await enqueueClient.addServiceControlJob({
        serviceName: upperServiceName,
        action: SERVICE_CONTROL_ACTIONS.STOP,
      });
      
      if (result.error) {
        logger.child('[disable-service]').warn(`Failed to queue service control job: ${result.error}`);
      } else {
        logger.child('[disable-service]').info(`Queued service stop job: ${result.jobId}`);
      }
      
      // Update the service config to disabled state (don't delete)
      serviceConfig = await prisma.serviceConfig.update({
        where: { serviceName: upperServiceName },
        data: { 
          isEnabled: false,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.DISCONNECTED,
          qrCode: null,
          lastError: null,
          updatedAt: new Date(),
        }
      });
    }
    
    // Invalidate service config cache
    await cache.invalidateServiceConfig(upperServiceName);
    
    res.status(200).json({ 
      success: true, 
      message: `${serviceName} disabled successfully`,
      data: serviceConfig
    } as APIResponseType);
  } catch (error) {
    logger.error('Error disabling service:', error as Error);
    res.status(500).json({ success: false, message: `Failed to disable ${req.params.serviceName}` } as APIResponseType);
  }
}

/**
 * POST /admin/service/:serviceName/disconnect
 * Disconnect a service permanently (delete record)
 * The notification worker's service manager will detect the missing config
 */
export async function disconnectServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const config = await prisma.serviceConfig.findUnique({ where: { serviceName: serviceName.toUpperCase() } });
    if (!config) {
      res.status(404).json({ success: false, message: `Service ${serviceName} not found` } as APIResponseType);
      return;
    }
    
    // Delete the service config - the notification worker will detect this
    // and the service manager will stop using this channel
    await prisma.serviceConfig.delete({ where: { serviceName: serviceName.toUpperCase() } });
    
    // Invalidate service config cache
    await cache.invalidateServiceConfig(serviceName.toUpperCase());
    
    res.status(200).json({ success: true, message: `${serviceName} disconnected and cleaned up` } as APIResponseType);
  } catch (error) {
    logger.error('Error disconnecting service:', error as Error);
    res.status(500).json({ success: false, message: `Failed to disconnect ${req.params.serviceName}` } as APIResponseType);
  }
}

/**
 * POST /admin/service/:serviceName/configure
 * Update service configuration (e.g., email SMTP settings)
 */
export async function configureServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    let configData = req.body;
    const SUPPORTED_SERVICES = Object.values(SERVICE_NAMES);
    
    // Validate service name
    const upperServiceName = serviceName.toUpperCase() as SERVICE_NAMES;
    if (!SUPPORTED_SERVICES.includes(upperServiceName)) {
      res.status(400).json({ 
        success: false, 
        message: `Invalid service name: ${serviceName}` 
      } as APIResponseType);
      return;
    }
    
    // Transform email config keys to match worker expectations
    if (upperServiceName === 'EMAIL') {
      const port = parseInt(String(configData.port));
      configData = {
        smtpHost: configData.host,
        smtpPort: port, // Ensure it's a number
        smtpUser: configData.user,
        smtpPass: configData.password,
        from: configData.from,
        smtpSecure: port === 465,
      };
      
      // Test email configuration before saving
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: configData.smtpHost,
          port: configData.smtpPort,
          secure: configData.smtpSecure,
          auth: {
            user: configData.smtpUser,
            pass: configData.smtpPass,
          },
        });
        
        // Verify connection
        await transporter.verify();
        
        // Send test email
        await transporter.sendMail({
          from: `"FundifyHub Service" <${configData.smtpUser}>`,
          to: configData.smtpUser,
          subject: 'Test Email from FundifyHub',
          text: 'This is a test email to verify your SMTP configuration. If you received this, your email service is configured correctly!',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #667eea;">✅ Email Configuration Successful!</h2>
              <p>This is a test email to verify your SMTP configuration.</p>
              <p>If you received this message, your email service is configured correctly and ready to send OTPs.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">FundifyHub - Making lending simple and accessible</p>
            </div>
          `,
        });
        
        logger.info(`Test email sent successfully to ${configData.smtpUser}`);
      } catch (emailError) {
        logger.error('Email configuration test failed:', emailError as Error);
        res.status(400).json({
          success: false,
          message: `Email configuration test failed: ${(emailError as Error).message}. Please check your SMTP settings.`,
        } as APIResponseType);
        return;
      }
    }
    
    // Update or create config
    let config = await prisma.serviceConfig.findUnique({ 
      where: { serviceName: upperServiceName } 
    });
    
    if (!config) {
      config = await prisma.serviceConfig.create({
        data: {
          serviceName: upperServiceName,
          isEnabled: false,
          isActive: false,
          connectionStatus: CONNECTION_STATUS.DISCONNECTED,
          config: configData,
          createdAt: new Date(),
          updatedAt: new Date(),
          configuredBy: 'system',
        }
      });
    } else {
      config = await prisma.serviceConfig.update({
        where: { serviceName: upperServiceName },
        data: { 
          config: configData, 
          updatedAt: new Date() 
        },
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: `${serviceName} configuration updated`, 
      data: config 
    } as APIResponseType);
    
    // Invalidate service config cache after successful update
    await cache.invalidateServiceConfig(upperServiceName);
    
  } catch (error) {
    logger.error('Error configuring service:', error as Error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to configure ${req.params.serviceName}` 
    } as APIResponseType);
  }
}

/**
 * POST /admin/service/:serviceName/test
 * Test a service by sending a test message
 * For Email: sends a test email to the configured user
 * For WhatsApp: sends a test message to a provided phone number
 */
export async function testServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const { phoneNumber } = req.body; // For WhatsApp testing
    const upperServiceName = serviceName.toUpperCase() as SERVICE_NAMES;
    
    // Validate service name
    if (!Object.values(SERVICE_NAMES).includes(upperServiceName)) {
      res.status(400).json({ success: false, message: `Invalid service name: ${serviceName}` } as APIResponseType);
      return;
    }
    
    const serviceConfig = await prisma.serviceConfig.findUnique({ where: { serviceName: upperServiceName } });
    
    if (!serviceConfig) {
      res.status(404).json({ success: false, message: `${serviceName} is not configured` } as APIResponseType);
      return;
    }
    
    if (!serviceConfig.isEnabled) {
      res.status(400).json({ success: false, message: `${serviceName} is not enabled` } as APIResponseType);
      return;
    }
    
    if (upperServiceName === SERVICE_NAMES.EMAIL) {
      // Test email service
      const emailConfig = serviceConfig.config as Record<string, unknown>;
      
      if (!emailConfig?.smtpHost || !emailConfig?.smtpUser) {
        res.status(400).json({ success: false, message: 'Email service is not configured' } as APIResponseType);
        return;
      }
      
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: String(emailConfig.smtpHost),
        port: parseInt(String(emailConfig.smtpPort || 587)),
        secure: emailConfig.smtpSecure === true,
        auth: {
          user: String(emailConfig.smtpUser),
          pass: String(emailConfig.smtpPass),
        },
      });
      
      await transporter.verify();
      await transporter.sendMail({
        from: `"FundifyHub Test" <${emailConfig.smtpUser}>`,
        to: String(emailConfig.smtpUser),
        subject: '✅ FundifyHub Email Service Test',
        text: 'This is a test email from FundifyHub. Your email service is working correctly!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px;">
            <h2 style="color: #10b981;">✅ Email Service Test Successful!</h2>
            <p>This is a test email from FundifyHub.</p>
            <p>Your email service is working correctly and can send notifications.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
      });
      
      res.status(200).json({ 
        success: true, 
        message: `Test email sent successfully to ${emailConfig.smtpUser}` 
      } as APIResponseType);
      return;
    }
    
    if (upperServiceName === SERVICE_NAMES.WHATSAPP) {
      // Test WhatsApp service - requires a phone number
      if (!phoneNumber) {
        res.status(400).json({ 
          success: false, 
          message: 'Phone number is required to test WhatsApp service' 
        } as APIResponseType);
        return;
      }
      
      // Check if WhatsApp is connected
      if (serviceConfig.connectionStatus !== CONNECTION_STATUS.CONNECTED && 
          serviceConfig.connectionStatus !== CONNECTION_STATUS.AUTHENTICATED) {
        res.status(400).json({ 
          success: false, 
          message: `WhatsApp is not connected. Current status: ${serviceConfig.connectionStatus}` 
        } as APIResponseType);
        return;
      }
      
      // Queue a service test job to send WhatsApp message directly
      const testResult = await enqueueClient.addServiceControlJob({
        serviceName: upperServiceName,
        action: SERVICE_CONTROL_ACTIONS.TEST,
        config: { phoneNumber },
      });
      
      if (testResult.error) {
        res.status(500).json({ 
          success: false, 
          message: `Failed to queue test message: ${testResult.error}` 
        } as APIResponseType);
        return;
      }
      
      res.status(200).json({ 
        success: true, 
        message: `Test WhatsApp message sent to ${phoneNumber}`,
        data: { jobId: testResult.jobId }
      } as APIResponseType);
      return;
    }
    
    res.status(400).json({ success: false, message: `Testing not supported for ${serviceName}` } as APIResponseType);
  } catch (error) {
    const contextLogger = logger.child('[test-service]');
    contextLogger.error('Failed to test service:', error as Error);
    res.status(500).json({ 
      success: false, 
      message: `Test failed: ${(error as Error).message}` 
    } as APIResponseType);
  }
}