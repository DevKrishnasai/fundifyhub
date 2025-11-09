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
  Section,
  Button,
} from '@react-email/components';
import type { CSSProperties } from 'react';
import { render } from '@react-email/render';
import { AssetPledgePayloadType } from '@fundifyhub/types';

const AssetPledgeEmail = ({
  email,
  phoneNumber,
  customerName,
  assetName,
  amount,
  district,
  requestId,
  companyName,
  timestamp,
  adminDashboardUrl,
  supportUrl
}: AssetPledgePayloadType) => (
  <Html lang="en">
    <Head />
    <Preview>New asset pledge by {customerName || 'Customer'} — {assetName}</Preview>

    <Body style={main}>
      <Container style={card}>
        <Section style={brandHeader}>
          <Heading style={brandTitle}>{companyName || 'Fundify'}</Heading>
        </Section>

        <Section style={content}>
          <Heading style={title}>New Asset Pledge Created</Heading>

          <Text style={text}>
            A new asset pledge request was submitted by <strong>{customerName || 'Customer'}</strong>.
          </Text>

          <Section style={infoCard}>
            <Text style={muted}>Asset</Text>
            <Text style={infoItem}>{assetName}</Text>

            <Text style={muted}>Requested Amount</Text>
            <Text style={infoItem}>₹{amount}</Text>

            <Text style={muted}>District</Text>
            <Text style={infoItem}>{district}</Text>

            {/* {additionalDescription && (
              <>
                <Text style={muted}>Notes</Text>
                <Text style={infoItem}>{additionalDescription}</Text>
              </>
            )} */}

            <Text style={muted}>Request ID</Text>
            <Text style={infoItem}>{requestId}</Text>

            <Text style={muted}>Submitted At</Text>
            <Text style={infoItem}>{timestamp || new Date().toLocaleString()}</Text>
          </Section>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>© {new Date().getFullYear()} {companyName || 'Fundify'}. All rights reserved.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const renderEmail = (vars: AssetPledgePayloadType) => {
  const props: AssetPledgePayloadType = {
    email: vars.email,
    phoneNumber: vars.phoneNumber,
    customerName: vars.customerName,
    assetName: vars.assetName,
    amount: vars.amount,
    district: vars.district,
    requestId: vars.requestId,
    companyName: vars.companyName,
    timestamp: vars.timestamp,
    adminDashboardUrl: vars.adminDashboardUrl,
    supportUrl: vars.supportUrl,
  };

  return render(<AssetPledgeEmail {...props} />);
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
  maxWidth: 640,
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  border: '1px solid #f3f4f6',
};

const brandHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  borderBottom: '1px solid #f1f3f5',
};

const brandTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#111827',
  margin: 0,
};

const content: CSSProperties = {
  padding: '24px',
  textAlign: 'left',
};

const title: CSSProperties = {
  color: '#111827',
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 12,
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#374151',
  marginBottom: 12,
};

const infoCard: CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: 8,
  padding: '12px',
  marginBottom: 14,
};

const muted: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginTop: 8,
  marginBottom: 4,
};

const infoItem: CSSProperties = {
  fontSize: 15,
  color: '#111827',
  marginBottom: 6,
};

const primaryButton: CSSProperties = {
  backgroundColor: '#0b63d6',
  color: '#ffffff',
  padding: '10px 18px',
  borderRadius: 8,
  textDecoration: 'none',
  display: 'inline-block',
  fontWeight: 700,
};

const smallText: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginTop: 12,
};

const footer: CSSProperties = {
  backgroundColor: '#ffffff',
  textAlign: 'center',
  padding: 12,
};

const footerText: CSSProperties = {
  fontSize: 12,
  color: '#9ca3af',
  lineHeight: '20px',
  margin: 0,
};

const link: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'none',
};
