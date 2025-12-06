'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Optimistic update hook with automatic rollback on failure
 * Provides better UX by showing immediate feedback while API calls are in flight
 */

interface OptimisticState<T> {
  /** Whether an optimistic update is in progress */
  isPending: boolean;
  /** The data that was saved for rollback */
  rollbackData: T | null;
  /** Error from the last failed operation */
  lastError: Error | null;
}

interface ExecuteOptions {
  /** Callback on successful API completion */
  onSuccess?: () => void;
  /** Callback on error (after rollback) */
  onError?: (error: Error) => void;
  /** Whether to suppress console errors */
  silent?: boolean;
}

interface UseOptimisticUpdateReturn<T> {
  /** Whether an optimistic update is currently in progress */
  isPending: boolean;
  /** Whether rollback data is available */
  canRollback: boolean;
  /** Error from the last failed operation */
  lastError: Error | null;
  /** Execute an optimistic update with automatic rollback */
  execute: (
    currentData: T,
    optimisticData: T,
    setData: (data: T) => void,
    apiCall: () => Promise<T>,
    options?: ExecuteOptions
  ) => Promise<{ success: boolean; data?: T; error?: Error }>;
  /** Manually trigger rollback (if needed) */
  rollback: (setData: (data: T) => void) => void;
  /** Clear the last error */
  clearError: () => void;
}

/**
 * Hook for optimistic UI updates with automatic rollback
 * 
 * @example
 * ```tsx
 * const { execute, isPending } = useOptimisticUpdate<Request>();
 * 
 * const handleStatusUpdate = async (newStatus: string) => {
 *   const optimisticRequest = { ...request, currentStatus: newStatus };
 *   
 *   const result = await execute(
 *     request,           // Current data (for rollback)
 *     optimisticRequest, // Optimistic data (show immediately)
 *     setRequest,        // State setter
 *     () => api.updateStatus(request.id, newStatus), // API call
 *     {
 *       onSuccess: () => toast.success('Status updated!'),
 *       onError: (err) => toast.error(err.message),
 *     }
 *   );
 * };
 * ```
 */
export function useOptimisticUpdate<T>(): UseOptimisticUpdateReturn<T> {
  const [state, setState] = useState<OptimisticState<T>>({
    isPending: false,
    rollbackData: null,
    lastError: null,
  });

  // Track the current operation to prevent stale callbacks
  const operationRef = useRef<number>(0);

  /**
   * Execute an optimistic update with automatic rollback on failure
   */
  const execute = useCallback(async (
    currentData: T,
    optimisticData: T,
    setData: (data: T) => void,
    apiCall: () => Promise<T>,
    options: ExecuteOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: Error }> => {
    const { onSuccess, onError, silent = false } = options;
    const operationId = ++operationRef.current;

    // Store rollback data and apply optimistic update
    setState({
      isPending: true,
      rollbackData: currentData,
      lastError: null,
    });

    // Apply optimistic update immediately
    setData(optimisticData);

    try {
      // Execute the actual API call
      const result = await apiCall();

      // Check if this is still the current operation
      if (operationRef.current !== operationId) {
        return { success: false, error: new Error('Operation superseded') };
      }

      // Update with real data from server
      setData(result);

      // Clear pending state
      setState({
        isPending: false,
        rollbackData: null,
        lastError: null,
      });

      onSuccess?.();

      return { success: true, data: result };
    } catch (error) {
      // Check if this is still the current operation
      if (operationRef.current !== operationId) {
        return { success: false, error: new Error('Operation superseded') };
      }

      const err = error instanceof Error ? error : new Error(String(error));

      // Rollback to original data
      setData(currentData);

      // Update state with error
      setState({
        isPending: false,
        rollbackData: null,
        lastError: err,
      });

      if (!silent) {
        console.error('[useOptimisticUpdate] Operation failed, rolled back:', err);
      }

      onError?.(err);

      return { success: false, error: err };
    }
  }, []);

  /**
   * Manually trigger rollback (for edge cases)
   */
  const rollback = useCallback((setData: (data: T) => void) => {
    if (state.rollbackData !== null) {
      setData(state.rollbackData);
      setState({
        isPending: false,
        rollbackData: null,
        lastError: null,
      });
    }
  }, [state.rollbackData]);

  /**
   * Clear the last error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  return {
    isPending: state.isPending,
    canRollback: state.rollbackData !== null,
    lastError: state.lastError,
    execute,
    rollback,
    clearError,
  };
}

export default useOptimisticUpdate;
