import { EnqueueOptions, EnqueueResult, ServiceName, EMAIL_QUEUE, WHATSAPP_QUEUE, JobOptions, ServiceControlJobData } from '@fundifyhub/types';
import { getTemplateMetadata, TEMPLATE_NAMES } from '@fundifyhub/templates';
import { Queue } from 'bullmq';
import { appConfig } from './env';

const connection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
};

const emailQueue = new Queue(EMAIL_QUEUE, { connection });
const whatsappQueue = new Queue(WHATSAPP_QUEUE, { connection });

export async function enqueue(
  templateName: TEMPLATE_NAMES,
  variables: Record<string, unknown>,
  options: EnqueueOptions = {}
): Promise<EnqueueResult[] | { error: string }> {
  // Resolve template metadata from shared registry
  const templateMeta = getTemplateMetadata(templateName);
  if (!templateMeta) {
    return { error: `Template not found: ${templateName}` };
  }

  console.log('Enqueueing template:', templateName, 'with variables:', variables);

  // Validate required variables (shallow presence check)
  const missing = (templateMeta.requiredVariables || []).filter((v: string) => !(v in variables));
  if (missing.length > 0) {
    return { error: `Missing variables: ${missing.join(', ')}` };
  }

  console.log('All required variables present for template:', templateName);

  // Determine services to enqueue: options.services overrides template supportedServices
  const servicesToEnqueue = options.services && options.services.length > 0 ? options.services : templateMeta.supportedServices;

  // Compute final job options: caller options override template defaults
  const jobOptions: JobOptions = {
    priority: options.priority ?? templateMeta.defaults?.priority,
    delay: options.delay ?? templateMeta.defaults?.delay,
    attempts: options.attempts ?? templateMeta.defaults?.attempts ?? 3, // Default 3 retries if not specified
  };

  // Add backoff strategy for retries (exponential with 30s initial delay)
  const bullmqOptions = {
    ...jobOptions,
    backoff: {
      type: 'exponential' as const,
      delay: 30000, // 30 seconds initial delay
    },
  };

  const results: EnqueueResult[] = [];

  for (const svc of servicesToEnqueue) {
    if (!templateMeta.supportedServices.includes(svc)) {
      results.push({ service: svc, jobId: null, warning: 'Service not supported by template' });
      continue;
    }

    try {
      if (svc === ServiceName.EMAIL) {
        const job = await emailQueue.add(templateName, { templateName, variables }, bullmqOptions);
        results.push({ service: svc, jobId: job?.id });
      } else if (svc === ServiceName.WHATSAPP) {
        const job = await whatsappQueue.add(templateName, { templateName, variables }, bullmqOptions);
        results.push({ service: svc, jobId: job?.id });
      } else {
        results.push({ service: svc, jobId: null, warning: 'Unsupported service' });
      }
    } catch (err: any) {
      results.push({ service: svc, jobId: null, error: err?.message || String(err) });
    }
  }

  return results;
}

/**
 * Enqueue a service control job (START, STOP, RESTART, DISCONNECT)
 * Control jobs are enqueued to the respective service queue
 */
export async function enqueueServiceControl(
  data: ServiceControlJobData
): Promise<{ jobId?: string | number; error?: string }> {
  try {
    const { serviceName } = data;
    const upperServiceName = String(serviceName).toUpperCase();
    let job;

    if (upperServiceName === 'EMAIL') {
      job = await emailQueue.add('service-control', data, { priority: 1 }); // High priority
    } else if (upperServiceName === 'WHATSAPP') {
      job = await whatsappQueue.add('service-control', data, { priority: 1 }); // High priority
    } else {
      return { error: 'Unsupported service' };
    }

    return { jobId: job?.id };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}

export default enqueue;
