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
import { OTPVerificationPayloadType } from '@fundifyhub/types';

/* --------------------------------- EMAIL --------------------------------- */
const OtpEmail = ({
  email,
  phoneNumber,
  otpCode,
  expiresInMinutes,
  companyName,
  supportUrl,
  verifyUrl,
  logoUrl,
  companyUrl,

}: OTPVerificationPayloadType) => (
  <Html lang="en">
    <Head />
    <Preview>
      Your {companyName} verification code — expires in {expiresInMinutes.toString()} minutes
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
          <Text style={leadText}>
            Use the verification code below to complete your action on {companyName}.
          </Text>

          <Section style={otpCard}>
            <Text style={otpLabel}>Your verification code</Text>
            <Text style={otpCodeStyle} aria-live="polite" data-otp={otpCode}>
              {otpCode}
            </Text>
            <Text style={otpSub}>Expires in {expiresInMinutes} minutes</Text>

            <Button href={`${verifyUrl}`} style={primaryButton}>
              Verify Now
            </Button>
          </Section>

          <Text style={text}>
            If the button doesn't work, enter this code on the verification page: <strong>{otpCode}</strong>.
          </Text>

          <Text style={smallText}>
            Didn't request this? Someone else may have entered your email by mistake. If so,{' '}
            <a href={supportUrl} style={link}>contact support</a>.
          </Text>

          <Text style={mutedText}>
            For your safety, never share this code — {companyName} will never ask for your password or card details via email.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {companyName}. All rights reserved. ·{' '}
            <a href={companyUrl} style={footerLink}>
              {companyUrl}
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

/* --------------------------- RENDER FUNCTION ---------------------------- */
export const renderEmail = (vars: OTPVerificationPayloadType) => {
  const props: OTPVerificationPayloadType = {
    email: vars.email,
    phoneNumber: vars.phoneNumber,
    otpCode: vars.otpCode,
    expiresInMinutes: vars.expiresInMinutes,
    companyName: vars.companyName,
    supportUrl: vars.supportUrl,
    verifyUrl: vars.verifyUrl,
    logoUrl: vars.logoUrl,
    companyUrl: vars.companyUrl,
  };

  return render(<OtpEmail {...props} />);
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

const leadText: CSSProperties = {
  fontSize: 15,
  color: '#4b5563',
  marginBottom: 20,
  lineHeight: '22px',
};

const otpCard: CSSProperties = {
  backgroundColor: '#eef6ff',
  borderRadius: 12,
  padding: '20px',
  textAlign: 'center',
  border: '1px solid rgba(26,115,232,0.12)',
  boxShadow: '0 6px 18px rgba(26,115,232,0.06)',
  marginBottom: 20,
};

const otpLabel: CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const otpCodeStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#0b63d6',
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 34,
  fontWeight: 700,
  padding: '12px 18px',
  borderRadius: 8,
  display: 'inline-block',
  letterSpacing: 6,
  marginBottom: 8,
};

const otpSub: CSSProperties = {
  color: '#6b7280',
  fontSize: 13,
  marginBottom: 14,
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
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#333',
  lineHeight: '20px',
  marginBottom: 12,
};

const smallText: CSSProperties = {
  fontSize: 13,
  color: '#4b5563',
  lineHeight: '20px',
  marginBottom: 6,
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

const link: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'underline',
};
