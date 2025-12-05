# @fundifyhub/templates

Email and notification templates for FundifyHub applications. Built with React Email for beautiful, responsive email templates that work across all email clients.

## Features

- 📧 **React Email** - Modern email templates with React
- 🎨 **Responsive** - Works on all email clients
- 🌐 **Multi-Channel** - Email HTML + WhatsApp text
- 🔤 **Type-Safe** - Full TypeScript support
- 🎯 **Template Registry** - Centralized template management

## Installation

```bash
pnpm add @fundifyhub/templates
```

## Quick Start

```typescript
import { getTemplate, renderTemplate, TEMPLATE_NAMES } from '@fundifyhub/templates';

// Get a template
const template = getTemplate(TEMPLATE_NAMES.WELCOME);

// Render with variables
const { html, text } = await renderTemplate('WELCOME', {
  userName: 'John Doe',
  email: 'john@example.com',
});
```

## Available Templates

### Authentication Templates

#### WELCOME
Sent when a new user registers.

```typescript
const result = await renderTemplate('WELCOME', {
  userName: 'John Doe',
  email: 'john@example.com',
  loginUrl: 'https://app.fundifyhub.com/login',
});
```

#### OTP_VERIFICATION
OTP code for email/phone verification.

```typescript
const result = await renderTemplate('OTP_VERIFICATION', {
  userName: 'John Doe',
  otpCode: '123456',
  expiresInMinutes: 10,
  purpose: 'login', // or 'register', 'reset-password'
});
```

#### PASSWORD_RESET
Password reset link.

```typescript
const result = await renderTemplate('PASSWORD_RESET', {
  userName: 'John Doe',
  resetLink: 'https://app.fundifyhub.com/reset-password?token=xxx',
  expiresInHours: 24,
});
```

#### LOGIN_ALERT
Alert for new login from unknown device.

```typescript
const result = await renderTemplate('LOGIN_ALERT', {
  userName: 'John Doe',
  loginTime: '2025-12-05 10:30 AM',
  device: 'Chrome on Windows',
  location: 'Mumbai, India',
  ipAddress: '192.168.1.1',
});
```

### Request Templates

#### REQUEST_SUBMITTED
Confirmation of new loan request.

```typescript
const result = await renderTemplate('REQUEST_SUBMITTED', {
  userName: 'John Doe',
  requestNumber: 'REQ-2025-001234',
  assetType: 'Laptop',
  requestedAmount: '₹50,000',
  viewUrl: 'https://app.fundifyhub.com/requests/xxx',
});
```

#### REQUEST_STATUS_UPDATE
Status change notification.

```typescript
const result = await renderTemplate('REQUEST_STATUS_UPDATE', {
  userName: 'John Doe',
  requestNumber: 'REQ-2025-001234',
  previousStatus: 'Under Review',
  newStatus: 'Offer Sent',
  message: 'Your loan offer is ready for review.',
  actionUrl: 'https://app.fundifyhub.com/requests/xxx',
});
```

### Payment Templates

#### EMI_REMINDER
Upcoming EMI payment reminder.

```typescript
const result = await renderTemplate('EMI_REMINDER', {
  userName: 'John Doe',
  loanNumber: 'LOAN-2025-001234',
  emiAmount: '₹5,000',
  dueDate: 'December 10, 2025',
  totalOutstanding: '₹45,000',
  payNowUrl: 'https://app.fundifyhub.com/payments/xxx',
});
```

#### EMI_OVERDUE
Overdue EMI notification.

```typescript
const result = await renderTemplate('EMI_OVERDUE', {
  userName: 'John Doe',
  loanNumber: 'LOAN-2025-001234',
  overdueAmount: '₹5,000',
  daysOverdue: 5,
  lateFee: '₹500',
  totalDue: '₹5,500',
  payNowUrl: 'https://app.fundifyhub.com/payments/xxx',
});
```

#### PAYMENT_RECEIVED
Payment confirmation.

```typescript
const result = await renderTemplate('PAYMENT_RECEIVED', {
  userName: 'John Doe',
  loanNumber: 'LOAN-2025-001234',
  amount: '₹5,000',
  paymentMethod: 'UPI',
  transactionId: 'TXN123456789',
  remainingBalance: '₹40,000',
  receiptUrl: 'https://app.fundifyhub.com/receipts/xxx',
});
```

### Admin Templates

#### ADMIN_USER_CREATED
Sent when admin creates a new user account.

```typescript
const result = await renderTemplate('ADMIN_USER_CREATED', {
  userName: 'John Doe',
  email: 'john@example.com',
  role: 'District Admin',
  tempPassword: 'temp123!',
  loginUrl: 'https://app.fundifyhub.com/login',
});
```

## Template Structure

Each template provides both HTML (for email) and plain text (for SMS/WhatsApp):

```typescript
interface TemplateResult {
  html: string;    // Full HTML email
  text: string;    // Plain text version
  subject: string; // Email subject line
}
```

## Creating Custom Templates

```typescript
// templates/src/templates/custom-template.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

interface CustomTemplateProps {
  userName: string;
  message: string;
  actionUrl: string;
}

export function CustomTemplate({ userName, message, actionUrl }: CustomTemplateProps) {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text>Hello {userName},</Text>
          <Text>{message}</Text>
          <Button href={actionUrl} style={buttonStyle}>
            Take Action
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

// Add to template registry
export const customTemplateConfig = {
  name: 'CUSTOM_TEMPLATE',
  subject: (vars: CustomTemplateProps) => `Hello ${vars.userName}`,
  component: CustomTemplate,
  textRenderer: (vars: CustomTemplateProps) => 
    `Hello ${vars.userName}, ${vars.message}. Action: ${vars.actionUrl}`,
};
```

## Template Registry

All templates are registered in a central registry:

```typescript
import TEMPLATE_REGISTRY from '@fundifyhub/templates';

// List all templates
const templateNames = Object.keys(TEMPLATE_REGISTRY);

// Get template config
const config = TEMPLATE_REGISTRY.WELCOME;
// { name, subject, component, textRenderer, supportedChannels }
```

## WhatsApp Templates

For WhatsApp Business API, templates return plain text:

```typescript
import { getWhatsAppText } from '@fundifyhub/templates';

const text = getWhatsAppText('EMI_REMINDER', {
  userName: 'John',
  emiAmount: '₹5,000',
  dueDate: 'December 10, 2025',
});
// "Hi John! Your EMI of ₹5,000 is due on December 10, 2025. 
//  Pay now to avoid late fees. Link: ..."
```

## Previewing Templates

Use the React Email preview server:

```bash
# In packages/templates
pnpm preview
```

This opens a local server where you can preview and test all templates.

## License

MIT
