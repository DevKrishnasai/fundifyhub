"use client";
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequestActions } from '@/hooks/useRequestActions';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { REQUEST_STATUS, ROLES } from '@fundifyhub/types';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { api } from '@/lib/api-client';
import CreateOfferModal from './CreateOfferModal';
import AssignAgentModal from './AssignAgentModal';
import { UserPlus, FilePlus, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { executeRequestAction } from '@/lib/request-actions';

type Props = {
  requestId: string;
  requestStatus: string;
  customerId?: string;
  assignedAgentId?: string | null;
  onUpdated?: (data: {
    id: string;
    requestNumber?: string | null;
    currentStatus: string;
    requestedAmount: number;
    district: string;
    assignedAgentId?: string | null;
  }) => void;
  district?: string;
  dashboardContext?: 'admin' | 'agent' | 'customer';
};

export default function RequestActions({ requestId, requestStatus, onUpdated, district, dashboardContext, customerId, assignedAgentId }: Props) {
  const [loading, setLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [initialOffer, setInitialOffer] = useState<{ amount?: number; tenureMonths?: number; interestRate?: number } | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; action: () => void } | null>(null);
  const auth = useAuth();
  const isSuper = auth.isSuperAdmin();
  const isDistrictAdmin = auth.isDistrictAdmin();
  const isAgent = auth.isAgent();
  const isCustomer = auth.isCustomer();
  const isAdmin = auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]);

  // Use the central permission matrix to compute available actions (handles multi-role users)
  const { primaryActions, secondaryActions, canAct } = useRequestActions({
    id: requestId,
    currentStatus: requestStatus as any,
    district: district || '',
    customerId: customerId || '',
    agentId: assignedAgentId ?? undefined
  });

  const primaryActionIds = useMemo(() => (primaryActions ?? []).map(a => a.id), [primaryActions]);

  // If no primaryActions are returned by engine, fall back to legacy ad-hoc rules
  const nextActions = useMemo(() => {
    if (primaryActions && primaryActions.length > 0) return primaryActions.map(a => a.id);
    const actions: string[] = [];
    
    // If dashboardContext is provided, only show actions for that context
    if (dashboardContext === 'customer') {
      // Customer actions
      if (isCustomer && requestStatus === REQUEST_STATUS.OFFER_SENT) {
        actions.push('accept-offer', 'decline-offer');
      }
    } else if (dashboardContext === 'agent') {
      // Agent actions only
      if (isAgent) {
        if (requestStatus === REQUEST_STATUS.INSPECTION_SCHEDULED) actions.push('start-inspection');
        if (requestStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS) actions.push('complete-inspection');
      }
    } else if (dashboardContext === 'admin') {
      // Admin actions only
      if (isAdmin) {
        if (requestStatus === REQUEST_STATUS.OFFER_ACCEPTED) actions.push('assign-agent');
        if ([REQUEST_STATUS.PENDING, REQUEST_STATUS.UNDER_REVIEW, REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.APPROVED].includes(requestStatus as REQUEST_STATUS)) actions.push('create-offer');
        if (requestStatus === REQUEST_STATUS.OFFER_SENT || requestStatus === REQUEST_STATUS.OFFER_DECLINED) actions.push('revise-offer');
      }
    } else {
      // No context specified - default behavior (show all applicable actions)
      // Customer actions (only when the user is strictly a customer, not an admin)
      if (!isAdmin && isCustomer && requestStatus === REQUEST_STATUS.OFFER_SENT) {
        actions.push('accept-offer', 'decline-offer');
      }

      // Agent actions (treat agent separately; don't allow admins to inherit agent-only UI)
      if (!isAdmin && isAgent) {
        if (requestStatus === REQUEST_STATUS.INSPECTION_SCHEDULED) actions.push('start-inspection');
        if (requestStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS) actions.push('complete-inspection');
      }

      // Admin actions (district admin & super)
      if (isAdmin) {
        if (requestStatus === REQUEST_STATUS.OFFER_ACCEPTED) actions.push('assign-agent');
        if ([REQUEST_STATUS.PENDING, REQUEST_STATUS.UNDER_REVIEW, REQUEST_STATUS.INSPECTION_COMPLETED, REQUEST_STATUS.APPROVED].includes(requestStatus as REQUEST_STATUS)) actions.push('create-offer');
        if (requestStatus === REQUEST_STATUS.OFFER_SENT || requestStatus === REQUEST_STATUS.OFFER_DECLINED) actions.push('revise-offer');
      }
    }

    // no primaryActions found; use legacy logic above
    return actions;
  }, [isCustomer, isAgent, isDistrictAdmin, isSuper, requestStatus, isAdmin, dashboardContext, primaryActions]);

  // Avoid showing role-specific actions while auth is initializing to prevent flashes
  if (auth.isLoading) return null;

  // All actions are rendered as responsive buttons

  async function fetchFullRequest() {
    try {
      const rjson = await api.get(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(requestId));
      if (rjson?.data?.request) return rjson.data.request;
      return null;
    } catch (err) {
      return null;
    }
  }

  async function createOffer(payload: { amount: number; tenureMonths: number; interestRate: number; penaltyPercentage: number; lateFeePercentage: number }) {
    const { amount, tenureMonths, interestRate, penaltyPercentage, lateFeePercentage } = payload;
    setLoading(true);
    try {
      const data = await api.post(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CREATE_OFFER(requestId), {
        amount, tenureMonths, interestRate, penaltyPercentage, lateFeePercentage
      });
      if (data) {
        // Normalize the response: backend returns { success, message, data: { request, history } }
        // but some clients return different shapes. Get the request safely; if not present, fetch full request.
        const updated = data?.data?.request || (data?.data || data);
        if (updated && updated.id) {
          onUpdated?.(updated);
        } else {
          // fallback: try to fetch full request from backend
          const full = await fetchFullRequest();
          if (full && full.id) onUpdated?.(full);
          else console.warn('createOffer: unexpected create response payload', data);
        }
        setShowOffer(false);
        setInitialOffer(null);
      }
    } catch (err: any) {
      console.error(err);
      setConfirmDialog({ open: true, title: 'Error', message: err?.message || 'Failed to create offer', action: () => setConfirmDialog(null) });
    } finally {
      setLoading(false);
    }
  }

  async function acceptOffer() {
    setLoading(true);
    try {
      const p = await api.post(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_STATUS(requestId), {
        status: REQUEST_STATUS.OFFER_ACCEPTED
      });
      if (p) {
        // re-fetch the full request (including requestHistory) to ensure UI shows latest history
        try {
          const rjson = await api.get(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(requestId));
          if (rjson?.data?.request) onUpdated?.(rjson.data.request);
          else onUpdated?.(p.data.request);
        } catch (err) {
          // fallback to returned partial request
          onUpdated?.(p.data.request);
        }
      }
      setConfirmDialog(null);
    } catch (e: any) {
      console.error(e);
      setConfirmDialog({ open: true, title: 'Error', message: e?.message || 'Failed to accept offer', action: () => setConfirmDialog(null) });
    } finally {
      setLoading(false);
    }
  }

  const handleAcceptOffer = () => {
    setConfirmDialog({
      open: true,
      title: 'Accept Offer',
      message: 'Are you sure you want to accept this loan offer? This action cannot be undone.',
      action: () => acceptOffer()
    });
  }

  async function rejectOffer() {
    setLoading(true);
    try {
      const p = await api.post(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_STATUS(requestId), {
        status: REQUEST_STATUS.OFFER_DECLINED
      });
      if (p) {
        try {
          const rjson = await api.get(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(requestId));
          if (rjson?.data?.request) onUpdated?.(rjson.data.request);
          else onUpdated?.(p.data.request);
        } catch (err) {
          onUpdated?.(p.data.request);
        }
      }
      setConfirmDialog(null);
    } catch (e: any) {
      console.error(e);
      setConfirmDialog({ open: true, title: 'Error', message: e?.message || 'Failed to reject offer', action: () => setConfirmDialog(null) });
    } finally {
      setLoading(false);
    }
  }

  const handleRejectOffer = () => {
    setConfirmDialog({
      open: true,
      title: 'Reject Offer',
      message: 'Are you sure you want to reject this loan offer? You can request a revised offer later.',
      action: () => rejectOffer()
    });
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
    } catch (e: any) {
      console.error(e);
      setConfirmDialog({ open: true, title: 'Error', message: e?.message || 'Failed to load current offer', action: () => setConfirmDialog(null) });
    } finally {
      setLoading(false);
    }
  }

  // Central handler to execute any action by id from workflow matrix
  async function runAction(actionId: string, opts?: any): Promise<boolean> {
    console.debug('RequestActions.runAction', actionId, opts ? { ...opts } : null);
    // Modal-like actions are handled by existing UI flows
    if (actionId === 'make-offer' || actionId === 'revise-offer') {
      setShowOffer(true);
      return false;
    }
    if (actionId === 'assign-agent' || actionId === 'reassign-agent') {
      // If opts include action input (agentId), treat as a direct execution call from the modal
      if (!opts || (!opts.agentId && !opts.inspectionDateTime)) {
        setShowAssign(true);
        return false;
      }
      // else fall-through to execute the action
    }

    setLoading(true);
    try {
      const ok = await executeRequestAction(actionId, {
        requestId,
        onSuccess: (data) => {
          // `data` may be: the full request object, or an envelope, or undefined.
          if (data && typeof data === 'object' && 'id' in data) {
            onUpdated?.(data);
          } else if (data && data.data && data.data.request && data.data.request.id) {
            onUpdated?.(data.data.request);
          } else {
            console.warn('RequestActions: ran action and received unexpected success payload', { actionId, data });
          }
        },
        onError: (errMsg: string) => {
          setConfirmDialog({ open: true, title: 'Error', message: errMsg, action: () => setConfirmDialog(null) });
        }
      }, opts);
      if (!ok) {
        // handled in execute
      }
      return ok;
    } catch (err) {
      console.error(err);
      setConfirmDialog({ open: true, title: 'Error', message: 'Network error', action: () => setConfirmDialog(null) });
      return false;
    } finally {
      setLoading(false);
    }
    return false;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Render primary actions (top 1-2) using the canonical `WorkflowAction` objects */}
      {primaryActions && primaryActions.length > 0 && primaryActions.map((action) => (
        <Button
          key={action.id}
          size="sm"
          title={action.description || action.label}
          onClick={() => {
            if (action.id === 'make-offer' || action.id === 'revise-offer') {
              openReviseOffer();
            } else if (action.id === 'assign-agent' || action.id === 'reassign-agent') {
              setShowAssign(true);
            } else if (action.requiresConfirmation) {
              setConfirmDialog({ open: true, title: action.label, message: action.description || `Confirm ${action.label}?`, action: async () => {
                await runAction(action.id);
                setConfirmDialog(null);
              }});
            } else {
              runAction(action.id);
            }
          }}
          variant={(action.variant as any) ?? 'default'}
          disabled={loading}
          className="shrink-0"
        >
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}

      {/* Secondary actions (overflow) */}
      {secondaryActions && secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="shrink-0">
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={() => {
                  if (action.id === 'make-offer' || action.id === 'revise-offer') {
                    openReviseOffer();
                  } else if (action.id === 'assign-agent' || action.id === 'reassign-agent') {
                    setShowAssign(true);
                  } else if (action.requiresConfirmation) {
                    setConfirmDialog({ open: true, title: action.label, message: action.description || `Confirm ${action.label}?`, action: async () => { await runAction(action.id); setConfirmDialog(null); }});
                  } else {
                    runAction(action.id);
                  }
                }}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {(!primaryActions || primaryActions.length === 0) && nextActions.includes('revise-offer') && (
        <Button 
          size="sm" 
          title="Revise existing offer" 
          onClick={openReviseOffer} 
          variant="outline" 
          disabled={loading}
          className="shrink-0"
        >
          <FilePlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Revise Offer</span>
        </Button>
      )}

      {(!primaryActions || primaryActions.length === 0) && nextActions.includes('assign-agent') && (
        <Button 
          size="sm" 
          title="Assign an agent" 
          onClick={() => setShowAssign(true)} 
          variant="outline" 
          disabled={loading || requestStatus === REQUEST_STATUS.INSPECTION_SCHEDULED}
          className="shrink-0"
        >
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Assign Agent</span>
        </Button>
      )}

      {(!primaryActions || primaryActions.length === 0) && nextActions.includes('accept-offer') && (
        <Button 
          size="sm" 
          title="Accept the admin offer" 
          onClick={handleAcceptOffer}
          variant="secondary" 
          disabled={loading}
          className="shrink-0"
        >
          <CheckCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Accept Offer</span>
        </Button>
      )}

      {(!primaryActions || primaryActions.length === 0) && nextActions.includes('decline-offer') && (
        <Button 
          size="sm" 
          title="Reject the admin offer" 
          onClick={handleRejectOffer}
          variant="destructive" 
          disabled={loading}
          className="shrink-0"
        >
          <XCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Reject Offer</span>
        </Button>
      )}

      {(!primaryActions || primaryActions.length === 0) && nextActions.includes('start-inspection') && (
        <Button 
          title="Start inspection" 
          size="sm"
            onClick={() => runAction('start-inspection')}
          variant="outline"
          className="shrink-0"
        >
          <Calendar className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Start Inspection</span>
        </Button>
      )}

      {(!primaryActions || primaryActions.length === 0) && nextActions.includes('complete-inspection') && (
        <Button 
          size="sm"
          title="Mark inspection complete" 
          onClick={() => runAction('complete-inspection')}
          variant="default"
          className="shrink-0"
        >
          <CheckCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Complete Inspection</span>
        </Button>
      )}





      <CreateOfferModal open={showOffer} onOpenChange={(v: boolean) => {
        setShowOffer(v);
        if (!v) setInitialOffer(null);
      }} onSubmit={createOffer} requestId={requestId} initialOffer={initialOffer ?? undefined} />
      <AssignAgentModal open={showAssign} onOpenChange={(v: boolean) => setShowAssign(v)} district={district} onSubmit={async (agentId: string, inspectionDate: string, inspectionTime: string) => {
        // Combine date & time into an iso string and run the canonical assign-agent action
        let inspectionDateTime: string | undefined = undefined;
        if (inspectionDate && inspectionTime) inspectionDateTime = new Date(`${inspectionDate}T${inspectionTime}`).toISOString();
        const ok = await runAction('assign-agent', { agentId, inspectionDateTime });
        if (ok) setShowAssign(false);
        return ok;
          }} />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={confirmDialog.action} disabled={loading}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
