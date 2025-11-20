"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { REQUEST_STATUS, ROLES } from '@fundifyhub/types';
import { useRouter } from 'next/navigation';
import RequestActions from '@/components/request/RequestActions';

type Doc = { id: string; url?: string | null; fileName?: string | null };
type HistoryItem = { id: string; createdAt: string; action: string; actorId?: string | null; metadata?: any };

type RequestDetail = {
  id: string;
  requestNumber?: string | null;
  currentStatus: string;
  requestedAmount: number;
  district: string;
  assignedAgentId?: string | null;
  documents?: Doc[];
  requestHistory?: HistoryItem[];
  comments?: Array<{ id: string; content: string; createdAt: string; author?: { id?: string; firstName?: string; lastName?: string; roles?: string[] } }>;
};

export default function RequestDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${id}`, { credentials: 'include' });
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        if (res.ok) {
          if (mounted) setRequest(data.data.request as RequestDetail);
        } else {
          alert(data.message || 'Failed to load request');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        alert('Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // Light polling for admins when offer is active/rejected so they see history & actions after customer acts
    let poll: number | null = null;
    if (auth && auth.hasRole && auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]) ) {
      poll = window.setInterval(async () => {
        try {
          // only poll while viewing offer-sent or offer-declined states
          if (!mounted || !request) return;
          if ([REQUEST_STATUS.OFFER_SENT, REQUEST_STATUS.OFFER_DECLINED].includes(request.currentStatus as REQUEST_STATUS)) {
            const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${id}`, { credentials: 'include' });
            if (r.ok) {
              const data = await r.json();
              if (mounted) setRequest(data.data.request as RequestDetail);
            }
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 8000);
    }
    return () => { mounted = false; if (poll) clearInterval(poll); };
  }, [id, router, auth, request]);

  if (loading) return <div>Loading...</div>;
  if (!request) return <div>Request not found</div>;

  // Build timeline events: combine requestHistory and comments, sort descending (latest first)
  const timelineEvents: Array<{
    id: string;
    date: string;
    type: 'history' | 'comment';
    title: string;
    actor?: { id?: string; firstName?: string; lastName?: string; roles?: string[] } | null;
    roleLabel?: string;
    description?: string;
    raw?: any;
  }> = [];

  (request.requestHistory || []).forEach((h: any) => {
    let actor = (h as any).actor || null;
    let roleLabel = undefined;
    if (actor && Array.isArray(actor.roles)) {
      if (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN)) roleLabel = 'Admin';
      else if (actor.roles.includes(ROLES.AGENT)) roleLabel = 'Agent';
      // customers or other roles: no roleLabel (display just name)
    }
    // Use shared helper to compute label and format metadata
    // (keeps UI consistent and easy to update)
    // eslint-disable-next-line
    const { getActionLabel, formatMetadata } = require('@/lib/actionLabels');
    const title = getActionLabel(String(h.action || ''));
    const metadataEntries = formatMetadata(h.metadata);
    timelineEvents.push({ id: `h-${h.id}`, date: h.createdAt, type: 'history', title, actor, roleLabel, description: metadataEntries, raw: h });
  });

  // include comments (show all comments; internal comments may be filtered by API)
  // comments may be on request.comments included by the backend
  ((request as any).comments || []).forEach((c: any) => {
    const actor = c.author || null;
    let roleLabel: string | undefined = undefined;
    if (actor && Array.isArray(actor.roles)) {
      if (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN)) roleLabel = 'Admin';
      else if (actor.roles.includes(ROLES.AGENT)) roleLabel = 'Agent';
      // customers: omit role label
    }
    timelineEvents.push({ id: `c-${c.id}`, date: c.createdAt, type: 'comment', title: 'Comment', actor, roleLabel, description: c.content, raw: c });
  });

  // sort descending (latest first)
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Request {request.requestNumber || request.id}</h1>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <p><strong>Status:</strong> {request.currentStatus}</p>
          <p><strong>Amount:</strong> {request.requestedAmount}</p>
          <p><strong>District:</strong> {request.district}</p>
          <p><strong>Assigned Agent:</strong> {request.assignedAgentId || '—'}</p>
        </div>
        <div>
          <RequestActions requestId={id} requestStatus={request.currentStatus} district={request.district} onUpdated={(r) => setRequest(r as RequestDetail)} />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Documents</h2>
        <ul>
          {Array.isArray(request.documents) && request.documents.map((d: Doc) => (
            <li key={d.id}><a href={d.url || '#'} target="_blank" rel="noreferrer">{d.fileName || d.id}</a></li>
          ))}
        </ul>
      </section>

      {/* EMI Snapshot panel (admin-offer preview stored on request) */}
      {((request as any).adminEmiSchedule) ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">EMI Schedule (Admin Snapshot)</h2>
          <div className="mt-3 overflow-auto">
            {(() => {
              const emi = (request as any).adminEmiSchedule as any;
              if (!emi || !Array.isArray(emi.emiSchedule)) return <div className="text-sm text-muted-foreground">No EMI schedule available.</div>;
              return (
                <table className="w-full text-sm table-auto border-collapse">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">#</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2">Payment</th>
                      <th className="p-2">Principal</th>
                      <th className="p-2">Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emi.emiSchedule.map((r: any) => (
                      <tr key={r.installment} className="border-t">
                        <td className="p-2">{r.installment}</td>
                        <td className="p-2">{new Date(r.paymentDate).toLocaleDateString()}</td>
                        <td className="p-2">{Number(r.paymentAmount).toLocaleString()}</td>
                        <td className="p-2">{Number(r.principal).toLocaleString()}</td>
                        <td className="p-2">{Number(r.interest).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <div className="mt-3 space-y-3">
          {timelineEvents.map(ev => (
            <div key={ev.id} className="p-3 border rounded bg-muted/5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {ev.title} {ev.roleLabel ? <span className="ml-2 text-xs text-muted-foreground">({ev.roleLabel})</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {ev.type === 'comment' ? (
                  <>
                    <div><strong>{ev.actor ? `${ev.actor.firstName || ''} ${ev.actor.lastName || ''}`.trim() : 'Unknown'}</strong></div>
                    <div className="mt-1">{ev.description}</div>
                  </>
                ) : (
                  <>
                    <div><strong>{ev.actor ? `${ev.actor.firstName || ''} ${ev.actor.lastName || ''}`.trim() : 'System'}</strong>{ev.roleLabel ? ` — ${ev.roleLabel}` : ''}</div>
                    <div className="mt-1">
                      {/* description is now an array of metadata entries */}
                      {Array.isArray(ev.description) && ev.description.length > 0 ? (
                        <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground">
                          {(ev.description as Array<{ key: string; value: string }> ).map(m => (
                            <li key={m.key}><strong>{m.key}:</strong> {m.value}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-1 text-sm text-muted-foreground">No details</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {timelineEvents.length === 0 && <div className="text-sm text-muted-foreground">No events yet.</div>}
        </div>
      </section>
    </div>
  );
}
