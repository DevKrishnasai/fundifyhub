import { createLogger } from '@fundifyhub/logger';
import { initializeWhatsApp, initializeEmail } from './otp-service';
import { configManager } from './config-manager';

const logger = createLogger({ serviceName: 'job-worker-services' });

/**
 * Initialize OTP services on worker startup
 * Reads database configuration and initializes enabled services
 */
export async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing OTP services from database configuration...');

    // Initialize both WhatsApp and email services based on database config
    // These will check if services are enabled before actually initializing
    await Promise.allSettled([
      initializeWhatsApp(),
      initializeEmail()
    ]);

    logger.info('✅ OTP services initialization completed');
  } catch (error) {
    logger.error('Failed to initialize OTP services:', error as Error);
    throw error;
  }
}
