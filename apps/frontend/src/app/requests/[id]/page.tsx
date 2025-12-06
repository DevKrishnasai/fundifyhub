import { RequestDetailPageContainer } from '@/components/request/RequestDetailPageContainer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <RequestDetailPageContainer id={id} />;
}
