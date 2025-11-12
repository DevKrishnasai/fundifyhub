"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@fundifyhub/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { getWithResult, postWithResult } from '@/lib/api-client';
import EmiSchedulePanel from './EmiSchedulePanel';

type Props = {
  request: any;
  onUpdated?: (r: any) => void;
};

export default function OfferCard({ request, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const auth = useAuth();
  const isAdmin = auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]);

  if (!request?.adminOfferedAmount) return null;

  // accept/reject are handled centrally by `RequestActions` to avoid duplicate controls

  async function finalizeAsAdmin() {
    if (!confirm('Finalize loan creation from admin offer?')) return;
    setFinalizing(true);
    try {
      const url = `/api/v1/requests/${request.id}/offers/admin-offer/confirm`;
      const resp = await postWithResult<any>(url, {});
      if (resp.ok) {
        const ref = await getWithResult<any>(`${BACKEND_API_CONFIG.ENDPOINTS.USER.GET_REQUEST_BY_IDENTIFIER(request.requestNumber ?? request.id)}`);
        if (ref.ok) onUpdated?.(ref.data);
      } else {
        alert(resp.error?.message || 'Failed to finalize loan');
      }
    } catch (e: any) {
      alert(e?.message || 'Network error');
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <Card className="mb-4 shadow-sm border border-muted/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-sm">Admin Offer</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-xs text-muted-foreground">Offered Amount</div>
            <div className="font-semibold">₹{Number(request.adminOfferedAmount).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tenure</div>
            <div className="font-semibold">{request.adminTenureMonths} months</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Interest</div>
            <div className="font-semibold">{request.adminInterestRate}%</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <EmiSchedulePanel request={request} triggerLabel="View Offered EMI" />

          {/* Admin finalize (only visible to admins) */}
          {isAdmin && request.currentStatus && (['OFFER_ACCEPTED','INSPECTION_COMPLETED','APPROVED'] as string[]).includes(request.currentStatus) && !request.loan && (
            <Button variant="default" onClick={finalizeAsAdmin} disabled={finalizing}>{finalizing ? 'Finalizing...' : 'Finalize Loan'}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
