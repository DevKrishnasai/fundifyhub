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

/* ------------------------------- INTERFACE ------------------------------- */
interface WelcomeEmailProps {
  customerName: string;
  companyName: string;
  companyUrl: string;
  supportUrl: string;
  logoUrl: string;
}

/* --------------------------------- EMAIL --------------------------------- */
const WelcomeEmail = ({
  customerName = 'User',
  companyName,
  companyUrl,
  supportUrl,
  logoUrl,
}: WelcomeEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>
      Welcome to {companyName} — your journey to smarter finances begins!
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
          <Heading style={title}>
            Welcome to {companyName}, {customerName}! 🎉
          </Heading>

          <Text style={leadText}>
            We’re thrilled to have you join {companyName}, where managing and growing your
            finances becomes effortless. You now have access to smart tools that help you track,
            invest, and plan for a better financial future.
          </Text>

          <Section style={welcomeCard}>
            <Text style={highlightText}>
              Your journey to financial clarity starts today.
            </Text>

            <Button href={`${companyUrl}/get-started`} style={primaryButton}>
              Get Started
            </Button>
          </Section>

          <Text style={text}>Once inside your dashboard, you can:</Text>

          <ul style={list}>
            <li>💰 Set up your {companyName} wallet and link your accounts</li>
            <li>📊 Track your income, expenses, and investments in one place</li>
            <li>🚀 Explore personalized insights to grow your savings</li>
          </ul>

          <Text style={smallText}>
            Need help getting started? Visit our{' '}
            <a href={supportUrl} style={link}>Help Center</a> or reach out to our support team anytime.
          </Text>

          <Text style={mutedText}>
            Thanks for trusting {companyName}. Together, we’ll make smarter financial decisions — one goal at a time.
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
export const renderEmail = (vars: Record<string, any>) => {
  const props: WelcomeEmailProps = {
    customerName: vars.customerName || vars.userName || 'User',
    companyName: vars.companyName,
    companyUrl: vars.companyUrl,
    supportUrl: vars.supportUrl,
    logoUrl: vars.logoUrl,
  };

  return render(<WelcomeEmail {...props} />);
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

const welcomeCard: CSSProperties = {
  backgroundColor: '#eef6ff',
  borderRadius: 12,
  padding: '20px',
  textAlign: 'center',
  border: '1px solid rgba(26,115,232,0.12)',
  boxShadow: '0 6px 18px rgba(26,115,232,0.06)',
  marginBottom: 20,
};

const highlightText: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#0b63d6',
  marginBottom: 12,
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

const list: CSSProperties = {
  textAlign: 'left',
  color: '#333',
  fontSize: 14,
  lineHeight: '22px',
  margin: '12px auto 18px',
  maxWidth: 400,
  paddingLeft: '16px',
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
