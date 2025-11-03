import { Request, Response } from 'express';
import { APIResponse } from '../../types';
import { logger } from '../../utils/logger';
import { prisma } from '@fundifyhub/prisma';
import { SUPPORTED_SERVICES, RequestStatus, ServiceControlAction, ConnectionStatus,LoanStatus } from '@fundifyhub/types';
import { ServiceControlJobData, ServiceName } from '@fundifyhub/types';
import { enqueueServiceControl } from '@fundifyhub/utils';

/**
 * GET /admin/services
 * Get all service configurations (auto-create if missing)
 */
export async function getAllServicesController(req: Request, res: Response): Promise<void> {
  try {
    let configs = await prisma.serviceConfig.findMany({ orderBy: { serviceName: 'asc' } });
    
    for (const serviceName of SUPPORTED_SERVICES) {
      if (!configs.find((cfg: any) => cfg.serviceName === serviceName)) {
        await prisma.serviceConfig.upsert({
          where: { serviceName },
          update: {},
          create: {
            serviceName,
            isEnabled: false,
            isActive: false,
            connectionStatus: ConnectionStatus.DISCONNECTED,
            config: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }
    }
    
    configs = await prisma.serviceConfig.findMany({ orderBy: { serviceName: 'asc' } });
    const serviceStatuses = configs.map((cfg: any) => {
      let transformedConfig = cfg.config;
      
      if (cfg.serviceName === 'EMAIL' && cfg.config && typeof cfg.config === 'object') {
        const emailConfig = cfg.config as any;
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
    
    res.status(200).json({
      success: true,
      message: 'Service configurations retrieved successfully',
      data: serviceStatuses,
    } as APIResponse);
  } catch (error) {
    const contextLogger = logger.child('[get-services]');
    contextLogger.error('Failed to get services:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service configurations',
    } as APIResponse);
  }
}

/**
 * POST /admin/service/:serviceName/enable
 * Enable a service (set isEnabled=true)
 * Worker should pick up and initialize connection
 * Auto-create config if missing
 */
export async function enableServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    let config = await prisma.serviceConfig.findUnique({ where: { serviceName: serviceName.toUpperCase() } });
    
    if (!config) {
      config = await prisma.serviceConfig.create({
        data: {
          serviceName: serviceName.toUpperCase(),
          isEnabled: true,
          isActive: false,
          connectionStatus: ConnectionStatus.DISCONNECTED,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    } else {
      config = await prisma.serviceConfig.update({
        where: { serviceName: serviceName.toUpperCase() },
        data: { isEnabled: true, updatedAt: new Date() },
      });
    }
    
    const adminUserId = (req as any).user?.id || 'unknown-admin';
    const jobData: ServiceControlJobData = {
      action: ServiceControlAction.START,
      serviceName: serviceName.toUpperCase() as ServiceName,
      triggeredBy: adminUserId,
    };
    const result = await enqueueServiceControl(jobData);
    
    if (result.error) {
      const contextLogger = logger.child('[enable-service]');
      contextLogger.error(`Failed to enqueue: ${result.error}`);
    }
    
    res.status(200).json({ success: true, message: `${serviceName} enabled`, data: config } as APIResponse);
  } catch (error) {
    const contextLogger = logger.child('[enable-service]');
    contextLogger.error('Failed to enable service:', error as Error);
    res.status(500).json({ success: false, message: `Failed to enable ${req.params.serviceName}` } as APIResponse);
  }
}

/**
 * POST /admin/service/:serviceName/disable
 * Disable a service and DELETE all data
 * Worker should disconnect, cleanup, and delete from database
 */
export async function disableServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const config = await prisma.serviceConfig.findUnique({ where: { serviceName: serviceName.toUpperCase() } });
    
    if (!config) {
      res.status(404).json({ success: false, message: `${serviceName} not found` } as APIResponse);
      return;
    }
    
    const adminUserId = (req as any).user?.id || 'unknown-admin';
    const jobData: ServiceControlJobData = {
      action: ServiceControlAction.STOP,
      serviceName: serviceName.toUpperCase() as ServiceName,
      triggeredBy: adminUserId,
    };
    const result = await enqueueServiceControl(jobData);
    
    if (result.error) {
      logger.error(`Failed to enqueue service control: ${result.error}`);
    }
    
    // Delete the service config from database
    await prisma.serviceConfig.delete({
      where: { serviceName: serviceName.toUpperCase() }
    });
    
    res.status(200).json({ 
      success: true, 
      message: `${serviceName} disabled and deleted successfully` 
    } as APIResponse);
  } catch (error) {
    logger.error('Error disabling service:', error as Error);
    res.status(500).json({ success: false, message: `Failed to disable ${req.params.serviceName}` } as APIResponse);
  }
}

/**
 * POST /admin/service/:serviceName/disconnect
 * Disconnect a service permanently (delete record)
 * Worker should cleanup and remove session/service data
 */
export async function disconnectServiceController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const config = await prisma.serviceConfig.findUnique({ where: { serviceName: serviceName.toUpperCase() } });
    if (!config) {
      res.status(404).json({ success: false, message: `Service ${serviceName} not found` } as APIResponse);
      return;
    }
    
    // Enqueue job for worker to disconnect and cleanup service
    const adminUserId = (req as any).user?.id || 'unknown-admin';
    const jobData: ServiceControlJobData = {
      action: ServiceControlAction.DISCONNECT,
      serviceName: serviceName.toUpperCase() as ServiceName,
      triggeredBy: adminUserId,
    };
    const result = await enqueueServiceControl(jobData);
    
    if (result.error) {
      logger.error(`Failed to enqueue service control: ${result.error}`);
    }
    
    await prisma.serviceConfig.delete({ where: { serviceName: serviceName.toUpperCase() } });
    
    res.status(200).json({ success: true, message: `${serviceName} disconnected and cleaned up` } as APIResponse);
  } catch (error) {
    logger.error('Error disconnecting service:', error as Error);
    res.status(500).json({ success: false, message: `Failed to disconnect ${req.params.serviceName}` } as APIResponse);
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
    
    // Validate service name
    const upperServiceName = serviceName.toUpperCase() as ServiceName;
    if (!SUPPORTED_SERVICES.includes(upperServiceName)) {
      res.status(400).json({ 
        success: false, 
        message: `Invalid service name: ${serviceName}` 
      } as APIResponse);
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
        } as APIResponse);
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
          connectionStatus: ConnectionStatus.DISCONNECTED,
          config: configData,
          createdAt: new Date(),
          updatedAt: new Date(),
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
    } as APIResponse);
  } catch (error) {
    logger.error('Error configuring service:', error as Error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to configure ${req.params.serviceName}` 
    } as APIResponse);
  }
}


export async function getActiveLoansController(req: Request, res: Response): Promise<void> {
  try {
    // Query all loans with status ACTIVE
    const activeLoans = await prisma.loan.findMany({
      where: {
        status: LoanStatus.ACTIVE,
      },
      include: {
        request: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                district: true,
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Found ${activeLoans.length} active loan(s)`,
      data: activeLoans,
    } as APIResponse);
  } catch (error) {
    logger.error('Error getting active loans:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active loans',
    } as APIResponse);
  }
}

/**
 * 
 * @param req 
 * @param res 
 * @returns 
 */
export async function getPendingRequestsController(req: Request, res: Response): Promise<void> {
  try {
    const pendingStatuses = [
      RequestStatus.PENDING,
      RequestStatus.UNDER_REVIEW,
      RequestStatus.OFFER_MADE,
      RequestStatus.OFFER_ACCEPTED,
      RequestStatus.OFFER_REJECTED,
      RequestStatus.INSPECTION_SCHEDULED,
      RequestStatus.INSPECTION_IN_PROGRESS,
      RequestStatus.INSPECTION_COMPLETED
    ];

    const pendingRequests = await prisma.request.findMany({
      where: {
        currentStatus: {
          in: pendingStatuses
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            district: true
          }
        },
        assignedAgent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        loan: {
          select: {
            id: true,
            status: true,
            approvedAmount: true,
            disbursedDate: true
          }
        },
        _count: {
          select: {
            comments: true,
            inspections: true,
            documents: true
          }
        }
      },
      orderBy: {
        submittedDate: 'desc'
      }
    });

    if (pendingRequests.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No pending requests found',
        data: []
      } as APIResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: `Found ${pendingRequests.length} pending request(s)`,
      data: pendingRequests
    } as APIResponse);
  } catch (error) {
    logger.error('Error getting pending requests:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests'
    } as APIResponse);
  }
}