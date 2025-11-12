"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../dialog';
import { Button } from '../button';
import { Input } from '../input';

export default function AssignAgentModal({ open, onOpenChange, onSubmit, district }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (agentId: string) => void; district?: string; }) {
  const [agentId, setAgentId] = React.useState('');
  const [agents, setAgents] = React.useState<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>>([]);
  const [query, setQuery] = React.useState('');
  const [loadingAgents, setLoadingAgents] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function loadAgents() {
      if (!open) return;
      if (!district) return; // if no district provided, we won't fetch
      setLoadingAgents(true);
      setError(null);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/agents?district=${encodeURIComponent(district)}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || 'Failed to fetch agents');
        }
        const body = await res.json();
        if (mounted) setAgents(body.data?.agents || []);
      } catch (err: any) {
        // fallback: clear agents and let user enter id manually
        if (mounted) setError(err?.message || String(err));
      } finally {
        if (mounted) setLoadingAgents(false);
      }
    }
    loadAgents();
    return () => { mounted = false; };
  }, [open, district]);

  function handleClose() {
    setAgentId('');
    setAgents([]);
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Agent</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {district ? (
            <div>
              <label className="block text-sm font-medium">Select Agent (district: {district})</label>
              {loadingAgents ? (
                <div>Loading agents...</div>
              ) : error ? (
                <div className="text-sm text-red-600">Could not load agents: {error}</div>
              ) : agents.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium">Search agents</label>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" />
                  <div className="mt-2 text-sm text-muted-foreground">{agents.length} agents found</div>
                  <div className="mt-2 max-h-48 overflow-auto border rounded">
                    {agents.filter(a => {
                      const hay = `${a.firstName || ''} ${a.lastName || ''} ${a.email || ''} ${a.id}`.toLowerCase();
                      return hay.includes(query.toLowerCase());
                    }).map((a) => (
                      <div key={a.id} className={`p-2 flex items-center justify-between hover:bg-gray-50 ${agentId === a.id ? 'bg-gray-100' : ''}`}>
                        <div>
                          <div className="font-medium">{(a.firstName || '') + ' ' + (a.lastName || '')}</div>
                          <div className="text-sm text-muted-foreground">{a.email || a.id}</div>
                        </div>
                        <div>
                          <Button variant={agentId === a.id ? 'secondary' : 'default'} onClick={() => setAgentId(a.id)}>{agentId === a.id ? 'Selected' : 'Select'}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No agents found for this district. You may enter an Agent ID manually below.</div>
              )}
              <div className="mt-2">
                <label className="block text-sm font-medium">Or enter Agent Id</label>
                <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium">Agent Id</label>
              <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="button" variant="default" onClick={() => { onSubmit(agentId); handleClose(); }} disabled={!agentId}>Assign</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
