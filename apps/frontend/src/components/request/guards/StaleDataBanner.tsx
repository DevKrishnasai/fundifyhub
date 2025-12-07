'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StaleDataBanner - Shows when data has been modified externally
 * Prompts user to refresh to see latest changes
 */

interface StaleDataBannerProps {
  /** Whether the data is stale */
  isStale: boolean;
  /** Callback to refresh data */
  onRefresh: () => void;
  /** Callback to dismiss the banner */
  onDismiss?: () => void;
  /** Whether refresh is in progress */
  isRefreshing?: boolean;
  /** Custom message */
  message?: string;
  /** Additional class names */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'subtle' | 'floating';
}

export function StaleDataBanner({
  isStale,
  onRefresh,
  onDismiss,
  isRefreshing = false,
  message = 'This data was updated. Refresh to see the latest changes.',
  className,
  variant = 'default',
}: StaleDataBannerProps) {
  if (!isStale) return null;

  if (variant === 'floating') {
    return (
      <div
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
          'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800',
          'rounded-lg shadow-lg px-4 py-3 flex items-center gap-3',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
          className
        )}
      >
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm text-amber-800 dark:text-amber-200">{message}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
        >
          <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-6 w-6 text-amber-600 hover:text-amber-800"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 py-2',
          className
        )}
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        <Button
          variant="link"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-amber-700 dark:text-amber-400 p-0 h-auto"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-5 w-5 text-amber-600"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <Alert
      variant="default"
      className={cn(
        'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Data Updated</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-amber-700 dark:text-amber-300">{message}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-8 w-8 text-amber-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default StaleDataBanner;
