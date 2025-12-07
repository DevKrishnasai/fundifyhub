/**
 * WorkflowActionBar Component
 * 
 * Primary workflow actions bar with overflow menu for secondary actions.
 * Responsive design: horizontal on desktop, stacked on mobile.
 */

'use client';

import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui/tooltip';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface WorkflowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  isPrimary?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onClick: () => void | Promise<void>;
  confirmRequired?: boolean;
  confirmMessage?: string;
  tooltip?: string;
}

export interface WorkflowActionBarProps {
  actions: WorkflowAction[];
  maxVisible?: number;
  isLoading?: boolean;
  className?: string;
}

export function WorkflowActionBar({
  actions,
  maxVisible = 3,
  isLoading = false,
  className,
}: WorkflowActionBarProps) {
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Separate primary and secondary actions
  const primaryActions = actions.filter((a) => a.isPrimary);
  const secondaryActions = actions.filter((a) => !a.isPrimary);

  // Determine visible vs overflow actions - show more on larger screens
  const allActions = [...primaryActions, ...secondaryActions];
  const visibleActions = allActions.slice(0, maxVisible);
  const overflowActions = allActions.slice(maxVisible);

  const handleAction = async (action: WorkflowAction) => {
    if (action.isDisabled || action.isLoading) return;

    setLoadingActionId(action.id);
    try {
      await action.onClick();
    } finally {
      setLoadingActionId(null);
    }
  };

  if (actions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Primary action gets full width on mobile, others share space */}
      {visibleActions.map((action, index) => {
        const Icon = action.icon;
        const isActionLoading = loadingActionId === action.id || action.isLoading;
        const isPrimaryFirst = index === 0 && action.isPrimary;
        
        return (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Button
                variant={action.variant || 'default'}
                size="default"
                onClick={() => handleAction(action)}
                disabled={action.isDisabled || isLoading || isActionLoading}
                className={cn(
                  'transition-all',
                  // On mobile: first primary action is full width, others are compact
                  isPrimaryFirst 
                    ? 'w-full sm:w-auto order-first' 
                    : 'flex-1 sm:flex-none min-w-0',
                  action.isPrimary && 'font-semibold',
                  // Compact padding on mobile
                  'px-3 sm:px-4'
                )}
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : Icon ? (
                  <Icon className="h-4 w-4 shrink-0" />
                ) : null}
                <span className={cn(
                  'ml-2 truncate',
                  // Hide text on very small screens for non-primary actions
                  !isPrimaryFirst && 'hidden xs:inline sm:inline'
                )}>
                  {action.label}
                </span>
              </Button>
            </TooltipTrigger>
            {(action.tooltip || action.confirmMessage) && (
              <TooltipContent side="bottom">
                <p className="max-w-xs">{action.tooltip || action.confirmMessage}</p>
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}

      {/* Overflow Menu - Always visible when there are overflow actions */}
      {overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="shrink-0 h-10 w-10"
              disabled={isLoading}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions ({overflowActions.length})</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {overflowActions.map((action, index) => {
              const Icon = action.icon;
              const isActionLoading = loadingActionId === action.id || action.isLoading;
              
              return (
                <React.Fragment key={action.id}>
                  {index > 0 && action.variant === 'destructive' && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={() => handleAction(action)}
                    disabled={action.isDisabled || isActionLoading}
                    className={cn(
                      'cursor-pointer py-2.5',
                      action.variant === 'destructive' && 'text-destructive focus:text-destructive focus:bg-destructive/10'
                    )}
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                    ) : Icon ? (
                      <Icon className="h-4 w-4 mr-3" />
                    ) : null}
                    <span className="flex-1">{action.label}</span>
                  </DropdownMenuItem>
                </React.Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/**
 * Floating Action Button variant for mobile
 */
export interface FloatingActionButtonProps {
  action: WorkflowAction;
  className?: string;
}

export function FloatingActionButton({ action, className }: FloatingActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const Icon = action.icon;

  const handleClick = async () => {
    if (action.isDisabled || action.isLoading) return;
    setIsLoading(true);
    try {
      await action.onClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      className={cn(
        'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
        'md:hidden', // Only show on mobile
        className
      )}
      onClick={handleClick}
      disabled={action.isDisabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : Icon ? (
        <Icon className="h-6 w-6" />
      ) : (
        <ChevronDown className="h-6 w-6" />
      )}
      <span className="sr-only">{action.label}</span>
    </Button>
  );
}

export default WorkflowActionBar;
