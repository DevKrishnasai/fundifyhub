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

interface PromotionEmailProps {
  customerName?: string;
  offerTitle?: string;
  offerDescription?: string;
  ctaLink?: string;
  ctaText?: string;
  expiryDate?: string;
  bannerImage?: string;
}

export const PromotionEmail = ({
  customerName = 'Valued Customer',
  offerTitle = 'Unlock Exclusive Savings — Just for You!',
  offerDescription = 'Enjoy up to 50% off on Fundify Premium Plans! Get access to personalized financial tools, faster insights, and priority support.',
  ctaLink = 'https://www.fundify.com/offers',
  ctaText = 'Activate My Offer',
  expiryDate = 'October 31, 2025',
  bannerImage = 'https://fundify-assets.s3.amazonaws.com/promo-banner.jpg',
}: PromotionEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>Special Fundify Offer — Limited Time Only!</Preview>

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

        {/* Hero Banner */}
        <Section style={heroSection}>
          <Img
            src={bannerImage}
            alt="Special Offer Banner"
            width="100%"
            height="auto"
            style={{ borderRadius: '8px' }}
          />
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Heading style={title}>Hey {customerName},</Heading>

          <Text style={leadText}>
            We’re thrilled to bring you something extra special! ✨  
            Take advantage of this <strong>exclusive offer</strong> crafted just for our loyal users.
          </Text>

          {/* Offer Card */}
          <Section style={offerCard}>
            <Text style={offerTitleStyle}>{offerTitle}</Text>
            <Text style={offerDesc}>{offerDescription}</Text>
            <Text style={offerExpiry}>⏰ Offer ends on <strong>{expiryDate}</strong></Text>
            <Button href={ctaLink} style={primaryButton}>{ctaText}</Button>
          </Section>

          <Text style={smallText}>
            Don’t miss this chance to upgrade your Fundify experience — once it’s gone, it’s gone!
          </Text>

          <Text style={mutedText}>
            This offer is available for a limited time only. For assistance, <a href="https://www.fundify.com/support" style={link}>contact our team</a>.
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

export default PromotionEmail;

/* -------------------------
   Styles (Unified)
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

const heroSection: CSSProperties = {
  textAlign: 'center',
  backgroundColor: '#ffffff',
  padding: '20px 28px 0',
};

const content: CSSProperties = {
  padding: '30px 28px 34px',
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

const offerCard: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid rgba(11,99,214,0.12)',
  borderRadius: 12,
  padding: '22px',
  textAlign: 'center',
  boxShadow: '0 6px 18px rgba(11,99,214,0.06)',
  marginBottom: 24,
};

const offerTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#0b63d6',
  marginBottom: 12,
};

const offerDesc: CSSProperties = {
  color: '#4b5563',
  fontSize: 15,
  lineHeight: '22px',
  marginBottom: 16,
};

const offerExpiry: CSSProperties = {
  color: '#d93025',
  fontSize: 13,
  fontWeight: 600,
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

const link: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'underline',
};
