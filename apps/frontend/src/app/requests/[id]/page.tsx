import RequestDetailComplete from '@/components/request/RequestDetailComplete';

// Use `unknown` for the incoming props and perform a safe extraction of params.id
// This avoids `any` while remaining compatible with Next.js' generated types.
export default function Page(props: unknown) {
  // Try to extract params.id in a type-safe manner
  const params = (props as { params?: { id?: string | string[] } })?.params;
  const rawId = params?.id ?? '';
  const id = Array.isArray(rawId) ? String(rawId[0] ?? '') : String(rawId);

  return <RequestDetailComplete id={id} />;
}
