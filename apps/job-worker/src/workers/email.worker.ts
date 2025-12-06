/**
 * Email Worker
 *
 * Processes jobs from the email queue.
 *
 * @module apps/job-worker/src/workers/email
 */

import { Worker } from 'bullmq';

const worker = new Worker(
  'email',
  async (job) => {
    console.log('Processing email job:', job.data);
    // TODO: (agent) Add logic to send email using a provider like Nodemailer or Resend
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

export default worker;
