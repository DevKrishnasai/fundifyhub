import { StatusPayloadType, STATUS_TEMPLATE_DEFAULTS } from '@fundifyhub/types';

function renderTransitions(transitions?: StatusPayloadType['transitions']) {
  if (!transitions || transitions.length === 0) return '';
  return transitions
    .map((t, i) => `• ${i + 1}. ${t.from} → ${t.to}${t.by ? ` by ${t.by}` : ''}${t.time ? ` at ${t.time}` : ''}`)
    .join('\n');
}

export const renderStatusWhatsApp = (vars: StatusPayloadType) => {
  const header = vars.header ?? STATUS_TEMPLATE_DEFAULTS.header;
  const description = vars.description ?? STATUS_TEMPLATE_DEFAULTS.description;
  const footer = vars.footer ?? STATUS_TEMPLATE_DEFAULTS.footer;

  const status = vars.status ?? 'Updated';
  const previousStatus = vars.previousStatus ?? '—';
  const updatedBy = vars.updatedBy ?? 'System';
  const link = vars.link ?? '';
  const time = vars.time ?? 'Just now';

  const transitionsBlock = renderTransitions(vars.transitions);

  // WhatsApp friendly formatted message
  return ` *${header}*\n\n` +
    ` ${description}\n\n` +
    ` *Status Change*\n` +
    ` *Previous:* ${previousStatus}\n` +
    ` *Current:* ${status}\n` +
    ` *Updated By:* ${updatedBy}\n` +
    ` *When:* ${time}\n\n` +
    (transitionsBlock ? ` *Transition History*\n${transitionsBlock}\n\n` : '') +
    ` View: ${link}\n\n` +
    `${footer}`;
};

export default renderStatusWhatsApp;
