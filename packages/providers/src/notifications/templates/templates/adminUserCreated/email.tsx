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
import { AdminUserCreatedPayload } from '@fundifyhub/types';

/* --------------------------------- EMAIL --------------------------------- */
const AdminUserCreatedEmail = ({
  name,
  temporaryPassword,
  loginUrl,
  companyName,
  supportUrl,
  logoUrl,
  companyUrl,
  role,
}: AdminUserCreatedPayload) => (
  <Html lang="en">
    <Head />
    <Preview>
      Your {companyName} account has been created
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
            <Text style={welcomeIcon}>🎉</Text>
          </Section>

          <Heading style={heading}>Welcome to {companyName}!</Heading>

          <Text style={leadText}>Hi {name},</Text>

          <Text style={text}>
            An account has been created for you. You can now access the {companyName} platform.
          </Text>

          <Section style={credentialsCard}>
            <Text style={credentialsTitle}>Your Login Credentials</Text>
            {temporaryPassword && (
              <>
                <Text style={credentialsLabel}>Temporary Password:</Text>
                <Text style={credentialsValue}>{temporaryPassword}</Text>
              </>
            )}
            <Text style={credentialsNote}>
              ⚠️ Please change your password after logging in for the first time.
            </Text>
          </Section>

          {role && (
            <Section style={assignmentCard}>
              <Text style={assignmentTitle}>Your Assignments</Text>
              <Text style={assignmentText}>
                <strong>Role:</strong> {role}
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button href={loginUrl} style={primaryButton}>
              Login to Your Account
            </Button>
          </Section>

          <Text style={smallText}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>{loginUrl}</Text>

          <Section style={securityNote}>
            <Text style={mutedText}>
              🔒 <strong>Security Tip:</strong> After logging in, we recommend you reset your password to something more memorable and secure.
            </Text>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Need help? Contact us at{' '}
            <a href={supportUrl} style={footerLink}>
              Support
            </a>
          </Text>
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
export const renderEmail = (vars: AdminUserCreatedPayload) => {
  return render(<AdminUserCreatedEmail {...vars} />);
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

const welcomeIcon: CSSProperties = {
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

const credentialsCard: CSSProperties = {
  backgroundColor: '#f0f9ff',
  borderRadius: 12,
  padding: '20px',
  textAlign: 'center',
  border: '1px solid #bae6fd',
  marginBottom: 20,
};

const credentialsTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#0369a1',
  marginBottom: 12,
  marginTop: 0,
};

const credentialsLabel: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
  marginTop: 0,
};

const credentialsValue: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#0b63d6',
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: 18,
  fontWeight: 700,
  padding: '10px 16px',
  borderRadius: 8,
  display: 'inline-block',
  letterSpacing: 1,
  marginBottom: 12,
  border: '1px solid #e5e7eb',
};

const credentialsNote: CSSProperties = {
  fontSize: 12,
  color: '#92400e',
  margin: 0,
};

const assignmentCard: CSSProperties = {
  backgroundColor: '#f3f4f6',
  borderRadius: 8,
  padding: '16px',
  marginBottom: 20,
  textAlign: 'left',
};

const assignmentTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 8,
  marginTop: 0,
};

const assignmentText: CSSProperties = {
  fontSize: 13,
  color: '#4b5563',
  margin: '4px 0',
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
