'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for detecting when data has been modified externally (by another user/tab)
 * Uses updatedAt timestamp comparison to detect conflicts
 */

interface UseStaleDetectionOptions {
  /** Whether to auto-acknowledge stale state when data is refreshed */
  autoAcknowledge?: boolean;
  /** Callback when stale state is detected */
  onStaleDetected?: (serverVersion: string, localVersion: string) => void;
}

interface UseStaleDetectionReturn {
  /** Whether the current data is stale (modified externally) */
  isStale: boolean;
  /** The server's version timestamp */
  serverVersion: string | null;
  /** Acknowledge the stale state (dismiss the warning) */
  acknowledgeStale: () => void;
  /** Update the tracked version (call after refresh) */
  updateVersion: (newVersion: string) => void;
  /** Reset the tracking state */
  reset: () => void;
}

/**
 * Hook for detecting stale data due to concurrent modifications
 * 
 * @example
 * ```tsx
 * const { isStale, acknowledgeStale, updateVersion } = useStaleDetection(
 *   request?.updatedAt,
 *   { onStaleDetected: () => toast.warning('Data was updated by someone else') }
 * );
 * 
 * // After fetching new data
 * const refreshData = async () => {
 *   const newData = await fetchRequest();
 *   setRequest(newData);
 *   updateVersion(newData.updatedAt);
 * };
 * 
 * {isStale && (
 *   <Alert>
 *     Data changed. <Button onClick={refreshData}>Refresh</Button>
 *   </Alert>
 * )}
 * ```
 */
export function useStaleDetection(
  currentVersion: string | null | undefined,
  options: UseStaleDetectionOptions = {}
): UseStaleDetectionReturn {
  const { autoAcknowledge = false, onStaleDetected } = options;

  const [isStale, setIsStale] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  
  // Track the initial version to compare against
  const initialVersionRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Initialize tracking on first valid version
  useEffect(() => {
    if (currentVersion && !hasInitializedRef.current) {
      initialVersionRef.current = currentVersion;
      setServerVersion(currentVersion);
      hasInitializedRef.current = true;
    }
  }, [currentVersion]);

  // Detect version changes after initialization
  useEffect(() => {
    if (!hasInitializedRef.current || !currentVersion) return;

    // If version changed from what we're tracking
    if (serverVersion && currentVersion !== serverVersion) {
      // This is a change from external source
      setIsStale(true);
      setServerVersion(currentVersion);
      
      onStaleDetected?.(currentVersion, serverVersion);

      if (autoAcknowledge) {
        // Auto-acknowledge after a brief delay
        const timeout = setTimeout(() => {
          setIsStale(false);
        }, 5000);
        return () => clearTimeout(timeout);
      }
    }
  }, [currentVersion, serverVersion, autoAcknowledge, onStaleDetected]);

  /**
   * Acknowledge the stale state (user dismisses warning)
   */
  const acknowledgeStale = useCallback(() => {
    setIsStale(false);
  }, []);

  /**
   * Update the tracked version (call after intentional refresh)
   */
  const updateVersion = useCallback((newVersion: string) => {
    setServerVersion(newVersion);
    initialVersionRef.current = newVersion;
    setIsStale(false);
  }, []);

  /**
   * Reset tracking state (for re-initialization)
   */
  const reset = useCallback(() => {
    setIsStale(false);
    setServerVersion(null);
    initialVersionRef.current = null;
    hasInitializedRef.current = false;
  }, []);

  return {
    isStale,
    serverVersion,
    acknowledgeStale,
    updateVersion,
    reset,
  };
}

export default useStaleDetection;
