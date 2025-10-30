import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
  Button,
  Section,
} from '@react-email/components';
import type { CSSProperties } from 'react';

interface TransactionEmailProps {
  customerName?: string;
  amount?: string;
  transactionId?: string;
  date?: string;
  status?: string; // e.g., "Successful", "Pending", "Failed"
  viewLink?: string;
}

export const TransactionEmail = ({
  customerName = 'Naheed',
  amount = '$120.00',
  transactionId = 'TXN-34821984',
  date = 'October 28, 2025',
  status = 'Successful',
  viewLink = 'https://www.fundify.com/transactions',
}: TransactionEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>Your Fundify transaction details</Preview>

    <Body style={main}>
      <Container style={card}>
        {/* Header */}
        <Section style={brandHeader}>
          <Img
            src="https://cdn-icons-png.flaticon.com/512/9408/9408217.png"
            width="36"
            height="36"
            alt="Nova Logo"
            style={{ borderRadius: '8px' }}
          />
          <Heading style={brandTitle}>Nova</Heading>
        </Section>

        {/* Transaction Details */}
        <Section style={content}>
          <Heading style={title}>Hello {customerName},</Heading>

          <Text style={leadText}>
            We wanted to let you know that your recent transaction has been processed successfully.
          </Text>

          <Section style={transactionCard}>
            <Text style={transactionRow}>
              <strong>Amount:</strong> {amount}
            </Text>
            <Text style={transactionRow}>
              <strong>Date:</strong> {date}
            </Text>
            <Text style={transactionRow}>
              <strong>Transaction ID:</strong> {transactionId}
            </Text>
            <Text style={transactionRow}>
              <strong>Status:</strong>{' '}
              <span
                style={{
                  color:
                    status === 'Successful'
                      ? '#34a853'
                      : status === 'Failed'
                      ? '#d93025'
                      : '#f9ab00',
                  fontWeight: 700,
                }}
              >
                {status}
              </span>
            </Text>
          </Section>

          <Text style={text}>
            You can view more details or download your receipt below:
          </Text>

          <Button href={viewLink} style={primaryButton}>
            View Transaction
          </Button>

          <Text style={smallText}>
            If you notice anything unusual, please <a href="https://www.fundify.com/support" style={link}>contact our support team</a> immediately.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} Nova. All rights reserved. ·{' '}
            <a href="https://www.fundify.com" style={footerLink}>
              www.fundify.com
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default TransactionEmail;

/* -------------------------
   Unified Nova/Fundify Styles
------------------------- */

const main: CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: 'flex',
  justifyContent: 'center',
  padding: '0',
  margin: '0',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 600,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
  margin: '0',
};

const brandHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'center',
  padding: '16px 20px 8px',
  borderBottom: '1px solid #f1f3f5',
};

const brandTitle: CSSProperties = {
  fontSize: 19,
  fontWeight: 700,
  color: '#111827',
  margin: 0,
};

const content: CSSProperties = {
  padding: '34px 28px',
  textAlign: 'center',
};

const title: CSSProperties = {
  color: '#111827',
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 16,
};

const leadText: CSSProperties = {
  fontSize: 15,
  color: '#4b5563',
  lineHeight: '23px',
  marginBottom: 24,
};

const transactionCard: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid rgba(11,99,214,0.12)',
  borderRadius: 12,
  padding: '22px',
  textAlign: 'left',
  boxShadow: '0 6px 18px rgba(11,99,214,0.06)',
  marginBottom: 24,
};

const transactionRow: CSSProperties = {
  fontSize: 15,
  color: '#4b5563',
  lineHeight: '22px',
  marginBottom: 8,
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#333333',
  lineHeight: '22px',
  marginBottom: 16,
};

const primaryButton: CSSProperties = {
  backgroundColor: '#0b63d6',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: 28,
  fontWeight: 700,
  display: 'inline-block',
  textDecoration: 'none',
  boxShadow: '0 6px 18px rgba(11,99,214,0.18)',
  marginBottom: 20,
};

const smallText: CSSProperties = {
  fontSize: 13,
  color: '#4b5563',
  lineHeight: '20px',
  marginTop: 12,
};

const footer: CSSProperties = {
  backgroundColor: '#ffffff',
  textAlign: 'center',
  padding: 16,
  margin: 0,
};

const footerText: CSSProperties = {
  fontSize: 11,
  color: '#9ca3af',
  lineHeight: '20px',
  margin: 0,
};

const footerLink: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'none',
};

const link: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'underline',
};
