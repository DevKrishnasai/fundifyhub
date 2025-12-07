'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Mutex hook for preventing concurrent actions
 * Prevents double-clicks and race conditions in action execution
 */

interface ActionLockState {
  /** Currently locked action ID */
  lockedAction: string | null;
  /** Whether any action is currently locked */
  isLocked: boolean;
  /** Timestamp when lock was acquired */
  lockAcquiredAt: number | null;
}

interface UseActionLockReturn {
  /** Currently locked action ID */
  lockedAction: string | null;
  /** Whether any action is currently locked */
  isLocked: boolean;
  /** Time elapsed since lock was acquired (ms) */
  lockDuration: number;
  /** Attempt to acquire lock for an action */
  acquireLock: (actionId: string) => boolean;
  /** Release the current lock */
  releaseLock: () => void;
  /** Execute a function with automatic lock management */
  withLock: <T>(actionId: string, fn: () => Promise<T>) => Promise<T | null>;
  /** Check if a specific action is locked */
  isActionLocked: (actionId: string) => boolean;
}

/** Maximum time an action can hold a lock (safety timeout) */
const LOCK_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Hook for managing action locks to prevent concurrent operations
 * 
 * @example
 * ```tsx
 * const { withLock, isLocked, lockedAction } = useActionLock();
 * 
 * const handleSubmit = async () => {
 *   const result = await withLock('submit-form', async () => {
 *     return await api.submitForm(data);
 *   });
 *   if (result) {
 *     toast.success('Submitted!');
 *   }
 * };
 * 
 * <Button disabled={isLocked} onClick={handleSubmit}>
 *   {lockedAction === 'submit-form' ? 'Submitting...' : 'Submit'}
 * </Button>
 * ```
 */
export function useActionLock(): UseActionLockReturn {
  const [state, setState] = useState<ActionLockState>({
    lockedAction: null,
    isLocked: false,
    lockAcquiredAt: null,
  });

  // Use ref for timeout to avoid stale closures
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Attempt to acquire a lock for an action
   * Returns true if lock was acquired, false if already locked
   */
  const acquireLock = useCallback((actionId: string): boolean => {
    // Check if already locked
    if (state.isLocked) {
      console.warn(`[useActionLock] Action "${actionId}" blocked - "${state.lockedAction}" is in progress`);
      return false;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Acquire the lock
    setState({
      lockedAction: actionId,
      isLocked: true,
      lockAcquiredAt: Date.now(),
    });

    // Set safety timeout to auto-release lock
    timeoutRef.current = setTimeout(() => {
      console.warn(`[useActionLock] Lock timeout - auto-releasing lock for "${actionId}"`);
      setState({
        lockedAction: null,
        isLocked: false,
        lockAcquiredAt: null,
      });
    }, LOCK_TIMEOUT_MS);

    return true;
  }, [state.isLocked, state.lockedAction]);

  /**
   * Release the current lock
   */
  const releaseLock = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState({
      lockedAction: null,
      isLocked: false,
      lockAcquiredAt: null,
    });
  }, []);

  /**
   * Execute a function with automatic lock management
   * Acquires lock before execution, releases after (success or failure)
   */
  const withLock = useCallback(async <T>(
    actionId: string,
    fn: () => Promise<T>
  ): Promise<T | null> => {
    if (!acquireLock(actionId)) {
      return null;
    }

    try {
      const result = await fn();
      return result;
    } catch (error) {
      // Re-throw the error after releasing lock
      throw error;
    } finally {
      releaseLock();
    }
  }, [acquireLock, releaseLock]);

  /**
   * Check if a specific action is currently locked
   */
  const isActionLocked = useCallback((actionId: string): boolean => {
    return state.isLocked && state.lockedAction === actionId;
  }, [state.isLocked, state.lockedAction]);

  /**
   * Calculate how long the current lock has been held
   */
  const lockDuration = state.lockAcquiredAt 
    ? Date.now() - state.lockAcquiredAt 
    : 0;

  return {
    lockedAction: state.lockedAction,
    isLocked: state.isLocked,
    lockDuration,
    acquireLock,
    releaseLock,
    withLock,
    isActionLocked,
  };
}

export default useActionLock;
