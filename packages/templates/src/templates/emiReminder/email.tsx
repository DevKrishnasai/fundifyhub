import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Button,
  Hr,
} from '@react-email/components';
import type { CSSProperties } from 'react';
import { render } from '@react-email/render';
import { EMIReminderPayloadType } from '@fundifyhub/types';

const EMIReminderEmail = ({
  customerName,
  email,
  phoneNumber,
  loanNumber,
  emiNumber,
  emiAmount,
  dueDate,
  daysUntilDue,
  totalOutstanding,
  paymentUrl,
  companyName
}: EMIReminderPayloadType) => {
  const isDueSoon = daysUntilDue !== undefined && daysUntilDue > 0 && daysUntilDue <= 3;
  const isDueToday = daysUntilDue === 0;
  
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {isDueToday 
          ? `EMI Payment Due Today - EMI #${emiNumber}`
          : isDueSoon
          ? `EMI Payment Due in ${daysUntilDue} days - EMI #${emiNumber}`
          : `EMI Payment Reminder - EMI #${emiNumber}`
        }
      </Preview>

      <Body style={main}>
        <Container style={card}>
          {/* Header */}
          <Section style={brandHeader}>
            <Heading style={brandTitle}>{companyName || 'Fundify'}</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={title}>
              {isDueToday ? '💳 EMI Payment Due Today' : '📅 EMI Payment Reminder'}
            </Heading>

            <Text style={text}>
              Hello <strong>{customerName}</strong>,
            </Text>

            <Text style={text}>
              {isDueToday 
                ? 'Your EMI payment is due today. Please make the payment to avoid late fees.'
                : daysUntilDue && daysUntilDue > 0
                ? `Your EMI payment is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}. Please ensure timely payment to avoid late fees.`
                : 'This is a reminder for your upcoming EMI payment.'
              }
            </Text>

            {/* EMI Details Card */}
            <Section style={infoCard}>
              <Text style={infoLabel}>Loan Number</Text>
              <Text style={infoValue}>{loanNumber}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>EMI Number</Text>
              <Text style={infoValue}>#{emiNumber}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>EMI Amount</Text>
              <Text style={amountValue}>₹{emiAmount.toLocaleString('en-IN')}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>Due Date</Text>
              <Text style={infoValue}>{new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>

              {totalOutstanding && totalOutstanding > 0 && (
                <>
                  <Hr style={divider} />
                  <Text style={infoLabel}>Total Outstanding</Text>
                  <Text style={infoValue}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>
                </>
              )}
            </Section>

            {/* Payment Button */}
            {paymentUrl && (
              <Section style={buttonContainer}>
                <Button style={button} href={paymentUrl}>
                  Pay Now
                </Button>
              </Section>
            )}

            {/* Important Note */}
            <Section style={alertBox}>
              <Text style={alertText}>
                <strong>⚠️ Important:</strong> Late payment fee of 0.01% per day will be charged from day 1 after the due date.
              </Text>
            </Section>

            <Text style={helpText}>
              For any assistance, please contact us at <strong>{phoneNumber}</strong> or reply to this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {companyName || 'Fundify'}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main: CSSProperties = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '40px 20px',
};

const card: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '0 auto',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const brandHeader: CSSProperties = {
  backgroundColor: '#2563eb',
  padding: '24px',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
};

const brandTitle: CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};

const content: CSSProperties = {
  padding: '32px 24px',
};

const title: CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 16px 0',
  lineHeight: '1.3',
};

const text: CSSProperties = {
  fontSize: '16px',
  color: '#4b5563',
  margin: '0 0 16px 0',
  lineHeight: '1.6',
};

const infoCard: CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const infoLabel: CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const infoValue: CSSProperties = {
  fontSize: '16px',
  color: '#1f2937',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const amountValue: CSSProperties = {
  fontSize: '24px',
  color: '#2563eb',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const divider: CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
};

const buttonContainer: CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button: CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '14px 32px',
  fontSize: '16px',
  fontWeight: '600',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
  border: 'none',
  cursor: 'pointer',
};

const alertBox: CSSProperties = {
  backgroundColor: '#fef3c7',
  border: '2px solid #fbbf24',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const alertText: CSSProperties = {
  fontSize: '14px',
  color: '#78350f',
  margin: '0',
  lineHeight: '1.5',
};

const helpText: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0 0',
  lineHeight: '1.5',
};

const footer: CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '20px 24px',
  borderRadius: '0 0 8px 8px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
};

const footerText: CSSProperties = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0',
};

// Render function for worker
export default async function renderEmail(data: EMIReminderPayloadType): Promise<string> {
  return await render(<EMIReminderEmail {...data} />);
}
