'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket, useSocketEvent, useToast } from '@/hooks';
import { getWithResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { ServerEvent, type RequestUpdatedPayload, type RequestStatusChangedPayload, type CommentAddedPayload, type DocumentUploadedPayload } from '@fundifyhub/types';
import type { RequestType } from '@fundifyhub/types';

// API response type
interface GetRequestResponse {
  request: RequestType;
}

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
  
  const [request, setRequest] = useState<RequestType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Data Fetching Logic
  const loadRequest = useCallback(async () => {
    try {
      const result = await getWithResult<GetRequestResponse>(BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(requestId));
      if (result.ok) {
        setRequest(result.data.request);
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to load request');
      }
    } catch (err) {
      setError('Network error while loading request');
    }
  }, [requestId]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function init() {
      setIsLoading(true);
      await loadRequest();
      if (mounted) setIsLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, [loadRequest]);

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

  // 3. Real-time Event Listeners
  // When status changes, we reload the data and show a toast
  useSocketEvent<RequestUpdatedPayload>(
    ServerEvent.REQUEST_UPDATED,
    (data) => {
      console.log('[RequestContext] Received REQUEST_UPDATED:', data);
      if (data.requestId === requestId) {
        console.log('[RequestContext] Request matches, reloading...');
        loadRequest().then(() => {
          if (data.status && data.status !== request?.currentStatus) {
            toastSuccess(data.message || `Status changed to ${data.status}`);
          }
        });
      }
    },
    [requestId, request?.currentStatus, loadRequest, toastSuccess]
  );

  // Listen for status changes
  useSocketEvent<RequestStatusChangedPayload>(
    ServerEvent.REQUEST_STATUS_CHANGED,
    (data) => {
      console.log('[RequestContext] Received REQUEST_STATUS_CHANGED:', data);
      if (data.requestId === requestId) {
        console.log('[RequestContext] Request matches, reloading...');
        loadRequest().then(() => {
          toastSuccess(`Status changed to ${data.newStatus.replace(/_/g, ' ')}`);
        });
      }
    },
    [requestId, loadRequest, toastSuccess]
  );

  // Reload on comments or documents
  useSocketEvent<CommentAddedPayload>(ServerEvent.REQUEST_COMMENT_ADDED, (data) => {
    if (data.requestId === requestId) loadRequest();
  }, [requestId, loadRequest]);

  useSocketEvent<DocumentUploadedPayload>(ServerEvent.REQUEST_DOCUMENT_UPLOADED, (data) => {
    if (data.requestId === requestId) loadRequest();
  }, [requestId, loadRequest]);

  const value = {
    request,
    isLoading,
    error,
    refresh: loadRequest,
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
