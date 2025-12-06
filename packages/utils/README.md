# @fundifyhub/utils

Shared utility functions and helpers for FundifyHub applications. This package provides common functionality used across the frontend, backend, and worker services.

## Features

- 🧮 **EMI Calculator** - Loan EMI and schedule generation
- 📱 **Phone Utils** - Phone number formatting and validation
- ✅ **Validation** - Express middleware for Zod schema validation
- 🔄 **Workflow Engine** - Stage-based state machine
- 📋 **Job Queue** - BullMQ job enqueue helpers
- ⚙️ **Environment** - Zod-based env validation
- 🎯 **Functional** - Result types and FP utilities

## Installation

```bash
pnpm add @fundifyhub/utils
```

## EMI Calculator

Calculate EMI amounts and generate payment schedules.

```typescript
import { calculateEMI, generateEMISchedule, formatCurrency } from '@fundifyhub/utils';

// Calculate monthly EMI
const emi = calculateEMI({
  principal: 100000,  // ₹1,00,000
  annualRate: 12,     // 12% per annum
  tenureMonths: 12,   // 12 months
});
console.log(emi); // 8884.88

// Generate full schedule
const schedule = generateEMISchedule({
  principal: 100000,
  annualRate: 12,
  tenureMonths: 12,
  startDate: new Date(),
});
// Returns array of { dueDate, emiAmount, principal, interest, balance }

// Format currency
formatCurrency(8884.88); // '₹8,884.88'
```

## Phone Number Utils

Format and validate Indian phone numbers.

```typescript
import { formatPhoneNumber, isValidIndianPhone, normalizePhone } from '@fundifyhub/utils';

// Format for display
formatPhoneNumber('+919876543210');  // '+91 98765 43210'

// Validate Indian phone number
isValidIndianPhone('9876543210');     // true
isValidIndianPhone('+919876543210');  // true

// Normalize to E.164 format
normalizePhone('9876543210');         // '+919876543210'
normalizePhone('09876543210');        // '+919876543210'
```

## Validation Middleware

Express middleware for Zod schema validation.

```typescript
import { validateBody, validateQuery, validateParams } from '@fundifyhub/utils';
import { loginSchema, paginationSchema } from '@fundifyhub/types';

// Validate request body
router.post('/login', validateBody(loginSchema), loginController);

// Validate query parameters
router.get('/users', validateQuery(paginationSchema), listUsersController);

// Validate route params
const idSchema = z.object({ id: z.string().uuid() });
router.get('/users/:id', validateParams(idSchema), getUserController);
```

## Workflow Engine

Stage-based state machine for request lifecycle.

```typescript
import { 
  executeTransition, 
  canTransition, 
  getAvailableActions,
  type WorkflowContext,
} from '@fundifyhub/utils';
import { REQUEST_STAGE, SUB_STATUS, WORKFLOW_EVENTS } from '@fundifyhub/types';

// Check if transition is allowed
const context: WorkflowContext = {
  currentStage: REQUEST_STAGE.REVIEW,
  currentSubStatus: SUB_STATUS.REVIEW.PENDING,
  userId: 'user_123',
  userRole: 'DISTRICT_ADMIN',
};

const result = canTransition(context, WORKFLOW_EVENTS.SEND_OFFER);
if (result.allowed) {
  // Proceed with transition
} else {
  console.log(result.reason); // 'Insufficient permissions'
}

// Get available actions for current state
const actions = getAvailableActions(context);
// [{ event: 'SEND_OFFER', label: 'Send Offer', ... }, ...]

// Execute transition
const newState = executeTransition(context, WORKFLOW_EVENTS.SEND_OFFER);
// { stage: REQUEST_STAGE.OFFER, subStatus: SUB_STATUS.OFFER.SENT }
```

## Job Queue

Enqueue jobs to BullMQ for background processing.

```typescript
import { enqueue, QUEUE_NAMES, JOB_TYPES } from '@fundifyhub/utils';

// Enqueue a notification
await enqueue(QUEUE_NAMES.NOTIFICATION_QUEUE, {
  type: JOB_TYPES.SEND_NOTIFICATION,
  payload: {
    templateName: 'EMI_REMINDER',
    recipient: { email: 'user@example.com', phoneNumber: '+919876543210' },
    variables: { userName: 'John', emiAmount: '₹5,000', dueDate: '2025-12-10' },
    channels: ['EMAIL', 'WHATSAPP'],
  },
});

// Enqueue with delay
await enqueue(QUEUE_NAMES.NOTIFICATION_QUEUE, payload, {
  delay: 60000, // 1 minute delay
});

// Enqueue with priority
await enqueue(QUEUE_NAMES.NOTIFICATION_QUEUE, payload, {
  priority: 1, // Higher priority (1-10, lower is higher)
});
```

## Environment Validation

Zod-based environment variable validation.

```typescript
import { validateEnv, backendEnvSchema, frontendEnvSchema } from '@fundifyhub/utils';

// Validate backend environment
const env = validateEnv(backendEnvSchema, process.env);
// Throws if required vars are missing or invalid

// Access validated env
env.DATABASE_URL      // string (required)
env.REDIS_HOST        // string (required)
env.PORT              // number (default: 3001)

// Frontend env schema
const frontendEnv = validateEnv(frontendEnvSchema, process.env);
frontendEnv.NEXT_PUBLIC_API_URL  // string (required)
```

## Result Type

Functional error handling without exceptions.

```typescript
import { Result, ok, err, isOk, isErr } from '@fundifyhub/utils';

// Function that returns Result
async function createUser(data: CreateUserInput): Promise<Result<User, ValidationError>> {
  const validation = userSchema.safeParse(data);
  if (!validation.success) {
    return err(new ValidationError(validation.error));
  }
  
  const user = await prisma.user.create({ data: validation.data });
  return ok(user);
}

// Using the result
const result = await createUser(input);

if (isOk(result)) {
  console.log(result.data); // User
} else {
  console.log(result.error); // ValidationError
}

// Or with pattern matching
const message = result.ok 
  ? `Created user ${result.data.id}` 
  : `Failed: ${result.error.message}`;
```

## Server Utilities

Common Express server utilities.

```typescript
import { 
  asyncHandler, 
  errorHandler, 
  notFoundHandler,
  corsOptions,
} from '@fundifyhub/utils/server';

// Wrap async route handlers
router.get('/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  res.json({ success: true, data: users });
}));

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

// CORS config
app.use(cors(corsOptions));
```

## Database Utilities

Prisma query helpers.

```typescript
import { 
  getPaginationParams, 
  buildWhereClause,
  excludeFields,
} from '@fundifyhub/utils/database';

// Pagination
const { skip, take } = getPaginationParams({ page: 2, limit: 20 });
// { skip: 20, take: 20 }

// Exclude fields from result
const userWithoutPassword = excludeFields(user, ['password', 'resetToken']);
```

## API Reference

### EMI Functions

```typescript
calculateEMI(options: EMIOptions): number
generateEMISchedule(options: ScheduleOptions): EMIScheduleItem[]
formatCurrency(amount: number, currency?: string): string
```

### Phone Functions

```typescript
formatPhoneNumber(phone: string): string
isValidIndianPhone(phone: string): boolean
normalizePhone(phone: string): string
```

### Validation

```typescript
validateBody<T>(schema: ZodSchema<T>): RequestHandler
validateQuery<T>(schema: ZodSchema<T>): RequestHandler
validateParams<T>(schema: ZodSchema<T>): RequestHandler
```

### Workflow

```typescript
canTransition(context: WorkflowContext, event: string): TransitionResult
executeTransition(context: WorkflowContext, event: string): WorkflowState
getAvailableActions(context: WorkflowContext): WorkflowAction[]
```

### Queue

```typescript
enqueue(queue: string, payload: unknown, options?: JobOptions): Promise<void>
```

## License

MIT
