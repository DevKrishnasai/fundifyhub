"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';

export default function InspectionCard({ request, isCustomer, isAdmin, isAgent }: any) {
  const dateLabel = request?.inspectionScheduledAt
    ? new Date(request.inspectionScheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBD';

  const address = (request?.customer && (request.customer.address || request.customer.address === '') )
    ? (typeof request.customer.address === 'string' ? request.customer.address : String(request.customer.address))
    : (request?.district || '—');

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </span>
          <span>Inspection Scheduled</span>
        </CardTitle>
        <CardDescription>
          {isAgent
            ? 'You have an inspection assigned. Please visit the asset location on the scheduled date.'
            : 'An agent has been assigned to inspect the asset. Please ensure availability.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* When */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">When</p>
              <div className="mt-1">
                <Badge className="text-sm">{dateLabel}</Badge>
              </div>
            </div>
          </div>

          {/* At */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-muted/50">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">At</p>
              <p className="mt-1 text-sm text-foreground max-w-xs truncate">{address}</p>
            </div>
          </div>

          {/* By */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">By</p>
              {request?.assignedAgent ? (
                <div className="mt-1 flex items-center gap-3">
                  <div className="text-sm">
                    <div className="font-medium">{request.assignedAgent.firstName} {request.assignedAgent.lastName}</div>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No agent assigned yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Preparation notes (placed below in a subtle block) */}
        <div className="mt-4 pt-3 border-t">
          <p className="text-sm font-medium mb-2">Preparation</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Be present at the given address on the scheduled date.</li>
            <li>Keep the asset accessible and charged (if applicable).</li>
            <li>Carry a valid photo ID for verification.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
