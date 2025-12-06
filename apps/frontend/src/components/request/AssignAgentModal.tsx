"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AlertCircle, Loader2, UserCheck, Calendar, CalendarClock } from 'lucide-react';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { api, getWithResult, getErrorMessage } from '@/lib/api-client';

interface AssignAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (agentId: string, inspectionDate: string) => Promise<boolean> | boolean;
  district?: string;
  isReschedule?: boolean;
}

export default function AssignAgentModal({ open, onOpenChange, onSubmit, district, isReschedule = false }: AssignAgentModalProps) {
  const [agentId, setAgentId] = React.useState('');
  const [inspectionDate, setInspectionDate] = React.useState('');
  const [agents, setAgents] = React.useState<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>>([]);
  const [loadingAgents, setLoadingAgents] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadAgents = React.useCallback(async () => {
    if (!open) return;
    if (!district) return;
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
        // Set first agent as default if none selected
        setAgentId((current) => (!current && list.length > 0 && list[0]) ? list[0].id : current);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch agents'));
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

  // Get tomorrow's date for min value
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReschedule ? (
              <>
                <CalendarClock className="h-5 w-5 text-primary" />
                Reschedule Inspection
              </>
            ) : (
              <>
                <UserCheck className="h-5 w-5 text-primary" />
                Assign Agent
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isReschedule
              ? 'Select an agent and schedule a new inspection date for this request.'
              : 'Select a field agent and schedule the inspection date for this request.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {district ? (
            <>
              {loadingAgents ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading available agents...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Unable to load agents</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              ) : agents.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="agent-select" className="text-sm font-medium">
                    Field Agent <span className="text-destructive">*</span>
                  </Label>
                  <Select value={agentId} onValueChange={(v: string) => setAgentId(v)}>
                    <SelectTrigger id="agent-select" className="w-full">
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {`${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || a.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {agents.length} agent{agents.length !== 1 ? 's' : ''} available in {district}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">No agents available in {district}.</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No district specified for this request. Cannot load agents.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inspection-date" className="text-sm font-medium">
              <Calendar className="h-4 w-4 inline mr-1" />
              Inspection Date <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="inspection-date"
              type="date" 
              value={inspectionDate} 
              onChange={(e) => setInspectionDate(e.target.value)}
              min={minDateStr}
            />
            <p className="text-xs text-muted-foreground">
              Schedule when the agent should visit for inspection.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={async () => { 
              if (agentId.trim() && inspectionDate) {
                try {
                  setSubmitting(true);
                  const ok = await onSubmit(agentId.trim(), inspectionDate);
                  if (ok) {
                    handleClose();
                  } else {
                    setError(isReschedule ? 'Failed to reschedule inspection. Please try again.' : 'Failed to assign agent. Please try again.');
                  }
                } catch (err: unknown) {
                  setError(getErrorMessage(err, isReschedule ? 'Failed to reschedule inspection' : 'Failed to assign agent'));
                }
                finally { setSubmitting(false); }
              }
            }} 
            disabled={agents.length === 0 || !agentId || !inspectionDate || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isReschedule ? 'Rescheduling...' : 'Assigning...'}
              </>
            ) : (
              isReschedule ? 'Reschedule Inspection' : 'Assign & Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
