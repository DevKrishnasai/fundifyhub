import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { CSSProperties } from 'react';

export const PasswordResetEmail = () => (
  <Html lang="en">
    <Head />
    <Preview>Reset your password securely — Nova</Preview>

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

        {/* Main Content */}
        <Section style={content}>
          <Heading style={title}>Reset Your Password</Heading>

          <Text style={leadText}>
            Hey there 👋, <br /> We received a request to reset your Nova account
            password. Click below to securely set a new password.
          </Text>

          <Button href="https://nova.app/reset" style={primaryButton}>
            Reset Password
          </Button>

          <Text style={smallText}>
            This link will expire in <strong>30 minutes</strong>. If you didn’t request it, please ignore this email.
          </Text>

          <Text style={mutedText}>
            For security reasons, never share your password or any verification code with anyone.
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

export default PasswordResetEmail;

/* -------------------------
   Styles
------------------------- */

const main: CSSProperties = {
  backgroundColor: '#ffffff', // white only
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: 'flex',
  justifyContent: 'center',
  padding: '0', // no top/bottom padding
  margin: '0', // no top/bottom margin
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 560,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#ffffff', // white only
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
  margin: '0', // no extra spacing
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
  marginBottom: 24,
  lineHeight: '23px',
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
  marginBottom: 8,
};

const mutedText: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  lineHeight: '18px',
  marginTop: 6,
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
