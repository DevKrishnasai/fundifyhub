"use client";

import React from 'react';
import RequestActions from './RequestActions';
import { Button } from '@/components/ui/button';

type Props = {
  request: any;
  onUpdated?: (r: any) => void;
};

export default function ActionToolbar({ request, onUpdated }: Props) {
  const copyRequestNumber = async () => {
    try {
      await navigator.clipboard.writeText(request.requestNumber || request.id);
      alert('Request number copied');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Failed to copy');
    }
  };

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Customer</div>
          <div className="font-semibold">{request.customer?.firstName ? `${request.customer.firstName} ${request.customer.lastName || ''}`.trim() : '—'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Contact</div>
          <div className="font-semibold">{request.customer?.phoneNumber || request.customer?.email || '—'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Request</div>
          <div className="font-semibold">{request.requestNumber || request.id}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <RequestActions requestId={request.id} requestStatus={request.currentStatus} district={request.district} onUpdated={onUpdated} />
        <Button variant="ghost" onClick={copyRequestNumber}>Copy Ref</Button>
      </div>
    </div>
  );
}
