type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SimpleLoggerConfig {
  serviceName: string;
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m'
} as const;

export class SimpleLogger {
  private serviceName: string;

  constructor(config: SimpleLoggerConfig) {
    this.serviceName = config.serviceName;
  }

  private formatDateTime(): string {
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case 'info': return colors.cyan;
      case 'warn': return colors.yellow;
      case 'error': return colors.red;
      case 'debug': return colors.gray;
      default: return colors.reset;
    }
  }

  private log(level: LogLevel, message: string): void {
    const timestamp = this.formatDateTime();
    const levelColor = this.getColorForLevel(level);
    
    // Check if we're in a TTY (terminal) to enable colors
    const useColors = process.stdout.isTTY;
    
    if (useColors) {
      const logLine = `${colors.gray}${timestamp}${colors.reset} ${colors.blue}[${this.serviceName}]${colors.reset} ${levelColor}${level.toUpperCase()}${colors.reset}: ${message}`;
      console.log(logLine);
    } else {
      // Fallback to no colors for non-TTY environments
      const logLine = `${timestamp} [${this.serviceName}] ${level.toUpperCase()}: ${message}`;
      console.log(logLine);
    }
  }

  info(message: string): void {
    this.log('info', message);
  }

  warn(message: string): void {
    this.log('warn', message);
  }

  error(message: string, error?: Error): void {
    let errorMessage = message;
    if (error) {
      errorMessage += ` - ${error.message}`;
    }
    this.log('error', errorMessage);
  }

  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message);
    }
  }
}

// Factory function to create logger instances
export function createLogger(config: SimpleLoggerConfig): SimpleLogger {
  return new SimpleLogger(config);
}