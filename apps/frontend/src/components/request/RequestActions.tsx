"use client";
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { REQUEST_STATUS, ROLES } from '@fundifyhub/types';
import CreateOfferModal from './CreateOfferModal';
import AssignAgentModal from './AssignAgentModal';
import { MoreHorizontal, UserPlus, FilePlus, CheckCircle, XCircle, Clipboard, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Props = {
  requestId: string;
  requestStatus: string;
  onUpdated?: (data: {
    id: string;
    requestNumber?: string | null;
    currentStatus: string;
    requestedAmount: number;
    district: string;
    assignedAgentId?: string | null;
  }) => void;
  district?: string;
};

export default function RequestActions({ requestId, requestStatus, onUpdated, district }: Props) {
  const [loading, setLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [initialOffer, setInitialOffer] = useState<{ amount?: number; tenureMonths?: number; interestRate?: number } | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const auth = useAuth();
  const isSuper = auth.isSuperAdmin();
  const isDistrictAdmin = auth.isDistrictAdmin();
  const isAgent = auth.isAgent();
  const isCustomer = auth.isCustomer();
  const isAdmin = auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]);

  // Compute next actions based on role and request status
  const nextActions = useMemo(() => {
    const actions: string[] = [];
    // Customer actions (only when the user is strictly a customer, not an admin)
    if (!isAdmin && isCustomer && requestStatus === REQUEST_STATUS.OFFER_SENT) {
      actions.push('accept', 'reject');
    }

    // Agent actions (treat agent separately; don't allow admins to inherit agent-only UI)
    if (!isAdmin && isAgent) {
      if (requestStatus === REQUEST_STATUS.INSPECTION_SCHEDULED) actions.push('start-inspection');
      if (requestStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS) actions.push('complete-inspection');
    }

    // Admin actions (district admin & super)
    if (isAdmin) {
  // Assign agent should happen after customer accepts an offer (then admin schedules inspection)
  if (requestStatus === REQUEST_STATUS.OFFER_ACCEPTED) actions.push('assign-agent');
  // Create offer allowed in these statuses (but not when customer explicitly rejected - admins should Revise instead)
  if ([REQUEST_STATUS.PENDING, REQUEST_STATUS.UNDER_REVIEW, REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.APPROVED].includes(requestStatus as REQUEST_STATUS)) actions.push('create-offer');
  // Revise an existing offer when an offer has already been made
  if (requestStatus === REQUEST_STATUS.OFFER_SENT || requestStatus === REQUEST_STATUS.OFFER_DECLINED) actions.push('revise-offer');
      // Finalize loan when accepted/inspection completed/approved
      if ([REQUEST_STATUS.OFFER_ACCEPTED, REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.APPROVED].includes(requestStatus as REQUEST_STATUS)) actions.push('finalize');
    }

    return actions;
  }, [isCustomer, isAgent, isDistrictAdmin, isSuper, requestStatus, isAdmin]);

  // Avoid showing role-specific actions while auth is initializing to prevent flashes
  if (auth.isLoading) return null;

  // Primary actions to show as buttons (order matters). Remaining actions go into the More menu.
  const primaryOrder = ['create-offer', 'revise-offer', 'assign-agent', 'accept', 'reject', 'finalize'];
  const primaryToRender = primaryOrder.filter(a => nextActions.includes(a));
  const moreActions = nextActions.filter(a => !primaryToRender.includes(a));

  async function fetchFullRequest() {
    try {
      const rresp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}`, { credentials: 'include' });
      const rjson = await rresp.json();
      if (rresp.ok && rjson?.data?.request) return rjson.data.request;
      return null;
    } catch (err) {
      return null;
    }
  }

  async function createOffer(payload: { amount: number; tenureMonths: number; interestRate: number }) {
    const { amount, tenureMonths, interestRate } = payload;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/offer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, tenureMonths, interestRate })
      });
      const payload = await res.json();
      if (res.ok) {
        onUpdated?.(payload.data.request);
        setShowOffer(false);
        setInitialOffer(null);
      } else {
        alert(payload.message || 'Failed to create offer');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function acceptOffer() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: REQUEST_STATUS.OFFER_ACCEPTED })
      });
      const p = await res.json();
      if (res.ok) {
        // re-fetch the full request (including requestHistory) to ensure UI shows latest history
        try {
          const rresp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}`, { credentials: 'include' });
          const rjson = await rresp.json();
          if (rresp.ok && rjson?.data?.request) onUpdated?.(rjson.data.request);
          else onUpdated?.(p.data.request);
        } catch (err) {
          // fallback to returned partial request
          onUpdated?.(p.data.request);
        }
      }
      else alert(p.message || 'Failed to accept offer');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Network error');
    } finally { setLoading(false); }
  }

  async function rejectOffer() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: REQUEST_STATUS.OFFER_DECLINED })
      });
      const p = await res.json();
      if (res.ok) {
        try {
          const rresp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}`, { credentials: 'include' });
          const rjson = await rresp.json();
          if (rresp.ok && rjson?.data?.request) onUpdated?.(rjson.data.request);
          else onUpdated?.(p.data.request);
        } catch (err) {
          onUpdated?.(p.data.request);
        }
      }
      else alert(p.message || 'Failed to reject offer');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Network error');
    } finally { setLoading(false); }
  }

  async function finalizeAction() {
    setLoading(true);
    try {
      const url = `/api/v1/requests/${requestId}/offers/admin-offer/confirm`;
      const resp = await fetch(url, { method: 'POST', credentials: 'include' });
      const payload = await resp.json();
      if (resp.ok) onUpdated?.(payload.data?.loan ? payload.data.loan : payload.data.request);
      else alert(payload.message || 'Failed to finalize');
    } catch (e) { console.error(e); alert('Network error'); } finally { setLoading(false); }
  }

  async function openReviseOffer() {
    setLoading(true);
    try {
      const full = await fetchFullRequest();
      if (full) {
        setInitialOffer({
          amount: full.adminOfferedAmount ?? undefined,
          tenureMonths: full.adminTenureMonths ?? undefined,
          interestRate: full.adminInterestRate ?? undefined,
        });
      } else {
        setInitialOffer(null);
      }
      setShowOffer(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Failed to load current offer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Render only next actions prominently */}
      {primaryToRender.includes('create-offer') && (
        <Button className="h-9 px-4" title="Create a new offer" onClick={() => { setInitialOffer(null); setShowOffer(true); }} variant="default" disabled={loading || requestStatus === REQUEST_STATUS.OFFER_SENT}>
          <FilePlus className="mr-2 h-4 w-4" /> Create Offer
        </Button>
      )}

      {primaryToRender.includes('revise-offer') && (
        <Button className="h-9 px-4" title="Revise existing offer" onClick={openReviseOffer} variant="outline" disabled={loading}>
          <FilePlus className="mr-2 h-4 w-4" /> Revise Offer
        </Button>
      )}

      {primaryToRender.includes('assign-agent') && (
        <Button className="h-9 px-4" title="Assign an agent" onClick={() => setShowAssign(true)} variant="outline" disabled={loading || requestStatus === REQUEST_STATUS.INSPECTION_SCHEDULED}>
          <UserPlus className="mr-2 h-4 w-4" /> Assign Agent
        </Button>
      )}

      {primaryToRender.includes('accept') && (
        <Button className="h-9 px-4" title="Accept the admin offer" onClick={acceptOffer} variant="secondary" disabled={loading}>
          <CheckCircle className="mr-2 h-4 w-4" /> Accept Offer
        </Button>
      )}

      {primaryToRender.includes('reject') && (
        <Button className="h-9 px-4" title="Reject the admin offer" onClick={rejectOffer} variant="destructive" disabled={loading}>
          <XCircle className="mr-2 h-4 w-4" /> Reject Offer
        </Button>
      )}

      {primaryToRender.includes('start-inspection') && (
        <Button title="Start inspection" onClick={async () => {
          setLoading(true);
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/status`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: REQUEST_STATUS.INSPECTION_IN_PROGRESS }) });
            const p = await res.json();
            if (res.ok) {
              const full = await fetchFullRequest();
              if (full) onUpdated?.(full);
              else onUpdated?.(p.data.request);
            }
          } catch (e) {
            console.error(e);
            alert('Failed to start inspection');
          } finally { setLoading(false); }
        }} variant="outline"><Calendar className="mr-2 h-4 w-4"/>Start Inspection</Button>
      )}

      {primaryToRender.includes('complete-inspection') && (
        <Button title="Mark inspection complete" onClick={async () => {
          setLoading(true);
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/status`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: REQUEST_STATUS.INSPECTION_COMPLETED }) });
            const p = await res.json();
            if (res.ok) {
              const full = await fetchFullRequest();
              if (full) onUpdated?.(full);
              else onUpdated?.(p.data.request);
            }
          } catch (e) {
            console.error(e);
            alert('Failed to complete inspection');
          } finally { setLoading(false); }
        }} variant="default">Complete Inspection</Button>
      )}

      {primaryToRender.includes('finalize') && (
        <Button className="h-9 px-4" title="Finalize loan (admin)" onClick={finalizeAction} variant="secondary"><Clipboard className="mr-2 h-4 w-4"/>Finalize</Button>
      )}

      {/* Secondary actions in a More menu (admins only) */}
      {isAdmin && moreActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" title="More actions"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {moreActions.map((act) => {
              const key = act;
              const renderItem = () => {
                switch (act) {
                  case 'create-offer':
                    return (
                      <DropdownMenuItem key={key} onClick={() => { setInitialOffer(null); setShowOffer(true); }}>
                        <FilePlus className="mr-2 h-4 w-4" /> Create Offer
                      </DropdownMenuItem>
                    );
                  case 'revise-offer':
                    return (
                      <DropdownMenuItem key={key} onClick={openReviseOffer}>
                        <FilePlus className="mr-2 h-4 w-4" /> Revise Offer
                      </DropdownMenuItem>
                    );
                  case 'assign-agent':
                    return (
                      <DropdownMenuItem key={key} onClick={() => setShowAssign(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Assign Agent
                      </DropdownMenuItem>
                    );
                  case 'start-inspection':
                    return (
                      <DropdownMenuItem key={key} onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/status`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: REQUEST_STATUS.INSPECTION_IN_PROGRESS }) });
                          const p = await res.json();
                          if (res.ok) {
                            const full = await fetchFullRequest();
                            if (full) onUpdated?.(full);
                            else onUpdated?.(p.data.request);
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Failed to start inspection');
                        } finally { setLoading(false); }
                      }}>
                        <Calendar className="mr-2 h-4 w-4" /> Start Inspection
                      </DropdownMenuItem>
                    );
                  case 'complete-inspection':
                    return (
                      <DropdownMenuItem key={key} onClick={async () => {
                        setLoading(true);
                        try {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/status`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: REQUEST_STATUS.INSPECTION_COMPLETED }) });
                          const p = await res.json();
                          if (res.ok) {
                            const full = await fetchFullRequest();
                            if (full) onUpdated?.(full);
                            else onUpdated?.(p.data.request);
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Failed to complete inspection');
                        } finally { setLoading(false); }
                      }}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Complete Inspection
                      </DropdownMenuItem>
                    );
                  case 'accept':
                    return (
                      <DropdownMenuItem key={key} onClick={acceptOffer}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Accept Offer
                      </DropdownMenuItem>
                    );
                  case 'reject':
                    return (
                      <DropdownMenuItem key={key} onClick={rejectOffer}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject Offer
                      </DropdownMenuItem>
                    );
                  case 'finalize':
                    return (
                      <DropdownMenuItem key={key} onClick={finalizeAction}>
                        <Clipboard className="mr-2 h-4 w-4" /> Finalize
                      </DropdownMenuItem>
                    );
                  default:
                    return null;
                }
              };
              return renderItem();
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <CreateOfferModal open={showOffer} onOpenChange={(v: boolean) => {
        setShowOffer(v);
        if (!v) setInitialOffer(null);
      }} onSubmit={createOffer} requestId={requestId} initialOffer={initialOffer ?? undefined} />
      <AssignAgentModal open={showAssign} onOpenChange={(v: boolean) => setShowAssign(v)} district={district} onSubmit={async (agentId: string) => {
            setLoading(true);
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/assign`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId })
              });
              const data = await res.json();
              if (res.ok) {
                onUpdated?.(data.data.request);
                setShowAssign(false);
              } else {
                alert(data.message || 'Failed to assign agent');
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(err);
              alert('Network error');
            } finally {
              setLoading(false);
            }
          }} />
    </div>
  );
}
