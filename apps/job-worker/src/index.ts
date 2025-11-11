import { EmailWorker, WhatsAppWorker  } from './workers';
import { serviceManager } from './services/service-manager';
import { QUEUE_NAMES } from '@fundifyhub/types';
import config from './utils/config';
import logger from './utils/logger';

class JobWorkerServer {
  private emailWorker: EmailWorker | null = null;
  private whatsappWorker: WhatsAppWorker | null = null;

  async start(): Promise<void> {
    try {
  // App-level config validates env on import. At this point the
  // configuration shape is trusted and consumer modules can import
  // `./utils/config` to read typed values.
  logger.info('✅ Job-worker configuration loaded successfully');

      // Initialize ServiceManager with logger
      serviceManager.initialize(logger);

      // Start workers
      this.emailWorker = new EmailWorker(QUEUE_NAMES.EMAIL_QUEUE, logger);
      this.whatsappWorker = new WhatsAppWorker(QUEUE_NAMES.WHATSAPP_QUEUE, logger);

      const contextLogger = logger.child('[workers]');
      contextLogger.info('Email worker initialized');
      contextLogger.info('WhatsApp worker initialized');

    } catch (error) {
      const contextLogger = logger.child('[startup]');  
      contextLogger.error('Failed to start server:', error as Error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping job worker server...');

      if (this.emailWorker) {
        await this.emailWorker.close();
        this.emailWorker = null;
        logger.info('Email worker closed');
      }

      if (this.whatsappWorker) {
        await this.whatsappWorker.close();
        this.whatsappWorker = null;
        logger.info('WhatsApp worker closed');
      }

      // Stop ServiceManager periodic checking
      serviceManager.shutdown();
    } catch (error) {
      logger.error('Error stopping job worker server:', error as Error);
    }
  }
}

const server = new JobWorkerServer();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

server.start();