'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for persisting form drafts to sessionStorage
 * Prevents data loss when users accidentally navigate away or refresh
 */

interface UseFormPersistenceOptions<T> {
  /** Storage key prefix (will be combined with provided key) */
  prefix?: string;
  /** Debounce delay in ms before saving (default: 500) */
  debounceMs?: number;
  /** Maximum age of draft in ms (default: 24 hours) */
  maxAge?: number;
  /** Transform value before saving (e.g., to exclude sensitive data) */
  transformBeforeSave?: (value: T) => Partial<T>;
  /** Callback when draft is restored */
  onRestore?: (draft: T) => void;
}

interface DraftMetadata {
  savedAt: number;
  version: number;
}

interface StoredDraft<T> {
  data: T;
  meta: DraftMetadata;
}

const DEFAULT_PREFIX = 'fundifyhub_draft_';
const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DRAFT_VERSION = 1;

/**
 * Hook for persisting form data to prevent loss
 * 
 * @example
 * ```tsx
 * const [formData, setFormData, clearDraft, hasDraft] = useFormPersistence(
 *   `bank_details_${requestId}`,
 *   { accountNumber: '', ifscCode: '', accountName: '' },
 *   {
 *     onRestore: (draft) => toast.info('Restored your previous draft'),
 *     transformBeforeSave: (data) => ({ ...data, accountNumber: '' }), // Don't save sensitive
 *   }
 * );
 * 
 * // Form auto-saves as you type
 * <Input value={formData.accountName} onChange={(e) => 
 *   setFormData(prev => ({ ...prev, accountName: e.target.value }))
 * } />
 * 
 * // Clear draft on successful submission
 * const handleSubmit = async () => {
 *   await api.submitBankDetails(formData);
 *   clearDraft();
 * };
 * ```
 */
export function useFormPersistence<T extends Record<string, unknown>>(
  key: string,
  initialValue: T,
  options: UseFormPersistenceOptions<T> = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void, boolean] {
  const {
    prefix = DEFAULT_PREFIX,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    maxAge = DEFAULT_MAX_AGE_MS,
    transformBeforeSave,
    onRestore,
  } = options;

  const storageKey = `${prefix}${key}`;
  const [hasDraft, setHasDraft] = useState(false);

  // Initialize state from storage or default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return initialValue;

      const parsed: StoredDraft<T> = JSON.parse(stored);
      
      // Check version compatibility
      if (parsed.meta.version !== DRAFT_VERSION) {
        sessionStorage.removeItem(storageKey);
        return initialValue;
      }

      // Check if draft has expired
      const age = Date.now() - parsed.meta.savedAt;
      if (age > maxAge) {
        sessionStorage.removeItem(storageKey);
        return initialValue;
      }

      // Merge with initial value to handle schema changes
      const restoredValue = { ...initialValue, ...parsed.data };
      
      // Notify about restoration
      setTimeout(() => {
        onRestore?.(restoredValue);
      }, 0);

      return restoredValue;
    } catch (error) {
      console.warn('[useFormPersistence] Failed to restore draft:', error);
      sessionStorage.removeItem(storageKey);
      return initialValue;
    }
  });

  // Check if there's a saved draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = sessionStorage.getItem(storageKey);
      setHasDraft(!!stored);
    } catch {
      setHasDraft(false);
    }
  }, [storageKey]);

  // Debounced save to storage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't save if value equals initial (empty form)
    const isDefault = JSON.stringify(value) === JSON.stringify(initialValue);
    if (isDefault) {
      // Remove any existing draft if form is reset
      try {
        sessionStorage.removeItem(storageKey);
        setHasDraft(false);
      } catch {}
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const dataToSave = transformBeforeSave ? transformBeforeSave(value) : value;
        
        const draft: StoredDraft<T> = {
          data: dataToSave as T,
          meta: {
            savedAt: Date.now(),
            version: DRAFT_VERSION,
          },
        };

        sessionStorage.setItem(storageKey, JSON.stringify(draft));
        setHasDraft(true);
      } catch (error) {
        console.warn('[useFormPersistence] Failed to save draft:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, initialValue, storageKey, debounceMs, transformBeforeSave]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(storageKey);
      setHasDraft(false);
    } catch (error) {
      console.warn('[useFormPersistence] Failed to clear draft:', error);
    }
    
    // Reset to initial value
    setValue(initialValue);
  }, [storageKey, initialValue]);

  return [value, setValue, clearDraft, hasDraft];
}

/**
 * Hook to check if a draft exists without loading it
 */
export function useHasDraft(key: string, prefix: string = DEFAULT_PREFIX): boolean {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = sessionStorage.getItem(`${prefix}${key}`);
      setHasDraft(!!stored);
    } catch {
      setHasDraft(false);
    }
  }, [key, prefix]);

  return hasDraft;
}

/**
 * Clear all form drafts (useful for logout)
 */
export function clearAllDrafts(prefix: string = DEFAULT_PREFIX): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (error) {
    console.warn('[useFormPersistence] Failed to clear all drafts:', error);
  }
}

export default useFormPersistence;
