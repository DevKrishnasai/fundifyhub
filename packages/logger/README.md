# @fundifyhub/logger

A structured, colorful logging utility for FundifyHub applications built on Winston. Provides consistent logging across all services with file rotation, contextual child loggers, and production-ready features.

## Features

- 🎨 **Colorful Console Output** - Color-coded log levels (cyan INFO, yellow WARN, red ERROR, gray DEBUG)
- 📁 **File Rotation** - Daily log rotation with configurable retention (Winston Daily Rotate File)
- 🏷️ **Service Identification** - Clear `[service-name]` tagging in all logs
- 📊 **Standard Log Levels** - error, warn, info, http, debug
- 👶 **Child Loggers** - Create scoped loggers with inherited context
- 🖥️ **Smart Colors** - Automatically detects terminal color support
- 📦 **Structured JSON** - Production logs in JSON format for easy parsing
- 🚀 **TypeScript First** - Full type definitions included

## Installation

```bash
pnpm add @fundifyhub/logger
```

## Quick Start

```typescript
import { createLogger } from '@fundifyhub/logger';

// Create a logger for your service
const logger = createLogger({ serviceName: 'main-backend' });

// Basic logging
logger.info('Server started', { port: 3001 });
logger.warn('Database connection slow', { latency: 500 });
logger.error('Failed to process request', new Error('Connection timeout'));
logger.debug('Processing request', { requestId: 'req-123' });
```

## Console Output

Development environment produces colorful, readable output:

```
12/05/2025, 14:30:15 [main-backend] INFO: Server started {"port":3001}
12/05/2025, 14:30:16 [main-backend] [auth] INFO: User logged in {"userId":"user-123"}
12/05/2025, 14:30:17 [main-backend] WARN: Rate limit approaching {"remaining":10}
12/05/2025, 14:30:18 [main-backend] ERROR: Database error {"error":{"message":"Connection refused"}}
```

## API Reference

### `createLogger(config: LoggerConfig): Logger`

Creates a new logger instance.

```typescript
interface LoggerConfig {
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

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';
```

### Logger Interface

```typescript
interface Logger {
  error(message: string, meta?: LogMeta | Error): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  http(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  
  /** Create a child logger with additional context */
  child(options: { context: string } | string): Logger;
  
  /** Set context for subsequent logs */
  setContext(context: string): void;
  
  /** Clear the current context */
  clearContext(): void;
}

interface LogMeta {
  [key: string]: unknown;
}
```

## Child Loggers

Create scoped loggers that inherit parent context:

```typescript
const logger = createLogger({ serviceName: 'main-backend' });

// Create child logger for auth module
const authLogger = logger.child({ context: 'auth' });
authLogger.info('User logged in', { userId: 'user-123' });
// Output: [main-backend] [auth] INFO: User logged in

// Nested child loggers
const otpLogger = authLogger.child('otp');
otpLogger.debug('OTP sent', { phone: '+91...' });
// Output: [main-backend] [auth:otp] DEBUG: OTP sent
```

## Error Logging

Pass Error objects directly for structured error output:

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Error objects are automatically formatted with message, stack, and name
  logger.error('Operation failed', error as Error);
}

// Or include additional context
logger.error('Database query failed', {
  query: 'SELECT * FROM users',
  error: error instanceof Error ? error.message : 'Unknown error',
});
```

## File Logging (Production)

In production (`NODE_ENV=production`), logs are written to rotating files:

```
logs/
├── main-backend-2025-12-05.log      # All logs (JSON format)
├── main-backend-error-2025-12-05.log # Errors only (JSON format)
├── job-worker-2025-12-05.log
└── job-worker-error-2025-12-05.log
```

Configuration:
- **Combined logs**: Rotated daily, max 20MB per file, kept for 14 days
- **Error logs**: Rotated daily, max 20MB per file, kept for 30 days

## Configuration

### Environment-Based Defaults

| Setting | Development | Production |
|---------|-------------|------------|
| Log Level | `debug` | `info` |
| File Logging | `false` | `true` |
| Console Logging | `true` | `true` |
| Console Format | Colorful | Colorful |
| File Format | N/A | JSON |

### Override Defaults

```typescript
const logger = createLogger({
  serviceName: 'main-backend',
  level: 'warn',                    // Only warn and error
  logDir: '/var/log/fundifyhub',    // Custom log directory
  enableFileLogging: true,          // Force file logging in dev
  enableConsoleLogging: false,      // Disable console (e.g., for tests)
});
```

## Usage in FundifyHub Services

### Main Backend

```typescript
// src/server.ts
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'main-backend' });

// Create module-specific loggers
export const authLogger = logger.child('auth');
export const paymentLogger = logger.child('payments');
export const socketLogger = logger.child('socket');

// Use in routes
authLogger.info('Login attempt', { email: user.email });
```

### Job Worker

```typescript
// src/index.ts
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'job-worker' });

export const emailLogger = logger.child('email');
export const whatsappLogger = logger.child('whatsapp');
export const reminderLogger = logger.child('reminders');
```

### Express Middleware

```typescript
import { createLogger } from '@fundifyhub/logger';
import { Request, Response, NextFunction } from 'express';

const logger = createLogger({ serviceName: 'main-backend' });

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.http(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
}
```

## Type Exports

```typescript
import { 
  createLogger,
  Logger,
  LoggerConfig,
  LogLevel,
  LogMeta 
} from '@fundifyhub/logger';
```

## Dependencies

- [winston](https://github.com/winstonjs/winston) - Logging framework
- [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file) - Log rotation

## Related Packages

- `@fundifyhub/types` - Shared type definitions
- `@fundifyhub/utils` - Utility functions
