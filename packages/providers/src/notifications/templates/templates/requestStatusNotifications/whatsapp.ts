import { RequestStatusUpdatePayload } from '@fundifyhub/types';

export const renderStatusWhatsApp = (vars: RequestStatusUpdatePayload) => {
  const header = `${vars.companyName ?? 'FundifyHub'} - Request Update`;
  const description = vars.statusDescription ?? 'There has been an update to your request. Please review the status below for more details.';
  const footer = 'If you need help, contact your district admin or reply to this message.';

  const currentStatus = vars.currentStatus;
  const previousStatus = vars.previousStatus ?? '—';
  const link = vars.dashboardUrl;
  const time = vars.updatedAt ?? 'Just now';
  const actionRequired = vars.actionRequired;

  // WhatsApp friendly formatted message
  return ` *${header}*\n\n` +
    ` Hi ${vars.customerName}, your request (${vars.requestNumber}) has been updated.\n\n` +
    ` ${description}\n\n` +
    ` *Status Change*\n` +
    ` *Previous:* ${previousStatus}\n` +
    ` *Current:* ${currentStatus}\n` +
    ` *When:* ${time}\n\n` +
    (actionRequired ? ` *Action Required:* ${actionRequired}\n\n` : '') +
    ` View: ${link}\n\n` +
    `${footer}`;
};

export default renderStatusWhatsApp;
