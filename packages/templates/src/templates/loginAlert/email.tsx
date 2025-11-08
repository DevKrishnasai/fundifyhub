import React from 'react';
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
import { render } from '@react-email/render';
import { LoginAlertPayloadType } from '@fundifyhub/types';

/* --------------------------------- EMAIL --------------------------------- */
const LoginAlertEmail = ({
  email,
  phoneNumber,
  customerName,
  device,
  location,
  time,
  supportUrl,
  resetPasswordUrl,
  companyName
}: LoginAlertPayloadType) => (
  <Html lang="en">
    <Head />
    <Preview>
      New login detected on your {companyName} account
    </Preview>

    <Body style={main}>
      <Container style={card}>
        {/* Header */}
        <Section style={brandHeader}>
          <Heading style={brandTitle}>{companyName}</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={title}>Login Alert</Heading>

          <Text style={leadText}>
            Hi {customerName}, a new login to your {companyName} account was detected. 
            If this was you, no action is needed.
          </Text>

          <Section style={alertCard}>
            <Text style={alertLabel}>Login Details</Text>
            <Text style={alertDetail}><strong>Device:</strong> {device}</Text>
            <Text style={alertDetail}><strong>Location:</strong> {location}</Text>
            <Text style={alertDetail}><strong>Time:</strong> {time}</Text>
          </Section>

          <Button href={resetPasswordUrl} style={primaryButton}>
            Secure Your Account
          </Button>

          <Text style={text}>
            Didn’t log in? Please{' '}
            <a href={resetPasswordUrl} style={link}>reset your password</a> or{' '}
            <a href={supportUrl} style={link}>contact support</a> immediately.
          </Text>

          <Text style={mutedText}>
            For your security, review your recent activity and enable two-factor authentication.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {companyName}. All rights reserved. ·{' '}
            <a href={supportUrl} style={footerLink}>
              {supportUrl}
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

/* --------------------------- RENDER FUNCTION ---------------------------- */
export const renderEmail = (vars: LoginAlertPayloadType) => {
  const props: LoginAlertPayloadType = {
    email: vars.email,
    phoneNumber: vars.phoneNumber,
    customerName: vars.customerName,
    device: vars.device,
    location: vars.location,
    time: vars.time,
    supportUrl: vars.supportUrl,
    resetPasswordUrl: vars.resetPasswordUrl,
    companyName: vars.companyName,
  };

  return render(<LoginAlertEmail {...props} />);
};

export default renderEmail;

/* ------------------------------- STYLES ------------------------------- */
const main: CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: 'flex',
  justifyContent: 'center',
  padding: '0',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 560,
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
  backgroundColor: '#ffffff',
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
  marginBottom: 20,
  lineHeight: '22px',
};

const alertCard: CSSProperties = {
  backgroundColor: '#eef6ff',
  borderRadius: 12,
  padding: '20px',
  textAlign: 'left',
  border: '1px solid rgba(26,115,232,0.12)',
  boxShadow: '0 6px 18px rgba(26,115,232,0.06)',
  marginBottom: 20,
};

const alertLabel: CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
  marginBottom: 10,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const alertDetail: CSSProperties = {
  fontSize: 14,
  color: '#333',
  lineHeight: '20px',
  marginBottom: 6,
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
  marginTop: 8,
  marginBottom: 18,
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#333',
  lineHeight: '20px',
  marginBottom: 12,
};

const link: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'underline',
};

const mutedText: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: '18px',
  marginTop: 8,
};

const footer: CSSProperties = {
  backgroundColor: '#ffffff',
  textAlign: 'center',
  padding: 16,
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
