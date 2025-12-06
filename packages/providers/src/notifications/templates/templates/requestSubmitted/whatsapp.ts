import { RequestSubmittedPayload } from '@fundifyhub/types';

export const renderRequestSubmittedWhatsApp = (vars: RequestSubmittedPayload) => {
  const customer = vars.customerName ?? 'Customer';
  const company = vars.companyName ?? 'FundifyHub';
  const requestId = vars.requestId;
  const submittedAt = vars.submittedAt ?? 'just now';

  const asset = vars.assetName ?? '—';
  const amount = typeof vars.requestedAmount === 'number' ? `₹${vars.requestedAmount}` : '—';
  const district = vars.district ?? '—';

  const dashboardUrl = vars.dashboardUrl ?? vars.supportUrl ?? '';
  const supportUrl = vars.supportUrl ?? 'support';

  return (
`🟦 *${company} — Request Submitted*

Hi ${customer},

Your request has been successfully submitted.  
Here are your request details:

🆔 *Request ID:* ${requestId}
📦 *Asset:* ${asset}
💰 *Amount:* ${amount}
📍 *District:* ${district}
🗓️ *Submitted At:* ${submittedAt}

🔗 *View Request:*  
${dashboardUrl}

If you need help, you can reply to this message or visit:  
${supportUrl}

Thank you,  
*${company}*`
  );
};

export default renderRequestSubmittedWhatsApp;
