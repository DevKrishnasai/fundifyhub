/**
 * Socket configuration constants
 */

export const DEFAULT_SOCKET_OPTIONS = {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  autoConnect: true,
  withCredentials: true,
} as const;
