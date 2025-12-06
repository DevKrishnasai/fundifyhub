'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent, useToast } from '@/hooks';
import { ServerEvent, type RequestUpdatedPayload, type RequestStatusChangedPayload, type CommentAddedPayload, type DocumentUploadedPayload } from '@fundifyhub/types';
import type { RequestType } from '@fundifyhub/types';
import { useRequest as useRequestQuery, requestKeys } from '@/hooks/queries/useRequests';
import { useQueryClient } from '@tanstack/react-query';

// Define the shape of our context
interface RequestContextType {
  request: RequestType | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isConnected: boolean;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

interface RequestProviderProps {
  requestId: string;
  children: React.ReactNode;
}

export function RequestProvider({ requestId, children }: RequestProviderProps) {
  const { isConnected, joinRequest, leaveRequest } = useSocket();
  const { success: toastSuccess } = useToast();
  const queryClient = useQueryClient();
  
  // Use React Query hook
  const { 
    data: request, 
    isLoading, 
    error: queryError, 
    refetch 
  } = useRequestQuery(requestId);

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load request') : null;

  // Wrapper for refresh to match interface
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // 2. Socket Connection Logic
  useEffect(() => {
    if (isConnected && requestId) {
      joinRequest(requestId);
    }
    return () => {
      if (isConnected && requestId) {
        leaveRequest(requestId);
      }
    };
  }, [isConnected, requestId, joinRequest, leaveRequest]);

  // Helper to invalidate query
  const invalidateRequest = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
  }, [queryClient, requestId]);

  // 3. Real-time Event Listeners
  // When status changes, we reload the data and show a toast
  useSocketEvent<RequestUpdatedPayload>(
    ServerEvent.REQUEST_UPDATED,
    (data) => {
      console.log('[RequestContext] Received REQUEST_UPDATED:', data);
      if (data.requestId === requestId) {
        console.log('[RequestContext] Request matches, reloading...');
        invalidateRequest();
        
        // Compare stage/subStatus for change detection
        const stageChanged = data.stage && request && data.stage !== request.stage;
        const subStatusChanged = data.subStatus && request && data.subStatus !== request.subStatus;
        // Fallback to legacy status comparison for backwards compat
        const statusChanged = data.status && request && data.status !== request.currentStatus;
        
        if (stageChanged || subStatusChanged || statusChanged) {
          toastSuccess(data.message || `Status changed to ${data.stage || data.status}`);
        }
      }
    },
    [requestId, request, invalidateRequest, toastSuccess]
  );

  // Listen for status changes
  useSocketEvent<RequestStatusChangedPayload>(
    ServerEvent.REQUEST_STATUS_CHANGED,
    (data) => {
      console.log('[RequestContext] Received REQUEST_STATUS_CHANGED:', data);
      if (data.requestId === requestId) {
        console.log('[RequestContext] Request matches, reloading...');
        invalidateRequest();
        toastSuccess(`Status changed to ${data.newStatus.replace(/_/g, ' ')}`);
      }
    },
    [requestId, invalidateRequest, toastSuccess]
  );

  // Reload on comments or documents
  useSocketEvent<CommentAddedPayload>(ServerEvent.REQUEST_COMMENT_ADDED, (data) => {
    if (data.requestId === requestId) invalidateRequest();
  }, [requestId, invalidateRequest]);

  useSocketEvent<DocumentUploadedPayload>(ServerEvent.REQUEST_DOCUMENT_UPLOADED, (data) => {
    if (data.requestId === requestId) invalidateRequest();
  }, [requestId, invalidateRequest]);

  const value = {
    request: request || null,
    isLoading,
    error,
    refresh,
    isConnected
  };

  return (
    <RequestContext.Provider value={value}>
      {children}
    </RequestContext.Provider>
  );
}

// Custom hook for consuming the context
export function useRequest() {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useRequest must be used within a RequestProvider');
  }
  return context;
}
