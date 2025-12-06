/**
 * Enhanced Logger for FundifyHub Applications
 *
 * Features:
 * - Winston-based logging with multiple transports
 * - Console output with colors (development)
 * - File rotation with daily rotate (production)
 * - Child loggers for contextual logging
 * - Structured JSON logs for production
 *
 * Usage:
 * ```ts
 * import { createLogger } from '@fundifyhub/logger';
 *
 * const logger = createLogger({ serviceName: 'main-backend' });
 * logger.info('Server started');
 *
 * // Child logger with context
 * const authLogger = logger.child({ context: 'auth' });
 * authLogger.info('User logged in', { userId: '123' });
 * ```
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

/** Log levels following standard severity */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

/** Configuration for creating a logger instance */
export interface LoggerConfig {
  /** Service name (e.g., 'main-backend', 'job-worker') */
  serviceName: string;
  /** Optional initial context */
  context?: string;
  /** Log level (defaults to 'info' in production, 'debug' in development) */
  level?: LogLevel;
  /** Directory for log files (defaults to 'logs' in project root) */
  logDir?: string;
  /** Enable file logging (defaults to true in production) */
  enableFileLogging?: boolean;
  /** Enable console logging (defaults to true) */
  enableConsoleLogging?: boolean;
}

/** Metadata that can be passed to log methods */
export interface LogMeta {
  [key: string]: unknown;
}

/** Logger interface exposed to applications */
export interface Logger {
  error(message: string, meta?: LogMeta | Error): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  http(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  child(options: { context: string } | string): Logger;
  setContext(context: string): void;
  clearContext(): void;
}

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  brightCyan: '\x1b[96m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  white: '\x1b[37m',
} as const;

/** Get color for log level */
function getLevelColor(level: string): string {
  switch (level) {
    case 'error':
      return colors.brightRed;
    case 'warn':
      return colors.brightYellow;
    case 'info':
      return colors.brightCyan;
    case 'http':
      return colors.brightMagenta;
    case 'debug':
      return colors.gray;
    default:
      return colors.reset;
  }
}

/** Format timestamp for console output */
function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** Custom console format with colors */
const consoleFormat = winston.format.printf(({ level, message, timestamp, service, context, ...meta }) => {
  const levelColor = getLevelColor(level);
  const contextStr = context ? ` ${colors.brightMagenta}[${context}]${colors.reset}` : '';
  const metaStr = Object.keys(meta).length > 0 ? ` ${colors.dim}${JSON.stringify(meta)}${colors.reset}` : '';

  return `${colors.dim}${timestamp}${colors.reset} ${colors.brightBlue}[${service}]${colors.reset}${contextStr} ${levelColor}${colors.bold}${level.toUpperCase()}${colors.reset}: ${message}${metaStr}`;
});

/** Create log directory if it doesn't exist */
function ensureLogDir(logDir: string): void {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/** Determine if we should enable colors */
function shouldEnableColors(): boolean {
  return (
    process.env.FORCE_COLOR === '1' ||
    process.env.FORCE_COLOR === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.COLORTERM === 'truecolor' ||
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.TERM_PROGRAM === 'Windows Terminal' ||
    process.platform === 'win32' ||
    process.stdout.isTTY === true
  );
}

/**
 * Create a logger instance for a service
 */
export function createLogger(config: LoggerConfig): Logger {
  const {
    serviceName,
    context: initialContext,
    level = process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    logDir = path.join(process.cwd(), 'logs'),
    enableFileLogging = process.env.NODE_ENV === 'production',
    enableConsoleLogging = true,
  } = config;

  const transports: winston.transport[] = [];

  // Console transport with colors
  if (enableConsoleLogging) {
    const useColors = shouldEnableColors();

    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: formatTimestamp }),
          useColors ? consoleFormat : winston.format.simple()
        ),
      })
    );
  }

  // File transports with daily rotation
  if (enableFileLogging) {
    ensureLogDir(logDir);

    // Combined log file (all levels)
    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: `${serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );

    // Error log file (errors only)
    transports.push(
      new DailyRotateFile({
        dirname: logDir,
        filename: `${serviceName}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      })
    );
  }

  // Create Winston logger
  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    transports,
  });

  // Track current context
  let currentContext = initialContext;

  /** Create the logger interface */
  function createLoggerInterface(ctx?: string): Logger {
    const effectiveContext = ctx || currentContext;

    const logWithContext = (logLevel: LogLevel, message: string, meta?: LogMeta | Error) => {
      const logMeta: LogMeta = effectiveContext ? { context: effectiveContext } : {};

      if (meta instanceof Error) {
        logMeta.error = {
          message: meta.message,
          stack: meta.stack,
          name: meta.name,
        };
      } else if (meta) {
        Object.assign(logMeta, meta);
      }

      winstonLogger.log(logLevel, message, logMeta);
    };

    return {
      error: (message: string, meta?: LogMeta | Error) => logWithContext('error', message, meta),
      warn: (message: string, meta?: LogMeta) => logWithContext('warn', message, meta),
      info: (message: string, meta?: LogMeta) => logWithContext('info', message, meta),
      http: (message: string, meta?: LogMeta) => logWithContext('http', message, meta),
      debug: (message: string, meta?: LogMeta) => logWithContext('debug', message, meta),

      child: (options: { context: string } | string): Logger => {
        const childContext = typeof options === 'string' ? options : options.context;
        const fullContext = effectiveContext ? `${effectiveContext}:${childContext}` : childContext;
        return createLoggerInterface(fullContext);
      },

      setContext: (context: string) => {
        currentContext = context;
      },

      clearContext: () => {
        currentContext = undefined;
      },
    };
  }

  return createLoggerInterface();
}