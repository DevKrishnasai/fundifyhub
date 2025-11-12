"use client"

import { useParams } from "next/navigation";
import RequestDetailComplete from '@/components/request/RequestDetailComplete';

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return <RequestDetailComplete id={id} />;
}
