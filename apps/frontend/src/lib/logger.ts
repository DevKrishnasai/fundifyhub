/**
 * Browser-compatible logger for the frontend
 *
 * Provides structured logging with:
 * - Environment-aware log levels
 * - Colored output in development
 * - Structured data support
 * - No Node.js dependencies
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#9E9E9E',
  info: '#2196F3',
  warn: '#FF9800',
  error: '#F44336',
};

// Only enable debug logs in development
const minLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

class BrowserLogger {
  private serviceName: string;
  private childContext: LogData = {};

  constructor(serviceName: string, context?: LogData) {
    this.serviceName = serviceName;
    if (context) {
      this.childContext = context;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogData): BrowserLogger {
    const childLogger = new BrowserLogger(this.serviceName, {
      ...this.childContext,
      ...context,
    });
    return childLogger;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[minLevel as LogLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: LogData): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.serviceName}]`;
    const contextData = { ...this.childContext, ...data };
    const hasData = Object.keys(contextData).length > 0;

    // In development, use colored console output
    if (process.env.NODE_ENV === 'development') {
      const style = `color: ${LOG_COLORS[level]}; font-weight: bold`;
      if (hasData) {
        console.groupCollapsed(`%c${prefix} ${level.toUpperCase()}: ${message}`, style);
        console.log(contextData);
        console.groupEnd();
      } else {
        console.log(`%c${prefix} ${level.toUpperCase()}: ${message}`, style);
      }
    } else {
      // In production, use standard console methods with JSON data
      const consoleMethod = level === 'debug' ? 'log' : level;
      if (hasData) {
        console[consoleMethod](`${prefix} ${message}`, JSON.stringify(contextData));
      } else {
        console[consoleMethod](`${prefix} ${message}`);
      }
    }
  }

  debug(message: string, data?: LogData): void {
    this.formatMessage('debug', message, data);
  }

  info(message: string, data?: LogData): void {
    this.formatMessage('info', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.formatMessage('warn', message, data);
  }

  error(message: string, error?: Error | LogData): void {
    if (error instanceof Error) {
      this.formatMessage('error', message, {
        error: error.message,
        stack: error.stack,
      });
    } else {
      this.formatMessage('error', message, error);
    }
  }
}

const logger = new BrowserLogger('frontend');

export default logger;