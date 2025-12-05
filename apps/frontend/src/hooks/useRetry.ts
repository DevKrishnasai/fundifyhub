'use client';

import { useCallback, useRef } from 'react';

/**
 * Hook for retry logic with exponential backoff
 * Provides resilient network operations
 */

interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable (default: all errors) */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** Callback on final failure */
  onFinalFailure?: (error: Error, attempts: number) => void;
}

interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result data (if successful) */
  data?: T;
  /** The error (if failed) */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
}

interface UseRetryReturn {
  /** Execute a function with retry logic */
  executeWithRetry: <T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ) => Promise<RetryResult<T>>;
  /** Cancel any pending retry operation */
  cancel: () => void;
  /** Whether a retry operation is currently in progress */
  isRetrying: boolean;
}

// Default retry options
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'onFinalFailure' | 'shouldRetry'>> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

// HTTP status codes that should not be retried
const NON_RETRYABLE_CODES = [400, 401, 403, 404, 422];

/**
 * Type guard to check if error has a status property
 */
function hasStatusProperty(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

/**
 * Default function to determine if an error should be retried
 */
function defaultShouldRetry(error: Error): boolean {
  // Check for HTTP status in error message or properties
  const statusMatch = error.message.match(/status[:\s]*(\d{3})/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (NON_RETRYABLE_CODES.includes(status)) {
      return false;
    }
  }

  // Check for specific error properties using type guard
  if (hasStatusProperty(error)) {
    if (NON_RETRYABLE_CODES.includes(error.status)) {
      return false;
    }
  }

  // Retry network errors, timeouts, and 5xx errors
  return true;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  // Exponential backoff: baseDelay * multiplier^attempt
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Hook for executing operations with retry logic
 * 
 * @example
 * ```tsx
 * const { executeWithRetry, isRetrying, cancel } = useRetry();
 * 
 * const fetchData = async () => {
 *   const result = await executeWithRetry(
 *     () => api.getData(),
 *     {
 *       maxAttempts: 5,
 *       onRetry: (error, attempt, delay) => {
 *         console.log(`Retry ${attempt}, waiting ${delay}ms`);
 *       },
 *       onFinalFailure: (error, attempts) => {
 *         toast.error(`Failed after ${attempts} attempts`);
 *       }
 *     }
 *   );
 *   
 *   if (result.success) {
 *     setData(result.data);
 *   }
 * };
 * ```
 */
export function useRetry(): UseRetryReturn {
  // Track if we should cancel pending retries
  const cancelledRef = useRef(false);
  const isRetryingRef = useRef(false);

  /**
   * Execute a function with retry logic
   */
  const executeWithRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> => {
    const {
      maxAttempts = DEFAULT_OPTIONS.maxAttempts,
      baseDelay = DEFAULT_OPTIONS.baseDelay,
      maxDelay = DEFAULT_OPTIONS.maxDelay,
      backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
      shouldRetry = defaultShouldRetry,
      onRetry,
      onFinalFailure,
    } = options;

    cancelledRef.current = false;
    isRetryingRef.current = true;
    let lastError: Error | null = null;
    let attempts = 0;

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Check if cancelled
        if (cancelledRef.current) {
          return {
            success: false,
            error: new Error('Operation cancelled'),
            attempts: attempt - 1,
          };
        }

        attempts = attempt;

        try {
          const result = await fn();
          return {
            success: true,
            data: result,
            attempts,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Check if we should retry
          if (attempt < maxAttempts && shouldRetry(lastError, attempt)) {
            const delay = calculateDelay(attempt, baseDelay, maxDelay, backoffMultiplier);
            
            onRetry?.(lastError, attempt, delay);
            
            // Wait before retrying
            await new Promise<void>((resolve) => {
              const timeout = setTimeout(resolve, delay);
              // Allow cancellation during wait
              const checkCancel = setInterval(() => {
                if (cancelledRef.current) {
                  clearTimeout(timeout);
                  clearInterval(checkCancel);
                  resolve();
                }
              }, 100);
            });
          } else {
            // No more retries
            break;
          }
        }
      }

      // All retries exhausted
      if (lastError) {
        onFinalFailure?.(lastError, attempts);
      }

      return {
        success: false,
        error: lastError || new Error('Unknown error'),
        attempts,
      };
    } finally {
      isRetryingRef.current = false;
    }
  }, []);

  /**
   * Cancel any pending retry operation
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return {
    executeWithRetry,
    cancel,
    isRetrying: isRetryingRef.current,
  };
}

export default useRetry;
