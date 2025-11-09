import { Worker, Job, WorkerOptions } from 'bullmq';
import config from './config';
import { SimpleLogger } from '@fundifyhub/logger';
import { QUEUE_NAMES } from '@fundifyhub/types';

export abstract class BaseWorker<T> {
  protected worker: Worker<T>;
  protected logger: SimpleLogger;
  protected queueName: QUEUE_NAMES;

  constructor(queueName: QUEUE_NAMES, logger: SimpleLogger) {
    this.logger = logger;
    this.queueName = queueName;

    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    const workerOptions: WorkerOptions = {
      connection,
      concurrency: this.getConcurrency(), 
    };

    this.worker = new Worker<T>(queueName, this.processJob.bind(this), workerOptions);
    this.setupEventHandlers();
  }

  /**
   * Abstract method to be implemented by child workers
   * Processes individual jobs from the queue
   */
  protected abstract processJob(job: Job<T>): Promise<any>;

  /**
   * Get concurrency for this worker (override in child class if needed)
   */
  protected getConcurrency(): number {
    return 1;
  }

  /**
   * Setup common event handlers for all workers
   */
  private setupEventHandlers(): void {
    this.worker.on('error', (err: Error) => {
      const contextLogger = this.logger.child(`[${this.queueName}]`);
      // Ensure we log the underlying error message even if it's not an Error instance
      const msg = err instanceof Error ? err.message : String(err);
      contextLogger.error(`Worker error: ${msg}`);
    });

    this.worker.on('failed', (job, err) => {
      const contextLogger = this.logger.child(`[Job ${job?.id}] [${this.queueName}]`);
      // Bull may deliver non-Error objects; normalize to a string for logging
      const msg = err instanceof Error ? err.message : (err ? JSON.stringify(err) : 'unknown error');
      contextLogger.error(`Failed: ${msg}`);
    });

    this.worker.on('completed', (job) => {
      const contextLogger = this.logger.child(`[Job ${job.id}] [${this.queueName}]`);
      contextLogger.info('Completed successfully');
    });

    this.worker.on('active', (job) => {
      const contextLogger = this.logger.child(`[Job ${job.id}] [${this.queueName}]`);
      contextLogger.info('Processing...');
    });
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    const contextLogger = this.logger.child(`[${this.queueName}]`);
    contextLogger.info('Worker closed');
  }

  /**
   * Check if worker is running
   */
  get isRunning(): boolean {
    return !this.worker.closing;
  }
}
