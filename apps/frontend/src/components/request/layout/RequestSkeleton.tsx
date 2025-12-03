'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * RequestSkeleton - Full-page loading skeleton for request detail
 * Matches the RequestPageLayout structure
 */

export function RequestSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <div className="w-full animate-pulse">
          {/* Header Skeleton */}
          <div className="mb-4 sm:mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left side - Title and badge */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Skeleton className="h-6 w-24" /> {/* Status badge */}
                      <Skeleton className="h-4 w-32" /> {/* Request number */}
                    </div>
                    <Skeleton className="h-8 w-48 mb-2" /> {/* Title */}
                    <Skeleton className="h-4 w-64" /> {/* Subtitle */}
                  </div>
                  
                  {/* Right side - Actions */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hero Stats */}
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                      <Skeleton className="w-8 h-8 rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Status Banner */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* Workflow Actions */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
              </div>
            </CardContent>
          </Card>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Content */}
            <main className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
              {/* Asset Details Card */}
              <AssetSectionSkeleton />
              
              {/* Offer Card */}
              <OfferSectionSkeleton />
              
              {/* Documents Card */}
              <DocumentSectionSkeleton />
              
              {/* Comments Card */}
              <CommentsSectionSkeleton />
            </main>

            {/* Sidebar */}
            <aside className="space-y-4 sm:space-y-6 order-1 lg:order-2">
              {/* People Card */}
              <PeopleCardSkeleton />
              
              {/* Timeline Card */}
              <TimelineCardSkeleton />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Individual section skeletons for partial loading
 */

export function AssetSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OfferSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center p-3 bg-muted/50 rounded-lg">
              <Skeleton className="h-4 w-16 mx-auto mb-1" />
              <Skeleton className="h-6 w-20 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function DocumentSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-4 w-40 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg overflow-hidden">
              <Skeleton className="h-full w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CommentsSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Comment input */}
        <div className="mb-4">
          <Skeleton className="h-20 w-full mb-2" />
          <Skeleton className="h-9 w-32" />
        </div>
        
        {/* Comments list */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PeopleCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TimelineCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="relative pl-8">
              {i < 5 && <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border" />}
              <div className="absolute left-0 top-0 bg-background border-2 border-border rounded-full p-1">
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact skeleton for inline loading states
 */
export function InlineLoadingSkeleton({ width = 'w-24' }: { width?: string }) {
  return <Skeleton className={`h-4 ${width} inline-block`} />;
}

export default RequestSkeleton;
