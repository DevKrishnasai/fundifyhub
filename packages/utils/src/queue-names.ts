// Shared queue and job name constants so all services use the same names
export const QUEUE_NAMES = {
  OTP: 'otp',
  EMAIL: 'email',
  DEFAULT: 'default',
  // Add more queues here (e.g., 'notifications', 'reports')
} as const;

export const JOB_NAMES = {
  SEND_OTP: 'send-otp',
  WELCOME_EMAIL: 'welcome',
  // Add more job names here
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 500,
};

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES] | string;
export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES] | string;

export default { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS };
