import { appConfig } from './env';

// Use dynamic require for bullmq so this shared package doesn't hard-fail
// at compile time if bullmq is not installed for this package build.
let BullQueue: any;
function getBullQueueClass() {
  if (!BullQueue) {
  BullQueue = require('bullmq').Queue;
  }
  return BullQueue;
}

// Lightweight queue producer wrapper
// Re-uses Queue instances per queue name to avoid reconnect overhead
const queues = new Map<string, any>();

function getConnection() {
  return {
    host: appConfig.redis.host,
    port: appConfig.redis.port,
  };
}

function getQueue(name: string): any {
  if (!queues.has(name)) {
    const QueueClass = getBullQueueClass();
    const q = new QueueClass(name, { connection: getConnection() });
    queues.set(name, q);
  }
  return queues.get(name)!;
}

export async function enqueue<JobData = any>(
  queueName: string,
  jobName: string,
  data: JobData,
  opts?: Record<string, any>
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const q = getQueue(queueName);
    const job = await q.add(jobName, data, {
      removeOnComplete: 100,
      removeOnFail: 500,
      ...(opts || {}),
    });
    return { success: true, jobId: job.id as string };
  } catch (err) {
    // Keep this module dependency-light; callers may log more details
    return { success: false, error: (err as Error)?.message || String(err) };
  }
}

export async function closeAllQueues(): Promise<void> {
  const closers: Promise<void>[] = [];
  for (const q of queues.values()) {
    closers.push(q.close());
  }
  await Promise.all(closers);
  queues.clear();
}

export default { enqueue, closeAllQueues };
