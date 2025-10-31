/**
 * Shared queue-related constants and enums
 * Export reusable action/status constants so other packages can import them
 */
export enum ServiceControlAction {
  START = 'START',
  STOP = 'STOP',
  RESTART = 'RESTART',
  DISCONNECT = 'DISCONNECT',
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CONNECTING = 'CONNECTING',
  WAITING_FOR_QR_SCAN = 'WAITING_FOR_QR_SCAN',
  AUTHENTICATED = 'AUTHENTICATED',
  INITIALIZING = 'INITIALIZING',
}

export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  WHATSAPP: 'whatsapp-queue',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export default {
  ServiceControlAction,
  ConnectionStatus,
  QUEUE_NAMES,
};
