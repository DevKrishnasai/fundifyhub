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
import { EMIOverduePayloadType } from '@fundifyhub/types';

const EMIOverdueEmail = ({
  customerName,
  email,
  phoneNumber,
  loanNumber,
  emiNumber,
  emiAmount,
  dueDate,
  daysOverdue,
  lateFee,
  totalDue,
  overdueCount,
  paymentUrl,
  companyName
}: EMIOverduePayloadType) => {
  const isSeriousDefault = daysOverdue > 60;
  
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`URGENT: EMI Payment Overdue - ${daysOverdue} days - EMI #${emiNumber}`}
      </Preview>

      <Body style={main}>
        <Container style={card}>
          {/* Header - Red for overdue */}
          <Section style={overdueHeader}>
            <Heading style={brandTitle}>{companyName || 'Fundify'}</Heading>
            <Text style={urgentBadge}>⚠️ PAYMENT OVERDUE</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={title}>
              ⚠️ Urgent: EMI Payment Overdue
            </Heading>

            <Text style={text}>
              Dear <strong>{customerName}</strong>,
            </Text>

            <Text style={urgentText}>
              {isSeriousDefault 
                ? `Your EMI payment is seriously overdue by ${daysOverdue} days. Immediate action is required to avoid legal consequences and asset seizure.`
                : `Your EMI payment is overdue by ${daysOverdue} days. Please make the payment immediately to avoid further penalties and maintain your credit score.`
              }
            </Text>

            {/* Overdue Details Card */}
            <Section style={overdueCard}>
              <Text style={infoLabel}>Loan Number</Text>
              <Text style={infoValue}>{loanNumber}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>EMI Number</Text>
              <Text style={infoValue}>#{emiNumber}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>Original EMI Amount</Text>
              <Text style={infoValue}>₹{emiAmount.toLocaleString('en-IN')}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>Original Due Date</Text>
              <Text style={infoValue}>{new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>Days Overdue</Text>
              <Text style={overdueValue}>{daysOverdue} days</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>Late Fee & Penalty</Text>
              <Text style={penaltyValue}>₹{lateFee.toLocaleString('en-IN')}</Text>

              <Hr style={divider} />

              <Text style={infoLabel}>Total Amount Due Now</Text>
              <Text style={totalDueValue}>₹{totalDue.toLocaleString('en-IN')}</Text>

              {overdueCount > 1 && (
                <>
                  <Hr style={divider} />
                  <Text style={warningLabel}>
                    ⚠️ You have {overdueCount} overdue EMI{overdueCount > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </Section>

            {/* Payment Button */}
            {paymentUrl && (
              <Section style={buttonContainer}>
                <Button style={urgentButton} href={paymentUrl}>
                  Pay Now - ₹{totalDue.toLocaleString('en-IN')}
                </Button>
              </Section>
            )}

            {/* Critical Warning */}
            <Section style={criticalAlertBox}>
              <Text style={criticalAlertText}>
                <strong>🚨 IMPORTANT:</strong>
              </Text>
              <Text style={criticalAlertText}>
                • Late fee: 0.01% per day continues to accrue<br />
                • After 30 days: 4% overdue penalty applied<br />
                • After 60 days: Risk of asset seizure initiation<br />
                • After 90 days: Loan marked as defaulted, credit bureau reporting<br />
              </Text>
            </Section>

            <Text style={helpText}>
              <strong>Need help?</strong> Contact us immediately at <strong>{phoneNumber}</strong> or reply to this email to discuss payment arrangements.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {companyName || 'Fundify'}. All rights reserved.
            </Text>
            <Text style={footerText}>
              This is an automated payment reminder. Please do not ignore.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main: CSSProperties = {
  backgroundColor: '#fef2f2',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '40px 20px',
};

const card: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '0 auto',
  boxShadow: '0 4px 12px rgba(220,38,38,0.2)',
  border: '2px solid #dc2626',
};

const overdueHeader: CSSProperties = {
  backgroundColor: '#dc2626',
  padding: '24px',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center' as const,
};

const brandTitle: CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px',
};

const urgentBadge: CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0',
  backgroundColor: 'rgba(255,255,255,0.2)',
  padding: '6px 12px',
  borderRadius: '4px',
  display: 'inline-block',
};

const content: CSSProperties = {
  padding: '32px 24px',
};

const title: CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#dc2626',
  margin: '0 0 16px 0',
  lineHeight: '1.3',
};

const text: CSSProperties = {
  fontSize: '16px',
  color: '#4b5563',
  margin: '0 0 16px 0',
  lineHeight: '1.6',
};

const urgentText: CSSProperties = {
  fontSize: '16px',
  color: '#991b1b',
  margin: '0 0 24px 0',
  lineHeight: '1.6',
  fontWeight: '600',
};

const overdueCard: CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '2px solid #fecaca',
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

const overdueValue: CSSProperties = {
  fontSize: '20px',
  color: '#dc2626',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const penaltyValue: CSSProperties = {
  fontSize: '18px',
  color: '#ea580c',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const totalDueValue: CSSProperties = {
  fontSize: '28px',
  color: '#dc2626',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const warningLabel: CSSProperties = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '700',
  margin: '0',
  backgroundColor: '#fee2e2',
  padding: '8px 12px',
  borderRadius: '4px',
};

const divider: CSSProperties = {
  borderColor: '#fecaca',
  margin: '12px 0',
};

const buttonContainer: CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const urgentButton: CSSProperties = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  padding: '16px 40px',
  fontSize: '18px',
  fontWeight: '700',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 6px rgba(220,38,38,0.3)',
};

const criticalAlertBox: CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '2px solid #f59e0b',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const criticalAlertText: CSSProperties = {
  fontSize: '14px',
  color: '#78350f',
  margin: '0 0 8px 0',
  lineHeight: '1.6',
};

const helpText: CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0 0',
  lineHeight: '1.5',
};

const footer: CSSProperties = {
  backgroundColor: '#fef2f2',
  padding: '20px 24px',
  borderRadius: '0 0 8px 8px',
  textAlign: 'center' as const,
  borderTop: '2px solid #fecaca',
};

const footerText: CSSProperties = {
  fontSize: '13px',
  color: '#9ca3af',
  margin: '0 0 8px 0',
};

// Render function for worker
export default async function renderEmail(data: EMIOverduePayloadType): Promise<string> {
  return await render(<EMIOverdueEmail {...data} />);
}
