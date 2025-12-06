/**
 * In-App Notification Worker
 *
 * Processes jobs from the in-app queue.
 *
 * @module apps/job-worker/src/workers/inapp
 */

import { Worker } from 'bullmq';

const worker = new Worker(
  'in-app',
  async (job) => {
    console.log('Processing in-app notification job:', job.data);
    // TODO: (agent) Add logic to save the notification to the database
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

export default worker;
