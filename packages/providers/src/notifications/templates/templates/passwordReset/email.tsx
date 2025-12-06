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
import { PasswordResetPayload } from '@fundifyhub/types';

/* --------------------------------- EMAIL --------------------------------- */
const PasswordResetEmail = ({
  customerName,
  resetUrl,
  expiresInMinutes,
  companyName,
  supportUrl,
  logoUrl,
  companyUrl,
}: PasswordResetPayload) => (
  <Html lang="en">
    <Head />
    <Preview>
      Reset your {companyName} password — link expires in {expiresInMinutes.toString()} minutes
    </Preview>

    <Body style={main}>
      <Container style={card}>
        {/* Header */}
        <Section style={brandHeader}>
          {logoUrl && (
            <Img
              src={logoUrl}
              width="36"
              height="36"
              alt={`${companyName} Logo`}
              style={{ borderRadius: '8px' }}
            />
          )}
          <Heading style={brandTitle}>{companyName}</Heading>
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Section style={iconContainer}>
            <Text style={lockIcon}>🔑</Text>
          </Section>

          <Heading style={heading}>Password Reset Request</Heading>

          <Text style={leadText}>Hi {customerName},</Text>

          <Text style={text}>
            We received a request to reset the password for your {companyName} account.
            Click the button below to create a new password.
          </Text>

          <Section style={buttonContainer}>
            <Button href={resetUrl} style={primaryButton}>
              Reset Password
            </Button>
          </Section>

          <Section style={expiryCard}>
            <Text style={expiryText}>
              ⏰ This link expires in <strong>{expiresInMinutes} minutes</strong>
            </Text>
          </Section>

          <Text style={smallText}>
            If the button doesn't work, copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>{resetUrl}</Text>

          <Section style={securityNote}>
            <Text style={mutedText}>
              🔒 <strong>Security Notice:</strong> If you didn't request a password reset,
              please ignore this email or{' '}
              <a href={supportUrl} style={link}>
                contact our support team
              </a>{' '}
              immediately. Your password will remain unchanged.
            </Text>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {companyName}. All rights reserved.
            {companyUrl && (
              <>
                {' · '}
                <a href={companyUrl} style={footerLink}>
                  {companyUrl}
                </a>
              </>
            )}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

/* --------------------------- RENDER FUNCTION ---------------------------- */
export const renderEmail = (vars: PasswordResetPayload) => {
  const props: PasswordResetPayload = {
    email: vars.email,
    phoneNumber: vars.phoneNumber,
    customerName: vars.customerName,
    resetUrl: vars.resetUrl,
    expiresInMinutes: vars.expiresInMinutes,
    companyName: vars.companyName,
    supportUrl: vars.supportUrl,
    logoUrl: vars.logoUrl,
    companyUrl: vars.companyUrl,
  };

  return render(<PasswordResetEmail {...props} />);
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

const iconContainer: CSSProperties = {
  marginBottom: 16,
};

const lockIcon: CSSProperties = {
  fontSize: 48,
  margin: 0,
};

const heading: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#111827',
  marginBottom: 20,
  marginTop: 0,
};

const leadText: CSSProperties = {
  fontSize: 15,
  color: '#4b5563',
  marginBottom: 12,
  lineHeight: '22px',
  textAlign: 'left',
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#333',
  lineHeight: '22px',
  marginBottom: 24,
  textAlign: 'left',
};

const buttonContainer: CSSProperties = {
  marginBottom: 20,
};

const primaryButton: CSSProperties = {
  backgroundColor: '#0b63d6',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: 28,
  fontWeight: 700,
  display: 'inline-block',
  textDecoration: 'none',
  boxShadow: '0 6px 18px rgba(11,99,214,0.18)',
  fontSize: 15,
};

const expiryCard: CSSProperties = {
  backgroundColor: '#fef3c7',
  borderRadius: 8,
  padding: '12px 16px',
  marginBottom: 20,
  border: '1px solid #fcd34d',
};

const expiryText: CSSProperties = {
  fontSize: 13,
  color: '#92400e',
  margin: 0,
};

const smallText: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: '18px',
  marginBottom: 4,
};

const linkText: CSSProperties = {
  fontSize: 11,
  color: '#0b63d6',
  wordBreak: 'break-all',
  marginBottom: 20,
};

const securityNote: CSSProperties = {
  backgroundColor: '#f3f4f6',
  borderRadius: 8,
  padding: '12px 16px',
  marginTop: 16,
  textAlign: 'left',
};

const mutedText: CSSProperties = {
  fontSize: 12,
  color: '#4b5563',
  lineHeight: '18px',
  margin: 0,
};

const footer: CSSProperties = {
  backgroundColor: '#ffffff',
  textAlign: 'center',
  padding: 16,
  borderTop: '1px solid #f1f3f5',
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
