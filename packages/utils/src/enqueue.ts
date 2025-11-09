import { Queue } from 'bullmq';
import {
  SERVICE_NAMES,
  TEMPLATE_NAMES,
  TemplatePayloadMapType,
  JobOptionsType,
  AddJobResultType,
  AddServiceControlJobType,
  AddServiceStatusJobResultType,
  JOB_TYPES,
  QUEUE_NAMES
} from '@fundifyhub/types';
import TEMPLATE_REGISTRY from '@fundifyhub/templates';

export interface EnqueueClient {
  addAJob<T extends TEMPLATE_NAMES>(
    templateName: T,
    variables: TemplatePayloadMapType[T],
    options?: JobOptionsType
  ): Promise<AddJobResultType[]>;

  addAServiceControlJob(
    data: AddServiceControlJobType
  ): Promise<AddServiceStatusJobResultType>;
}

export function createEnqueueClient(connection: { host: string; port: number }): EnqueueClient {
  const emailQueue = new Queue(QUEUE_NAMES.EMAIL_QUEUE, { connection });
  const whatsappQueue = new Queue(QUEUE_NAMES.WHATSAPP_QUEUE, { connection });

  const addAJob = async <T extends TEMPLATE_NAMES>(
    templateName: T,
    variables: TemplatePayloadMapType[T],
    options?: JobOptionsType
  ): Promise<AddJobResultType[]> => {
    const template = TEMPLATE_REGISTRY[templateName];

    const servicesToEnqueue = options?.services && options.services.length > 0 ? options.services : template.supportedServices;

    const jobOptions: JobOptionsType = {
      priority: options?.priority ?? Number(template.defaults?.priority),
      delay: options?.delay ?? Number(template.defaults?.delay),
      attempts: options?.attempts ?? Number(template.defaults?.attempts),
    };

    // Add backoff strategy for retries (exponential with 30s initial delay)
    const bullmqOptions = {
      ...jobOptions,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30 seconds initial delay
      },
    };

    const results: AddJobResultType[] = [];

    for (const svc of servicesToEnqueue) {
      // Ensure the template actually supports this service
      if (!template.supportedServices.includes(svc)) {
        results.push({ jobId: "", error: `Service not supported by template ${svc}` });
        continue;
      }

      // Channel-specific validation: fail early if required channel fields are absent
      if (svc === SERVICE_NAMES.EMAIL) {
        // templates expect `variables.email` for email
        // runtime-check because TemplatePayloadMapType is a compile-time type
        if (!('email' in (variables as any)) || !(variables as any).email) {
          results.push({ jobId: "", error: `Missing required field "email" for service EMAIL` });
          continue;
        }
      }

      if (svc === SERVICE_NAMES.WHATSAPP) {
        // templates expect `variables.phoneNumber` for WhatsApp
        if (!('phoneNumber' in (variables as any)) || !(variables as any).phoneNumber) {
          results.push({ jobId: "", error: `Missing required field "phoneNumber" for service WHATSAPP` });
          continue;
        }
      }

      try {
        if (svc === SERVICE_NAMES.EMAIL) {
          const job = await emailQueue.add(JOB_TYPES.SEND_EMAIL, { templateName, variables }, bullmqOptions);
          results.push({ jobId: job?.id! });
        } else if (svc === SERVICE_NAMES.WHATSAPP) {
          const job = await whatsappQueue.add(JOB_TYPES.SEND_WHATSAPP, { templateName, variables }, bullmqOptions);
          results.push({ jobId: job?.id! });
        } else {
          results.push({ jobId: "", error: 'Unsupported service' });
        }
      } catch (err: any) {
        results.push({ jobId: "", error: err?.message || String(err) });
      }
    }

    return results;
  };

  const addAServiceControlJob = async (
    data: AddServiceControlJobType
  ): Promise<AddServiceStatusJobResultType> => {
    try {
      const { serviceName } = data;
      let job;

      if (serviceName === SERVICE_NAMES.EMAIL) {
        job = await emailQueue.add(JOB_TYPES.SERVICE_CONTROL, data, { priority: 1 }); // High priority
      } else if (serviceName === SERVICE_NAMES.WHATSAPP) {
        job = await whatsappQueue.add(JOB_TYPES.SERVICE_CONTROL, data, { priority: 1 }); // High priority
      } else {
        return { jobId: "", error: 'Unsupported service' };
      }

      return { jobId: job?.id! };
    } catch (err: any) {
      return { jobId: "", error: err?.message || String(err) };
    }
  };

  return {
    addAJob,
    addAServiceControlJob
  };
}


export default createEnqueueClient;