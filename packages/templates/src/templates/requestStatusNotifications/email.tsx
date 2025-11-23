import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Section,
  Img,
} from '@react-email/components';

import type { CSSProperties } from 'react';
import { render } from '@react-email/render';
import { RequestStatusNotificationsPayloadType } from '@fundifyhub/types';

const StatusEmail = ({
  header,
  description,
  currentStatus,
  previousStatus,
  updatedBy,
  time,
  link,
  footer,
  companyName,
  logoUrl,
  companyUrl,
  transitions,
}: RequestStatusNotificationsPayloadType) => {
  const hdr = 'FundifyHub - Request Update';
  const desc = 'There has been an update to your request. Please review the status below for more details.';
  const ftr = 'If you need help, contact your district admin or reply to this message.';

  return (
    <Html lang="en">
      <Head />

      {/* Email preview text */}
      <Preview>
        {hdr} – Status updated to {currentStatus}
      </Preview>

      <Body style={main}>
        <Container style={card}>
          {/* Header */}
          <Section style={brandHeader}>
            {/** Optional logo on the left */}
            {typeof (logoUrl) !== 'undefined' && logoUrl && (
              <Img src={logoUrl} width="48" height="48" alt={`${companyName ?? 'Company'} logo`} style={logoStyle} />
            )}

            <div style={brandHeadingWrap}>
              <Heading style={brandTitle}>{companyName ?? 'FundifyHub'}</Heading>
              {companyUrl && (
                <Text style={brandMeta}><a href={companyUrl} style={footerLink}>{companyUrl}</a></Text>
              )}
            </div>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={title}>{hdr}</Heading>

            <Text style={leadText}>
              Your request has a new update. Below are the latest details:
            </Text>

            {/* Status card */}
            <Section style={statusCard}>
              <div style={statusHeaderRow}>
                <Text style={label}>New Status</Text>
                <span style={statusPill}>{currentStatus}</span>
              </div>

              <div style={infoGrid}>
                <div>
                  <Text style={label}>Previous</Text>
                  <Text style={detailValue}>{previousStatus ?? '—'}</Text>
                </div>

                <div>
                  <Text style={label}>Updated By</Text>
                  <Text style={detailValue}>{updatedBy ?? 'System'}</Text>
                </div>

                <div>
                  <Text style={label}>Updated At</Text>
                  <Text style={detailValue}>{time ?? 'Just now'}</Text>
                </div>
              </div>
              {/* Transition timeline */}
              {Array.isArray(transitions) && transitions.length > 0 && (
                <Section style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Transition history</Text>
                  {transitions.map((t: any, i: number) => (
                    <Text key={i} style={{ fontSize: 14, color: '#111827', marginBottom: 6 }}>• {t.from} → {t.to}{t.by ? ` by ${t.by}` : ''}{t.time ? ` at ${t.time}` : ''}</Text>
                  ))}
                </Section>
              )}
            </Section>

            {/* Description */}
            <Text style={descriptionText}>
              {desc}
            </Text>

            {/* Button */}
            <Button href={link} style={primaryButton}>
              View Dashboard Status
            </Button>

            {/* Footer small text */}
            <Text style={mutedText}>{ftr}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const renderEmail = (vars: RequestStatusNotificationsPayloadType) => {
  return render(<StatusEmail {...vars} />);
};

export default renderEmail;

/* -------------------------------- Styles ------------------------------ */

const main: CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: 'flex',
  justifyContent: 'center',
  padding: 0
};

const card: CSSProperties = {
  width: '100%',
  maxWidth: 560,
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
  backgroundColor: '#ffffff'
};

const brandHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '18px 20px',
  borderBottom: '1px solid #f1f3f5'
};

const brandTitle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#111827',
  margin: 0
};

const content: CSSProperties = {
  padding: '32px 28px',
  textAlign: 'left'
};

const title: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: '#111827',
  marginBottom: 16
};

const leadText: CSSProperties = {
  fontSize: 15,
  color: '#4b5563',
  marginBottom: 20,
  lineHeight: '22px'
};

const statusCard: CSSProperties = {
  backgroundColor: '#eef6ff',
  borderRadius: 12,
  padding: '20px',
  border: '1px solid rgba(26,115,232,0.12)',
  boxShadow: '0 6px 18px rgba(26,115,232,0.06)',
  marginBottom: 22
};

const label: CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
  textTransform: 'uppercase',
  marginTop: 12,
  marginBottom: 4
};

const statusValue: CSSProperties = {
  fontSize: 18,
  color: '#0b63d6',
  fontWeight: 700
};

const detailValue: CSSProperties = {
  fontSize: 15,
  color: '#111827',
  fontWeight: 500
};

const descriptionText: CSSProperties = {
  fontSize: 14,
  color: '#4b5563',
  marginBottom: 18,
  lineHeight: '20px'
};

const primaryButton: CSSProperties = {
  backgroundColor: '#0b63d6',
  color: '#ffffff',
  padding: '12px 26px',
  borderRadius: 28,
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: 12,
  boxShadow: '0 6px 18px rgba(11,99,214,0.18)'
};

const mutedText: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginTop: 14,
  lineHeight: '18px'
};

const footerLink: CSSProperties = {
  color: '#0b63d6',
  textDecoration: 'none',
};

const logoStyle: CSSProperties = {
  borderRadius: 10,
  display: 'block',
};

const brandHeadingWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const brandMeta: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  margin: 0,
};

const statusHeaderRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const statusPill: CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#eef6ff',
  color: '#0b63d6',
  padding: '6px 12px',
  borderRadius: 20,
  fontWeight: 700,
};

const infoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 12,
  marginTop: 12,
};
