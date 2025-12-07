'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

/**
 * SectionCard - Base card component for all request detail sections
 * Provides consistent styling, loading states, and mobile-first design
 */

interface SectionCardProps {
  title: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  /** Additional actions for the header */
  actions?: React.ReactNode;
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Whether the section is collapsible on mobile */
  collapsible?: boolean;
  /** Default collapsed state (only applies if collapsible) */
  defaultCollapsed?: boolean;
  /** Additional class names */
  className?: string;
  /** Content class names */
  contentClassName?: string;
  /** Variant for different visual styles */
  variant?: 'default' | 'highlight' | 'muted';
  /** Section ID for navigation */
  id?: string;
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  actions,
  isLoading = false,
  collapsible = false,
  defaultCollapsed = false,
  className,
  contentClassName,
  variant = 'default',
  id,
}: SectionCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const variantStyles = {
    default: 'bg-card border',
    highlight: 'bg-primary/5 border border-primary/20',
    muted: 'bg-muted/50 border',
  };

  if (isLoading) {
    return (
      <Card className={cn(variantStyles[variant], className)} id={id}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className={contentClassName}>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(variantStyles[variant], className)} id={id}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle 
            className={cn(
              "flex items-center gap-2 text-base font-semibold",
              collapsible && "cursor-pointer select-none"
            )}
            onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
          >
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            {title}
            {collapsible && (
              <svg
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isCollapsed && "-rotate-90"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </CardTitle>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      {(!collapsible || !isCollapsed) && (
        <CardContent className={contentClassName}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * SectionRow - A single row item in a section (label + value)
 */
interface SectionRowProps {
  label: string;
  value: React.ReactNode;
  /** Show value inline or stacked (stacked by default on mobile) */
  inline?: boolean;
  /** Make the value copyable */
  copyable?: boolean;
  /** Value variant */
  valueVariant?: 'default' | 'highlight' | 'muted' | 'success' | 'warning' | 'error';
  className?: string;
}

export function SectionRow({
  label,
  value,
  inline = false,
  copyable = false,
  valueVariant = 'default',
  className,
}: SectionRowProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const valueStyles = {
    default: 'text-foreground',
    highlight: 'text-primary font-medium',
    muted: 'text-muted-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <div
      className={cn(
        'py-2',
        inline
          ? 'flex items-center justify-between gap-4'
          : 'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm break-all', valueStyles[valueVariant])}>
          {value || '—'}
        </span>
        {copyable && value && typeof value === 'string' && (
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            {copied ? (
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * SectionDivider - Horizontal divider for section content
 */
export function SectionDivider({ className }: { className?: string }) {
  return <hr className={cn('border-border my-3', className)} />;
}

/**
 * SectionGrid - Grid layout for section items
 */
interface SectionGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function SectionGrid({ children, columns = 2, className }: SectionGridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={cn('grid gap-x-6 gap-y-1', colClasses[columns], className)}>
      {children}
    </div>
  );
}

/**
 * EmptyState - When section has no data
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default SectionCard;
