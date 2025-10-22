import { createLogger } from '@fundifyhub/logger';
import { validateConfig } from '@fundifyhub/utils';
import { OTPWorker } from './workers/otp-worker';
import { initializeServices } from './services';

const logger = createLogger({ serviceName: 'job-worker-server' });

class JobWorkerServer {
  private otpWorker: OTPWorker | null = null;

  async start(): Promise<void> {
    try {
      // Validate environment configuration
      validateConfig();
      logger.info('Job worker environment validated');

      // Initialize OTP worker
      this.otpWorker = new OTPWorker();
      logger.info('OTP worker initialized');

      // Initialize OTP services (WhatsApp, Email)
      await initializeServices();
      logger.info('OTP services initialized');

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
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the server
server.start();