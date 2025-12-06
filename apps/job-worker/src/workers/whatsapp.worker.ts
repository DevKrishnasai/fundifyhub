/**
 * WhatsApp Worker
 *
 * Processes jobs from the whatsapp queue.
 *
 * @module apps/job-worker/src/workers/whatsapp
 */

import { Worker } from 'bullmq';

const worker = new Worker(
  'whatsapp',
  async (job) => {
    console.log('Processing WhatsApp job:', job.data);
    // TODO: (agent) Add logic to send WhatsApp message using a provider like Twilio
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

export default worker;
