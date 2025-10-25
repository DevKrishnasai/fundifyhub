import { createLogger } from '@fundifyhub/logger';
import { OTPWorker } from './workers/otp';
import { ServiceControlWorker } from './workers/service-control';
import { serviceManager } from './services/service-manager';
import { prisma } from '@fundifyhub/prisma';
import { enqueue, QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS, SERVICE_ACTIONS } from '@fundifyhub/utils';
import { ServiceControlJobData, ServiceName } from '@fundifyhub/types';

const logger = createLogger({ serviceName: 'job-worker' });

class JobWorkerServer {
  private otpWorker: OTPWorker | null = null;
  private serviceControlWorker: ServiceControlWorker | null = null;

  /**
   * Check for enabled services on startup and initialize them
   */
  private async initializeEnabledServices(): Promise<void> {
    try {
      logger.info('[Startup] Checking for enabled services...');
      
      const enabledServices = await prisma.serviceConfig.findMany({
        where: {
          isEnabled: true,
          serviceName: {
            in: ['EMAIL', 'WHATSAPP']
          }
        }
      });

      if (enabledServices.length === 0) {
        logger.info('[Startup] No enabled services found');
        return;
      }

      logger.info(`[Startup] Found ${enabledServices.length} enabled service(s): ${enabledServices.map(s => s.serviceName).join(', ')}`);

      // Queue START jobs for each enabled service
      for (const service of enabledServices) {
        const jobData: ServiceControlJobData = {
          serviceName: service.serviceName as ServiceName,
          action: SERVICE_ACTIONS.START,
          triggeredBy: 'startup'
        };

        await enqueue(
          QUEUE_NAMES.SERVICE_CONTROL,
          JOB_NAMES.SERVICE_CONTROL,
          jobData,
          DEFAULT_JOB_OPTIONS
        );

        logger.info(`[Startup] Initializing ${service.serviceName}...`);
      }
    } catch (error) {
      logger.error('[Startup] Failed to initialize enabled services:', error as Error);
    }
  }

  async start(): Promise<void> {
    try {
      // TODO: ADD validateConfig check to ensure env vars are set

      // Initialize ServiceManager with logger (starts periodic service checking)
      serviceManager.initialize(logger);

      // Initialize OTP worker (shares same logger instance)
      this.otpWorker = new OTPWorker(logger);
      logger.info('[Worker] OTP worker initialized');

      // Initialize Service Control worker (shares same logger instance)
      this.serviceControlWorker = new ServiceControlWorker(logger);
      logger.info('[Worker] Service control worker initialized');

      // Check for enabled services and initialize them
      await this.initializeEnabledServices();

      logger.info('[Worker] Job worker server started - all workers active');
    } catch (error) {
      logger.error('[Worker] Failed to start job worker server:', error as Error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('[Worker] Stopping job worker server...');
      
      if (this.otpWorker) {
        await this.otpWorker.close();
        this.otpWorker = null;
        logger.info('[Worker] OTP worker closed');
      }
      
      if (this.serviceControlWorker) {
        await this.serviceControlWorker.close();
        this.serviceControlWorker = null;
        logger.info('[Worker] Service control worker closed');
      }
      
      // Stop ServiceManager periodic checking
      serviceManager.shutdown();
      logger.info('[Worker] Service manager stopped');
      
      logger.info('[Worker] Job worker server stopped gracefully');
    } catch (error) {
      logger.error('[Worker] Error stopping job worker server:', error as Error);
    }
  }
}

const server = new JobWorkerServer();

process.on('SIGTERM', async () => {
  logger.info('[Signal] SIGTERM received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Signal] SIGINT received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

server.start();