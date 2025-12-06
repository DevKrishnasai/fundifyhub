/**
 * SMS Worker
 *
 * Processes jobs from the sms queue.
 *
 * @module apps/job-worker/src/workers/sms
 */

import { Worker } from 'bullmq';

const worker = new Worker(
  'sms',
  async (job) => {
    console.log('Processing SMS job:', job.data);
    // TODO: (agent) Add logic to send SMS using a provider like Twilio
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

export default worker;
