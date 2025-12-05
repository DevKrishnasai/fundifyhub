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
import { RequestSubmittedPayloadType } from '@fundifyhub/types';

/* --------------------------------- EMAIL --------------------------------- */
const RequestSubmittedEmail = ({
  customerName,
  requestId,
  assetName,
  amount,
  district,
  submittedAt,
  companyName,
  dashboardUrl,
  supportUrl,
  logoUrl,
  companyUrl,
}: RequestSubmittedPayloadType & { logoUrl?: string; companyUrl?: string }) => (
  <Html lang="en">
    <Head />

    {/* UPDATED: More polished preview text */}
    <Preview>{companyName ?? 'FundifyHub'} — Request Submitted ({requestId})</Preview>

    <Body style={main}>
      <Container style={card}>

        {/* -------------------------- Header -------------------------- */}
        <Section style={brandHeader}>
          {logoUrl && (
            <Img
                src={logoUrl}
                width="48"
                height="48"
                alt={`${companyName ?? 'Company'} Logo`}
                style={{ borderRadius: 10 }}
            />
          )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Heading style={brandTitle}>{companyName ?? 'FundifyHub'}</Heading>
              {companyUrl && (
                <Text style={brandMeta}>
                  <a href={companyUrl} style={footerLink}>{companyUrl}</a>
                </Text>
              )}
            </div>
        </Section>

        {/* --------------------------- Content --------------------------- */}
        <Section style={content}>
          <Heading style={title}>Request Submitted Successfully</Heading>

          <Text style={leadText}>
            Hi {customerName ?? 'Customer'},
          </Text>

          {/* UPDATED: Clearer, warmer introduction */}
          <Text style={text}>
            We've received your request and our team has started processing it.  
            Here are the details you submitted:
          </Text>

          {/* ------------------------ Info Card ------------------------ */}
          <Section style={infoCard}>
            <Text style={infoRow}><strong>Request ID:</strong> {requestId}</Text>
            <Text style={infoRow}><strong>Asset:</strong> {assetName ?? '—'}</Text>
            <Text style={infoRow}>
              <strong>Amount:</strong> {typeof amount === 'number' ? `₹${amount}` : '—'}
            </Text>
            <Text style={infoRow}><strong>District:</strong> {district ?? '—'}</Text>
            <Text style={infoRow}><strong>Submitted:</strong> {submittedAt ?? '—'}</Text>
          </Section>

          {/* -------------------------- Button -------------------------- */}
          <Button
            href={dashboardUrl ?? supportUrl ?? '#'}
            style={primaryButton}
          >
            View Request Status
          </Button>

          {/* ------------------------- Support Text ------------------------- */}
          <Text style={smallText}>
            Need assistance? Reply to this email or visit{' '}
            <a href={supportUrl} style={link}>
              our support page
            </a>.
          </Text>

          {/* UPDATED: Security-friendly footer line */}
          <Text style={mutedText}>
            This is an automated notification. Please avoid sharing sensitive information in your replies.
          </Text>
        </Section>

        {/* --------------------------- Footer --------------------------- */}
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} {companyName ?? 'FundifyHub'} ·{' '}
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
export const renderEmail = (
  vars: RequestSubmittedPayloadType & { logoUrl?: string; companyUrl?: string }
) => {
  return render(<RequestSubmittedEmail {...vars} />);
};

export default renderEmail;

/* ------------------------------- STYLES ------------------------------- */
const main: CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: 'flex',
  justifyContent: 'center',
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 560,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
};

const brandHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 12,
  padding: '16px 20px',
  borderBottom: '1px solid #f1f3f5',
};

const brandTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#111827',
  margin: 0,
};

const brandMeta: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  margin: 0,
};

const content: CSSProperties = {
  padding: '32px 28px',
  textAlign: 'left',
};

const title: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#111827',
  marginBottom: 12,
};

const leadText: CSSProperties = {
  fontSize: 15,
  color: '#374151',
  marginBottom: 10,
};

const text: CSSProperties = {
  fontSize: 14,
  color: '#4b5563',
  lineHeight: '20px',
  marginBottom: 16,
};

const infoCard: CSSProperties = {
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  padding: 18,
  border: '1px solid #e5e7eb',
  marginBottom: 20,
};

const infoRow: CSSProperties = {
  fontSize: 14,
  color: '#111827',
  marginBottom: 6,
};

const primaryButton: CSSProperties = {
  backgroundColor: '#0b63d6',
  color: '#ffffff',
  padding: '12px 26px',
  borderRadius: 30,
  fontWeight: 700,
  display: 'inline-block',
  textDecoration: 'none',
  marginTop: 10,
  boxShadow: '0 6px 18px rgba(11,99,214,0.18)',
};

const smallText: CSSProperties = {
  fontSize: 13,
  color: '#4b5563',
  marginTop: 14,
  lineHeight: '20px',
};

const mutedText: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginTop: 10,
  lineHeight: '18px',
};

const footer: CSSProperties = {
  textAlign: 'center',
  padding: 16,
};

const footerText: CSSProperties = {
  fontSize: 11,
  color: '#9ca3af',
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
