import { Worker, Job, WorkerOptions } from 'bullmq';
import { config } from '../config';
import { SimpleLogger } from '@fundifyhub/logger';

export abstract class BaseWorker<T = any> {
  protected worker: Worker<T>;
  protected logger: SimpleLogger;
  protected queueName: string;

  constructor(queueName: string, logger: any) {
    this.logger = logger;
    this.queueName = queueName;

    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    const workerOptions: WorkerOptions = {
      connection,
      concurrency: this.getConcurrency(),
      // Additional options can be added here
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
      this.logger.error(`[${this.queueName}] Worker error:`, err);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`[Job ${job?.id}] [${this.queueName}] Failed:`, err);
    });

    this.worker.on('completed', (job) => {
      this.logger.info(`[Job ${job.id}] [${this.queueName}] Completed`);
    });

    this.worker.on('active', (job) => {
      this.logger.info(`[Job ${job.id}] [${this.queueName}] Processing...`);
    });
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    this.logger.info(`[${this.queueName}] Worker closed`);
  }

  /**
   * Check if worker is running
   */
  get isRunning(): boolean {
    return !this.worker.closing;
  }
}
