type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SimpleLoggerConfig {
  serviceName: string;
  context?: string; // Optional context like [Job 1] [email-worker]
}

// ANSI color codes with bright variants for better visibility
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Regular colors
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  
  // Bright colors for better visibility
  brightCyan: '\x1b[96m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m'
} as const;

export class SimpleLogger {
  private serviceName: string;
  private context?: string;

  constructor(config: SimpleLoggerConfig) {
    this.serviceName = config.serviceName;
    this.context = config.context;
  }

  /**
   * Create a child logger with additional context
   * Example: logger.child('[Job 1] [email-worker]')
   */
  child(context: string): SimpleLogger {
    return new SimpleLogger({
      serviceName: this.serviceName,
      context: this.context ? `${this.context} ${context}` : context
    });
  }

  /**
   * Update context dynamically
   * Example: logger.setContext('[Job 2] [whatsapp-worker]')
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = undefined;
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
      case 'info': return colors.brightCyan;
      case 'warn': return colors.brightYellow;
      case 'error': return colors.brightRed;
      case 'debug': return colors.gray;
      default: return colors.reset;
    }
  }

  private log(level: LogLevel, message: string): void {
    const timestamp = this.formatDateTime();
    const levelColor = this.getColorForLevel(level);
    
    // More aggressive color detection - default to true in development
    const forceColors = process.env.FORCE_COLOR === '1' || 
                       process.env.FORCE_COLOR === 'true' ||
                       process.env.NODE_ENV === 'development' ||
                       process.env.COLORTERM === 'truecolor' ||
                       process.env.TERM_PROGRAM === 'vscode' ||
                       process.env.TERM_PROGRAM === 'Windows Terminal' ||
                       process.platform === 'win32'; // Enable colors on Windows by default
    
    const useColors = forceColors || process.stdout.isTTY || true; // Default to true
    
    // Build the log line with optional context
    const contextStr = this.context ? ` ${colors.brightMagenta}${this.context}${colors.reset}` : '';
    
    if (useColors) {
      const logLine = `${colors.dim}${timestamp}${colors.reset} ${colors.brightBlue}[${this.serviceName}]${colors.reset}${contextStr} ${levelColor}${colors.bold}${level.toUpperCase()}${colors.reset}: ${message}`;
      console.log(logLine);
    } else {
      // Fallback to no colors for non-TTY environments
      const plainContext = this.context ? ` ${this.context}` : '';
      const logLine = `${timestamp} [${this.serviceName}]${plainContext} ${level.toUpperCase()}: ${message}`;
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

  // Method to test color output
  testColors(): void {
    this.info('This is an INFO message with colors 🔵');
    this.warn('This is a WARN message with colors 🟡');
    this.error('This is an ERROR message with colors 🔴');
    this.debug('This is a DEBUG message with colors ⚫');
    
    // Show environment info
    const envInfo = {
      FORCE_COLOR: process.env.FORCE_COLOR,
      NODE_ENV: process.env.NODE_ENV,
      COLORTERM: process.env.COLORTERM,
      TERM_PROGRAM: process.env.TERM_PROGRAM,
      platform: process.platform,
      isTTY: process.stdout.isTTY
    };
    console.log('🔍 Color Environment:', envInfo);
    
    // Test raw colors
    console.log(`${colors.brightCyan}Cyan${colors.reset} ${colors.brightYellow}Yellow${colors.reset} ${colors.brightRed}Red${colors.reset} ${colors.brightGreen}Green${colors.reset} ${colors.brightBlue}Blue${colors.reset} ${colors.brightMagenta}Magenta${colors.reset}`);
  }
}

// Factory function to create logger instances
export function createLogger(config: SimpleLoggerConfig): SimpleLogger {
  return new SimpleLogger(config);
}