/**
 * Small helper to provide friendly labels for requestHistory.action values
 * and to format metadata for display in the timeline.
 */
export function getActionLabel(action?: string | null) {
  if (!action) return 'Action';
  const ACTION_LABELS: Record<string, string> = {
    OFFER_CREATED: 'Offer created',
    OFFER_ACCEPTED: 'Offer accepted',
    OFFER_DECLINED: 'Offer declined',
    ASSIGNED_AGENT: 'Agent assigned',
    INSPECTION_STARTED: 'Inspection started',
    INSPECTION_COMPLETED: 'Inspection completed',
    LOAN_CREATED: 'Loan created',
  };
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Fallback: humanize constant like SOME_ACTION -> Some Action
  return String(action).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMetadata(metadata: any): Array<{ key: string; value: string }> {
  if (!metadata) return [];
  // If metadata is a string (legacy), try to parse JSON
  let meta = metadata;
  if (typeof metadata === 'string') {
    try { meta = JSON.parse(metadata); } catch (_) { meta = { info: metadata }; }
  }
  if (typeof meta !== 'object' || meta === null) return [{ key: 'value', value: String(meta) }];

  const entries: Array<{ key: string; value: string }> = [];
  for (const k of Object.keys(meta)) {
    try {
      const v = meta[k];
      if (v === null || v === undefined) entries.push({ key: k, value: '' });
      else if (typeof v === 'object') entries.push({ key: k, value: JSON.stringify(v) });
      else entries.push({ key: k, value: String(v) });
    } catch (e) {
      entries.push({ key: k, value: String((meta as any)[k]) });
    }
  }
  return entries;
}

export default getActionLabel;
