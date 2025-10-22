import { createLogger } from '@fundifyhub/logger';
import { initializeWhatsApp, initializeEmail } from './otp-service';
import { configManager } from './config-manager';
import { jobWorkerEventService } from './event-service';

const logger = createLogger({ serviceName: 'job-worker-services' });

export async function initializeServices(): Promise<void> {
  try {
    // Start config manager with periodic refresh
    configManager.startPeriodicRefresh();
    logger.info('Config manager started');

    // Set up event system for real-time communication with main backend
    setupEventHandlers();
    logger.info('Event handlers setup complete');

    // Initialize both WhatsApp and email services based on database config
    await Promise.allSettled([
      initializeWhatsApp(),
      initializeEmail()
    ]);

    logger.info('OTP services initialization completed');
  } catch (error) {
    logger.error('Failed to initialize OTP services:', error as Error);
    throw error;
  }
}

function setupEventHandlers(): void {
  // Subscribe to WhatsApp commands from main backend
  jobWorkerEventService.subscribeToWhatsAppCommands(async (command) => {
    if (command.command === 'INITIALIZE') {
      const { destroyWhatsApp, initializeWhatsApp } = await import('./otp-service');
      await destroyWhatsApp();
      await initializeWhatsApp();
    } else if (command.command === 'DESTROY') {
      const { destroyWhatsApp } = await import('./otp-service');
      await destroyWhatsApp();
    }
  });

  // Subscribe to Email commands from main backend
  jobWorkerEventService.subscribeToEmailCommands(async (command) => {
    if (command.command === 'INITIALIZE') {
      const { initializeEmail } = await import('./otp-service');
      await initializeEmail();
    } else if (command.command === 'DESTROY') {
      const { destroyEmail } = await import('./otp-service');
      await destroyEmail();
    }
  });

  logger.info('Service command handlers registered');
}