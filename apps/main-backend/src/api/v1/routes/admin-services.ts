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
      const { serviceControlService } = await import('../../../services/service-control');
      if (serviceNameUpper === 'WHATSAPP') {
        await serviceControlService.destroyWhatsApp();
      } else if (serviceNameUpper === 'EMAIL') {
        await serviceControlService.destroyEmail();
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
      const { serviceControlService } = await import('../../../services/service-control');
      if (serviceNameUpper === 'EMAIL') {
        await serviceControlService.initializeEmail(config);
        // Email should connect immediately if config is valid
      } else if (serviceNameUpper === 'WHATSAPP') {
        await serviceControlService.initializeWhatsApp(config);
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
 * Note: EventSource doesn't support custom headers or credentials in cross-origin,
 * so we accept token as query parameter as fallback
 */
router.get('/whatsapp/qr', async (req: Request, res: Response) => {
  try {
    // Manual authentication check (middleware doesn't work well with SSE)
    const cookieToken = req.cookies?.accessToken;
    const queryToken = req.query.token as string;
    const token = cookieToken || queryToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify token
    const { verifyToken } = await import('../../../utils/jwt');
    try {
      const decoded = verifyToken(token);
      
      // Check if user has admin role
      const userRoles = decoded.roles || [decoded.roles?.[0]];
      const hasAdminRole = userRoles.some((role: string) => 
        ['ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())
      );
      
      if (!hasAdminRole) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    // Set up Server-Sent Events with CORS for same-origin
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Import dependencies
    const { queueEventsService } = await import('../../../services/queue-events');
    const { serviceConfigService } = await import('../../../services/service-config');

    // Add this connection to active connections
    queueEventsService.addWhatsAppConnection(res);

    // Send initial status from database
    const statusResult = await serviceConfigService.getServiceConfig('WHATSAPP');
    if (statusResult.success && statusResult.data) {
      res.write(`data: ${JSON.stringify({
        type: 'STATUS',
        data: {
          message: `WhatsApp service status: ${statusResult.data.connectionStatus}`,
          connectionStatus: statusResult.data.connectionStatus,
          isActive: statusResult.data.isActive,
          isEnabled: statusResult.data.isEnabled,
          timestamp: new Date()
        }
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'STATUS',
        message: 'Connecting to WhatsApp service...',
        connectionStatus: 'CONNECTING',
        timestamp: new Date()
      })}\n\n`);
    }

    // Handle client disconnect
    req.on('close', () => {
      queueEventsService.removeWhatsAppConnection(res);
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
 * Test and connect Email service (simple REST API)
 * POST /api/v1/admin/services/email/test-connect
 */
router.post('/email/test-connect', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { config } = req.body;

    // Validate configuration
    if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPass) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Email configuration fields (smtpHost, smtpUser, smtpPass)'
      } as APIResponse);
    }

    // Update the Email config in database with isEnabled = true
    const { serviceConfigService } = await import('../../../services/service-config');
    
    const updateResult = await serviceConfigService.updateServiceConfig('EMAIL', {
      isEnabled: true,
      config: {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort || 587,
        smtpSecure: config.smtpSecure || false,
        smtpUser: config.smtpUser,
        smtpPass: config.smtpPass,
        smtpFrom: config.smtpFrom || config.smtpUser
      }
    }, req.user?.id || 'admin');

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update Email configuration'
      } as APIResponse);
    }

    // Initialize Email service via service control
    const { serviceControlService } = await import('../../../services/service-control');
    await serviceControlService.initializeEmail();

    // Wait for initialization to complete with polling (max 15 seconds)
    const maxAttempts = 30; // 30 attempts * 500ms = 15 seconds max
    let attempts = 0;
    let emailIsActive = false;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
      
      const statusCheck = await serviceConfigService.getServiceConfig('EMAIL');
      if (statusCheck.success && statusCheck.data?.isActive) {
        emailIsActive = true;
        break;
      }
      
      // If there's an error, break early
      if (statusCheck.success && statusCheck.data?.lastError) {
        break;
      }
      
      attempts++;
    }

    // Check final status
    const statusResult = await serviceConfigService.getServiceConfig('EMAIL');

    if (statusResult.success && statusResult.data?.isActive) {
      res.json({
        success: true,
        message: 'Email service connected successfully and test email sent!',
        data: {
          isActive: true,
          isEnabled: true,
          connectionStatus: 'CONNECTED'
        }
      } as APIResponse);
    } else {
      // Failed to connect, disable the service
      await serviceConfigService.updateServiceConfig('EMAIL', {
        isEnabled: false
      }, req.user?.id || 'admin');

      const errorMessage = statusResult.data?.lastError || 'Failed to connect to Email service. Please check your SMTP credentials.';
      
      res.status(400).json({
        success: false,
        message: errorMessage,
        data: {
          isActive: false,
          isEnabled: false,
          connectionStatus: 'AUTH_FAILURE'
        }
      } as APIResponse);
    }

  } catch (error) {
    console.error('❌ Error testing Email connection:', error);
    
    // Disable service on error
    try {
      const { serviceConfigService } = await import('../../../services/service-config');
      await serviceConfigService.updateServiceConfig('EMAIL', {
        isEnabled: false
      }, req.user?.id || 'admin');
    } catch (disableError) {
      console.error('Failed to disable Email service after error:', disableError);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to test Email connection',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
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