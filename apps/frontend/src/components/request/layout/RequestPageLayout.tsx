'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * RequestPageLayout - Responsive layout for request detail page
 * 
 * Mobile: Single column with stacked sections
 * Desktop: 2/3 main content + 1/3 sidebar
 */

interface RequestPageLayoutProps {
  /** Header section (status, title, actions) */
  header?: React.ReactNode;
  /** Banner/alert section (status-specific messages) */
  banner?: React.ReactNode;
  /** Main content area */
  children: React.ReactNode;
  /** Sidebar content (people, timeline) */
  sidebar?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether sidebar should be sticky on desktop */
  stickySidebar?: boolean;
}

export function RequestPageLayout({
  header,
  banner,
  children,
  sidebar,
  className,
  stickySidebar = true,
}: RequestPageLayoutProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header Section - Full width */}
      {header && (
        <div className="mb-4 sm:mb-6">
          {header}
        </div>
      )}

      {/* Banner Section - Full width alerts */}
      {banner && (
        <div className="mb-4 sm:mb-6 space-y-3">
          {banner}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content - 2/3 width on desktop */}
        <main className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
          {children}
        </main>

        {/* Sidebar - 1/3 width on desktop, shows first on mobile */}
        {sidebar && (
          <aside 
            className={cn(
              'space-y-4 sm:space-y-6 order-1 lg:order-2',
              stickySidebar && 'lg:sticky lg:top-4 lg:self-start'
            )}
          >
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * RequestSection - Wrapper for main content sections
 * Provides consistent spacing and optional collapsibility
 */
interface RequestSectionProps {
  children: React.ReactNode;
  className?: string;
  /** ID for scroll-to functionality */
  id?: string;
}

export function RequestSection({ children, className, id }: RequestSectionProps) {
  return (
    <section id={id} className={cn('scroll-mt-4', className)}>
      {children}
    </section>
  );
}

/**
 * RequestSidebarSection - Wrapper for sidebar sections
 */
export function RequestSidebarSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}

export default RequestPageLayout;
