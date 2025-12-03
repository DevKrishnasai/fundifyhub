'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useRequest } from './RequestContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks';
import { executeRequestAction, type ActionInput } from '@/lib/request-actions';
import { WorkflowEngine } from '@fundifyhub/utils';
import type { WorkflowActionConfig, WorkflowContext } from '@fundifyhub/types';

// Define the shape of our context
interface RequestActionContextType {
  // State
  availableActions: Array<WorkflowActionConfig & { id: string }>;
  isActionLoading: boolean;
  activeActionId: string | null; // The ID of the action currently being performed/modal open
  
  // Methods
  openAction: (actionId: string) => void;
  closeAction: () => void;
  executeAction: (actionId: string, input?: ActionInput) => Promise<boolean>;
}

const RequestActionContext = createContext<RequestActionContextType | undefined>(undefined);

export function RequestActionProvider({ children }: { children: React.ReactNode }) {
  const { request, refresh } = useRequest();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 1. Calculate Available Actions using the Engine
  // This replaces the massive switch statements and manual checks
  const availableActions = useMemo(() => {
    if (!request || !user) return [];

    const context: WorkflowContext = {
      user: {
        id: user.id,
        roles: user.roles || [],
        districts: user.districts,
      },
      request: {
        ...request,
        amount: request.requestedAmount,
      } as any
    };

    return WorkflowEngine.getAvailableActions(context);
  }, [request, user]);

  // 2. Handle Opening Action Modals
  const openAction = useCallback((actionId: string) => {
    setActiveActionId(actionId);
  }, []);

  const closeAction = useCallback(() => {
    setActiveActionId(null);
  }, []);

  // 3. Execute Actions (API Calls)
  const executeAction = useCallback(async (actionId: string, input?: ActionInput): Promise<boolean> => {
    if (!request) return false;
    
    setIsActionLoading(true);
    try {
      // We reuse the existing executeRequestAction from lib/request-actions
      // Ideally, we would refactor that too, but let's keep it for now to minimize breakage
      const success = await executeRequestAction(actionId, {
        requestId: request.id,
        onSuccess: async () => {
          await refresh();
          toastSuccess('Action completed successfully');
          closeAction();
        },
        onError: (msg) => {
          toastError(msg || 'Action failed');
        }
      }, input);

      return success;
    } catch (err) {
      toastError('An unexpected error occurred');
      return false;
    } finally {
      setIsActionLoading(false);
    }
  }, [request, refresh, toastSuccess, toastError, closeAction]);

  const value = {
    availableActions,
    isActionLoading,
    activeActionId,
    openAction,
    closeAction,
    executeAction
  };

  return (
    <RequestActionContext.Provider value={value}>
      {children}
    </RequestActionContext.Provider>
  );
}

export function useRequestActions() {
  const context = useContext(RequestActionContext);
  if (context === undefined) {
    throw new Error('useRequestActions must be used within a RequestActionProvider');
  }
  return context;
}
