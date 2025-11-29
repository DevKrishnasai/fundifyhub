"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { api, getWithResult } from '@/lib/api-client';

export default function AssignAgentModal({ open, onOpenChange, onSubmit, district }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (agentId: string, inspectionDate: string) => Promise<boolean> | boolean; district?: string; }) {
  const [agentId, setAgentId] = React.useState('');
  const [inspectionDate, setInspectionDate] = React.useState('');
  const [agents, setAgents] = React.useState<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>>([]);
  // manualMode removed: only dropdown selection is supported
  // removed query/search; we now show a simple dropdown of available agents
  const [loadingAgents, setLoadingAgents] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadAgents = React.useCallback(async () => {
    if (!open) return;
    if (!district) return; // if no district provided, we won't fetch
    setLoadingAgents(true);
    setError(null);
    try {
      const resp = await getWithResult<{ agents: Array<{ id: string; firstName?: string; lastName?: string; email?: string }> }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_AGENTS_BY_DISTRICT(district.trim())
      );
      if (!resp.ok) {
        setError(resp.error?.message || `Failed to fetch agents (status ${resp.status || 'unknown'})`);
        setAgents([]);
      } else {
        const list = Array.isArray(resp.data?.agents) ? resp.data.agents : [];
        setAgents(list);
        // If no agent has been selected yet, auto-select the first agent to improve UX
        if (!agentId && list.length > 0) setAgentId(list[0].id);
      }
      if (process.env.NODE_ENV === 'development') {
        console.debug('AssignAgentModal: district=', district, 'resp=', resp)
      }
    } catch (err: any) {
      setError(err?.message || String(err));
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  }, [open, district]);

  React.useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  function handleClose() {
    setAgentId('');
    setInspectionDate('');
    setAgents([]);
    setError(null);
    onOpenChange(false);
  }

  const filteredAgents = agents; // simple mapping; all agents are listed in the dropdown

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Assign Agent to Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {district ? (
            <>
                  {loadingAgents ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading agents...</p>
                </div>
                  ) : error ? (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive">Could not load agents: {error}</p>
                  <p className="text-xs text-muted-foreground mt-1">No agents are available for this district.</p>
                </div>
              ) : agents.length > 0 ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium mb-1.5">Select Agent</label>
                  <div>
                    <Select value={agentId} onValueChange={(v: string) => setAgentId(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an agent" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {filteredAgents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{`${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || a.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                  No agents found for this district.
                </div>
              )}
              
              {/* If there are no agents, the UI shows a message above — manual entry is not supported per product UX */}
            </>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">No district specified for this request. Cannot load agents.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Inspection Date</label>
              <Input 
                type="date" 
                value={inspectionDate} 
                onChange={(e) => setInspectionDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            type="button" 
            variant="default" 
            onClick={async () => { 
              if (agentId.trim() && inspectionDate) {
                console.debug('AssignAgentModal: submitting agent=', agentId, 'date', inspectionDate);
                try {
                  setSubmitting(true);
                  const ok = await onSubmit(agentId.trim(), inspectionDate);
                  if (ok) {
                    // only close modal on success
                    handleClose();
                  } else {
                    // keep modal open; show a friendly inline error
                    setError('Failed to assign agent. Please try again.');
                  }
                } catch (err: any) {
                  setError(err?.message || String(err) || 'Failed to assign agent');
                }
                finally { setSubmitting(false); }
              }
            }} 
            disabled={agents.length === 0 || !agentId || !inspectionDate || submitting}
          >
            Assign Agent & Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
