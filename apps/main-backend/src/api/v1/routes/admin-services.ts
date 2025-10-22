import { Router, Request, Response } from 'express';
import { createLogger } from '@fundifyhub/logger';
import { serviceConfigService } from '../../../services/service-config';
import { validateRequired } from '../../../utils/validation';
import { APIResponse } from '../../../types';
import * as nodemailer from 'nodemailer';

const logger = createLogger({ serviceName: 'admin-services-routes' });

/**
 * Test email configuration by attempting to send a test email
 */
async function testEmailConfiguration(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Create transporter with Gmail-specific settings
    const transportConfig: any = {
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpSecure || false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    };

    // Apply Gmail-specific settings
    if (config.smtpHost?.includes('gmail.com')) {
      transportConfig.port = 587;
      transportConfig.secure = false;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Verify connection
    await transporter.verify();

    // Send test email to itself
    await transporter.sendMail({
      from: config.smtpUser,
      to: config.smtpUser,
      subject: 'Test Mail - Fundify',
      text: 'Its just a test mail from fundify',
      html: '<p>Its just a test mail from fundify</p>'
    });

    return { success: true };

  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
const router: Router = Router();

import { requireAuth, requireAdmin } from '../../../middleware/auth';

/**
 * Get all service configurations
 * GET /api/v1/admin/services/config
 */
router.get('/config', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await serviceConfigService.getAllConfigs();
    
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      ...(result.data && { data: result.data })
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service configurations'
    } as APIResponse);
  }
});

/**
 * Get specific service configuration
 * GET /api/v1/admin/services/config/:serviceName
 */
router.get('/config/:serviceName', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    
    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      } as APIResponse);
    }

    const result = await serviceConfigService.getServiceConfig(serviceName);
    
    // Apply status mapping - only 'connected' or 'disabled' for frontend
    if (result.success && result.data) {
      if (!result.data.isEnabled) {
        // Service is disabled
        result.data.connectionStatus = 'disabled';
      } else if (result.data.connectionStatus === 'CONNECTED') {
        // Service is enabled and connected
        result.data.connectionStatus = 'connected';
      } else {
        // Service is enabled but not connected (any error, initializing, etc.)
        result.data.connectionStatus = 'disabled';
      }
    }
    
    const statusCode = result.success ? 200 : (result.data ? 404 : 500);
    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      ...(result.data && { data: result.data })
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service configuration'
    } as APIResponse);
  }
});

/**
 * Update service configuration with proper toggle logic
 * POST /api/v1/admin/services/config/:serviceName
 */
router.post('/config/:serviceName', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const { isEnabled, config } = req.body;
    const adminUserId = req.user?.id || 'unknown-admin';
    
    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      } as APIResponse);
    }

    const serviceNameUpper = serviceName.toUpperCase();

    // Handle toggle OFF - destroy service and set to disabled state
    if (!isEnabled) {
      // First destroy the service
      const { eventService } = await import('../../../services/event-service');
      if (serviceNameUpper === 'WHATSAPP') {
        await eventService.triggerWhatsAppDestroy();
      } else if (serviceNameUpper === 'EMAIL') {
        await eventService.triggerEmailDestroy();
      }

      // Update configuration to disabled state
      const result = await serviceConfigService.updateServiceConfig(
        serviceName,
        { isEnabled: false, config },
        adminUserId
      );

      // Ensure status is set to disabled in database
      if (result.success) {
        await serviceConfigService.updateServiceStatus(serviceName, {
          isActive: false,
          connectionStatus: 'DISABLED'
        });
      }

      return res.json(result as APIResponse);
    }

    // Handle toggle ON - validate config first, then enable if valid
    let configValid = false;
    let validationError = '';

    if (serviceNameUpper === 'EMAIL') {
      // Check if required configuration is provided
      const requiredFields = {
        'config.smtpHost': config?.smtpHost,
        'config.smtpUser': config?.smtpUser,
        'config.smtpPass': config?.smtpPass
      };
      const missingFields = validateRequired(requiredFields);
      
      if (missingFields.length > 0) {
        validationError = `Missing required email configuration: ${missingFields.join(', ')}`;
      } else {
        // Test email configuration
        const testResult = await testEmailConfiguration(config);
        if (testResult.success) {
          configValid = true;
        } else {
          validationError = `Email configuration test failed: ${testResult.error}`;
        }
      }
    } else if (serviceNameUpper === 'WHATSAPP') {
      // WhatsApp doesn't need pre-validation, it will connect via QR
      configValid = true;
    }

    // Save configuration regardless of validation (for future edits)
    const result = await serviceConfigService.updateServiceConfig(
      serviceName,
      { isEnabled: configValid, config }, // Only enable if config is valid
      adminUserId
    );

    if (!result.success) {
      return res.status(500).json(result as APIResponse);
    }

    if (configValid) {
      // Config is valid - try to initialize service and set to connected/connecting
      const { eventService } = await import('../../../services/event-service');
      if (serviceNameUpper === 'EMAIL') {
        await eventService.triggerEmailInit();
        // Email should connect immediately if config is valid
      } else if (serviceNameUpper === 'WHATSAPP') {
        await eventService.triggerWhatsAppInit();
        // WhatsApp will go through QR flow
      }
    } else {
      // Config is invalid - set to disabled state and return error
      await serviceConfigService.updateServiceStatus(serviceName, {
        isActive: false,
        connectionStatus: 'DISABLED',
        lastError: validationError
      });
      
      return res.status(400).json({
        success: false,
        message: validationError,
        data: result.data
      } as APIResponse);
    }
    
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      ...(result.data && { data: result.data })
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update service configuration'
    } as APIResponse);
  }
});

/**
 * Get WhatsApp QR code for scanning (real-time SSE)
 * GET /api/v1/admin/services/whatsapp/qr
 */
router.get('/whatsapp/qr', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Import event service
    const { eventService } = await import('../../../services/event-service');

    // Send initial status
    const currentStatus = await eventService.getWhatsAppStatus();
    if (currentStatus?.lastQrCode) {
      res.write(`data: ${JSON.stringify({
        type: 'QR_CODE',
        qrCode: currentStatus.lastQrCode,
        connectionStatus: currentStatus.connectionStatus,
        timestamp: currentStatus.lastUpdate
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'STATUS',
        message: 'Initializing WhatsApp connection...',
        connectionStatus: 'INITIALIZING',
        timestamp: new Date()
      })}\n\n`);
    }

    // Trigger WhatsApp initialization
    await eventService.triggerWhatsAppInit();

    // Subscribe to real-time events
    eventService.subscribeToWhatsAppEvents((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      res.end();
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`: keepalive\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stream WhatsApp QR code'
    } as APIResponse);
  }
});

/**
 * Trigger WhatsApp initialization
 * POST /api/v1/admin/services/whatsapp/init
 */
router.post('/whatsapp/init', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { eventService } = await import('../../../services/event-service');
    await eventService.triggerWhatsAppInit();
    
    res.json({
      success: true,
      message: 'WhatsApp initialization triggered. Check real-time status via SSE endpoint.',
      data: {
        sseEndpoint: '/api/v1/admin/services/whatsapp/qr',
        statusEndpoint: '/api/v1/admin/services/whatsapp/status'
      }
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger WhatsApp initialization'
    } as APIResponse);
  }
});

/**
 * Get WhatsApp connection status
 * GET /api/v1/admin/services/whatsapp/status
 */
router.get('/whatsapp/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await serviceConfigService.getServiceConfig('WHATSAPP');
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp service configuration not found'
      } as APIResponse);
    }

    // Simplify status to only 'connected' or 'disabled'
    let simpleStatus = 'disabled';
    if (result.data.isEnabled && result.data.connectionStatus === 'CONNECTED') {
      simpleStatus = 'connected';
    }

    res.json({
      success: true,
      message: 'WhatsApp status retrieved',
      data: {
        isEnabled: result.data.isEnabled,
        isActive: result.data.isActive,
        connectionStatus: simpleStatus,
        lastConnectedAt: result.data.lastConnectedAt,
        lastError: result.data.lastError
      }
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp status'
    } as APIResponse);
  }
});

/**
 * Get email service status
 * GET /api/v1/admin/services/email/status
 */
router.get('/email/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await serviceConfigService.getServiceConfig('EMAIL');
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'Email service configuration not found'
      } as APIResponse);
    }

    // Simplify status to only 'connected' or 'disabled'
    const simpleStatus = (result.data.isEnabled && result.data.connectionStatus === 'CONNECTED') 
      ? 'connected' 
      : 'disabled';

    res.json({
      success: true,
      message: 'Email status retrieved',
      data: {
        isEnabled: result.data.isEnabled,
        isActive: result.data.isActive,
        connectionStatus: simpleStatus,
        lastConnectedAt: result.data.lastConnectedAt,
        lastError: result.data.lastError,
        config: {
          smtpHost: result.data.config?.smtpHost,
          smtpPort: result.data.config?.smtpPort || 587,
          smtpSecure: result.data.config?.smtpSecure || false,
          smtpUser: result.data.config?.smtpUser,
          smtpFrom: result.data.config?.smtpFrom
          // Note: smtpPass is not returned for security
        }
      }
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get email status'
    } as APIResponse);
  }
});

/**
 * Test email configuration
 * POST /api/v1/admin/services/email/test
 */
router.post('/email/test', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      } as APIResponse);
    }

    // Queue a test email job
    const { QueueService } = await import('../../../services/queue');
    
    const result = await QueueService.addOTPJob({
      userId: req.user?.id || 'unknown-admin',
      recipient: testEmail,
      otp: '123456', // Test OTP code
      userName: 'Admin Test',
      type: 'EMAIL',
      templateType: 'VERIFICATION'
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to queue test email: ${result.message}`
      } as APIResponse);
    }
    
    res.json({
      success: true,
      message: 'Test email queued for sending. Check your inbox and the service logs.',
      data: {
        testEmail,
        note: 'A test email has been queued to verify your email configuration'
      }
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration'
    } as APIResponse);
  }
});

/**
 * Initialize default service configurations
 * POST /api/v1/admin/services/init
 */
router.post('/init', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await serviceConfigService.initializeDefaultConfigs();
    
    res.json({
      success: true,
      message: 'Default service configurations initialized successfully'
    } as APIResponse);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize service configurations'
    } as APIResponse);
  }
});

export default router;