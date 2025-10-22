import { createLogger } from '@fundifyhub/logger';
import { validateConfig } from '@fundifyhub/utils';
import { OTPWorker, ServiceControlWorker } from './workers';
import { initializeServices } from './services';

const logger = createLogger({ serviceName: 'job-worker-server' });

class JobWorkerServer {
  private otpWorker: OTPWorker | null = null;
  private serviceControlWorker: ServiceControlWorker | null = null;

  async start(): Promise<void> {
    try {
      // Validate environment configuration
      validateConfig();
      logger.info('Job worker environment validated');

      // Initialize OTP worker
      this.otpWorker = new OTPWorker();
      logger.info('OTP worker initialized');

      // Initialize Service Control worker (handles WhatsApp/Email init/destroy)
      this.serviceControlWorker = new ServiceControlWorker();
      logger.info('Service control worker initialized');

      // Initialize OTP services (WhatsApp, Email) - read initial DB state
      await initializeServices();
      logger.info('OTP services initialized from database configuration');

      logger.info('🚀 Job worker server started successfully');
    } catch (error) {
      logger.error('Failed to start job worker server:', error as Error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.otpWorker) {
        await this.otpWorker.close();
        this.otpWorker = null;
      }
      if (this.serviceControlWorker) {
        await this.serviceControlWorker.close();
        this.serviceControlWorker = null;
      }
      logger.info('Job worker server stopped gracefully');
    } catch (error) {
      logger.error('Error stopping job worker server:', error as Error);
    }
  }
}

// Create server instance
const server = new JobWorkerServer();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  
  // For file lock errors on Windows, log but don't crash
  if (error.message && error.message.includes('EBUSY')) {
    logger.error('⚠️  File lock error detected - WhatsApp session files may be locked');
    logger.error('💡 Run: npm run cleanup:whatsapp (in job-worker directory) to fix this');
    return; // Don't exit, let the process continue
  }
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const errorMessage = String(reason);
  logger.error(`Unhandled rejection at: ${promise}, reason: ${errorMessage}`);
  
  // For file lock errors on Windows, log but don't crash
  if (errorMessage.includes('EBUSY') || errorMessage.includes('resource busy or locked')) {
    logger.error('⚠️  File lock error detected in async operation');
    logger.error('💡 Solution: cd apps/job-worker && npm run cleanup:whatsapp');
    logger.error('💡 Then restart: turbo dev (from root)');
    return; // Don't exit, let the process continue
  }
  
  process.exit(1);
});

// Start the server
server.start();