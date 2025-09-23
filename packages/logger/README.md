# @fundifyhub/logger

A simple, colorful logging utility for FundifyHub applications. Clean format with just the essentials: timestamp, service name, log level, and message.

## Features

- 🎨 **Colorful Output** - Color-coded log levels (cyan INFO, yellow WARN, red ERROR, gray DEBUG)
- 🕐 **Readable Timestamps** - Standard MM/DD/YYYY, HH:MM:SS format
- 🏷️ **Service Identification** - Clear [service-name] tagging
- 📊 **Simple Log Levels** - info, warn, error, debug
- 🖥️ **Smart Colors** - Automatically detects terminal support
- 🚀 **TypeScript Support** - Full TypeScript support
- 📦 **Zero Dependencies** - Pure Node.js implementation

## Installation

```bash
pnpm add @fundifyhub/logger
```

## Quick Start

```typescript
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'my-app' });

logger.info('Application started');
logger.warn('Database connection slow');
logger.error('Failed to process request', new Error('Connection timeout'));
```

## Output Format

```
09/23/2025, 23:18:02 [my-app] INFO: Application started
09/23/2025, 23:18:03 [my-app] WARN: Database connection slow  
09/23/2025, 23:18:04 [my-app] ERROR: Failed to process request - Connection timeout
```

## API Reference

### Creating a Logger

```typescript
import { createLogger, LoggerConfig } from '@fundifyhub/logger';

const logger = createLogger({
  appName: 'my-service',           // Required: Name of your application
  environment: 'production',      // Optional: Environment (default: 'development')
  level: 'info',                  // Optional: Minimum log level (default: 'info')
  colorize: true,                 // Optional: Enable colors (default: true)
  prettyPrint: true,              // Optional: Pretty print logs (default: true)
  defaultMeta: { version: '1.0' } // Optional: Default metadata for all logs
});
```

### Basic Logging Methods

```typescript
logger.trace('Detailed trace information');
logger.debug('Debug information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred', new Error('Something went wrong'));
logger.fatal('Fatal error', new Error('Critical failure'));
```

### Enhanced Log Types

```typescript
logger.success('Operation completed successfully');
logger.danger('Critical security issue detected');
logger.warning('This is a warning'); // Alias for warn()
```

### Specialized Logging

```typescript
// HTTP Request/Response logging
logger.request('GET /api/users');
logger.response('200 OK - Users retrieved');

// Database operations
logger.database('User query executed in 45ms');

// Authentication events
logger.auth('User login successful');

// Validation errors
logger.validation('Invalid email format provided');
```

### Context and Metadata

Add contextual information to your logs:

```typescript
logger.info('Processing user request', {
  module: 'UserService',
  requestId: 'req-123',
  userId: 'user-456',
  action: 'getUserProfile'
});

logger.error('Database connection failed', error, {
  module: 'DatabaseService',
  connectionString: 'postgresql://...',
  retryCount: 3
});
```

### Performance Timing

```typescript
logger.time('database-query');
// ... perform database operation
logger.timeEnd('database-query'); // Logs: "Timer ended: database-query [duration=45ms]"
```

### Child Loggers

Create child loggers with persistent context:

```typescript
const requestLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456'
});

requestLogger.info('Processing request'); // Automatically includes requestId and userId
requestLogger.error('Request failed');    // Context preserved
```

### Environment Variables

The logger can be configured using environment variables:

- `APP_NAME` - Default application name
- `NODE_ENV` - Environment (development, production, etc.)
- `LOG_LEVEL` - Minimum log level (trace, debug, info, warn, error, fatal)

### Default Logger

For quick usage, import the pre-configured default logger:

```typescript
import { defaultLogger } from '@fundifyhub/logger';

defaultLogger.info('Using default configuration');
```

## Log Output Format

The logger produces beautiful, readable output:

```
[2024-09-23 14:30:15] 🚀 my-app [UserService] User authentication successful [requestId=req-123 userId=user-456]
[2024-09-23 14:30:16] 🚀 my-app [DatabaseService] Query executed [duration=45ms]
[2024-09-23 14:30:17] 🚀 my-app [AuthMiddleware] Invalid token provided
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { Logger, LoggerConfig, LogContext, LogType } from '@fundifyhub/logger';

const config: LoggerConfig = {
  appName: 'my-app',
  level: 'debug'
};

const context: LogContext = {
  module: 'PaymentService',
  requestId: 'req-789'
};
```

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express';
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ appName: 'api-server' });

const app = express();

app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  req.logger = logger.child({ 
    requestId,
    method: req.method,
    url: req.url 
  });
  
  req.logger.request(`${req.method} ${req.url}`);
  next();
});

app.get('/users', (req, res) => {
  req.logger.info('Fetching users');
  // ... handle request
  req.logger.response('Users fetched successfully');
});
```
