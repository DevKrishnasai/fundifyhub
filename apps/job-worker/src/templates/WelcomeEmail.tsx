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

interface WelcomeEmailProps {
  customerName?: string;
}

export const WelcomeEmail = ({
  customerName = 'Naheed',
}: WelcomeEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>Welcome to Nova — Let’s get started!</Preview>

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

        {/* Body */}
        <Section style={content}>
          <Heading style={title}>Welcome aboard, {customerName}! 🎉</Heading>

          <Text style={leadText}>
            We’re excited to have you join <strong>Nova</strong>. You’re now part of a community that’s
            redefining smart investing and effortless fund management.
          </Text>

          <Text style={text}>
            Explore personalized insights, track your goals, and make the most out of every financial opportunity.
          </Text>

          <Text style={text}>
            Let’s get you started — your journey to financial clarity begins now.
          </Text>

          <Button href="https://www.fundify.com" style={primaryButton}>
            Explore Nova
          </Button>
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

export default WelcomeEmail;

/* -------------------------
   Unified Nova/Fundify Styles
------------------------- */

const main: CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
  marginBottom: 18,
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#4b5563',
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
  marginTop: 24,
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
