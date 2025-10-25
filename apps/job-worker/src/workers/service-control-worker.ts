import { Worker, Job } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';
import { initializeWhatsApp, destroyWhatsApp, initializeEmail, destroyEmail } from '../services/otp-service';

const logger = createLogger({ serviceName: 'service-control-worker' });

export interface ServiceControlCommand {
  // Support both 'command' (worker) and legacy 'action' (producer) shapes.
  command?: 'INITIALIZE' | 'DESTROY' | 'STATUS_CHECK';
  action?: 'START' | 'STOP' | 'RESTART';
  serviceName: 'WHATSAPP' | 'EMAIL';
  config?: any;
  timestamp?: Date;
}

export class ServiceControlWorker {
  private worker: Worker;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    this.worker = new Worker<ServiceControlCommand>(
      'service-control',
      async (job: Job<ServiceControlCommand>) => {
        try {
          logger.info(`📨 Processing ${job.data.serviceName} command: ${job.data.command}`);

          // Normalize command: prefer explicit 'command', fall back to 'action'
          const cmd = job.data.command
            ? job.data.command
            : (job.data.action === 'START' || job.data.action === 'RESTART')
            ? 'INITIALIZE'
            : job.data.action === 'STOP'
            ? 'DESTROY'
            : undefined;

          if (!cmd) {
            throw new Error(`Unknown service control command/action for job ${job.id}`);
          }

          if (job.data.serviceName === 'WHATSAPP') {
            if (cmd === 'INITIALIZE') {
              await initializeWhatsApp();
            } else if (cmd === 'DESTROY') {
              await destroyWhatsApp();
            }
          } else if (job.data.serviceName === 'EMAIL') {
            if (cmd === 'INITIALIZE') {
              await initializeEmail();
            } else if (cmd === 'DESTROY') {
              await destroyEmail();
            }
          }

          return { success: true, message: `${job.data.command} completed for ${job.data.serviceName}` };
        } catch (error) {
          logger.error(`Service control job ${job.id} failed:`, error as Error);
          throw error;
        }
      },
      { 
        connection,
        concurrency: 1 // Process one service control command at a time
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('error', (err: Error) => {
      logger.error('Service control worker error:', err);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Service control job ${job?.id} failed:`, err);
    });

    this.worker.on('completed', (job) => {
      logger.info(`✅ Service control job ${job.id} completed`);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
    logger.info('Service control worker closed');
  }

  get isRunning(): boolean {
    return !this.worker.closing;
  }
}
