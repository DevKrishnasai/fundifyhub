// Replaced by direct array usage; keep helper for backward compatibility for now.
export function normalizeDistrict(d?: string | string[]): string | undefined {
  if (!d) return undefined;
  return Array.isArray(d) ? (d.length > 0 ? d[0] : undefined) : d;
}
