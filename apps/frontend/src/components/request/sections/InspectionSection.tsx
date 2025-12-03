'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UserCheck, 
  Calendar, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  RefreshCw,
  PlayCircle,
} from 'lucide-react';
import { REQUEST_STATUS } from '@fundifyhub/types';
import type { RequestType, UserType, InspectionType } from '@fundifyhub/types';
import { 
  SectionCard, 
  SectionRow, 
  SectionGrid, 
  SectionDivider,
  EmptyState,
} from './SectionCard';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { InspectionPhotoUpload } from './InspectionPhotoUpload';

/**
 * InspectionSection - Displays inspection details and agent info
 * Shows scheduled date, agent details, and inspection actions
 */

interface InspectionSectionProps {
  request: RequestType;
  userRole: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
  currentUserId?: string;
  isLoading?: boolean;
  onStartInspection?: () => void;
  onCompleteInspection?: () => void;
  onRequestReschedule?: () => void;
  onReassignAgent?: () => void;
  isActionLoading?: boolean;
  className?: string;
}

const INSPECTION_STATUSES = [
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
  REQUEST_STATUS.ASSET_MISMATCH,
  REQUEST_STATUS.AGENT_NOT_AVAILABLE,
];

export function InspectionSection({
  request,
  userRole,
  currentUserId,
  isLoading,
  onStartInspection,
  onCompleteInspection,
  onRequestReschedule,
  onReassignAgent,
  isActionLoading,
  className,
}: InspectionSectionProps) {
  const [stagedPhotosCount, setStagedPhotosCount] = useState(0);
  
  const hasInspection = request.assignedAgentId !== null || 
    INSPECTION_STATUSES.includes(request.currentStatus as REQUEST_STATUS);
  
  const agent = request.assignedAgent;
  const inspectionDate = request.inspectionScheduledAt ? new Date(request.inspectionScheduledAt) : null;
  
  const isCustomer = userRole === 'CUSTOMER';
  const isAdmin = userRole === 'DISTRICT_ADMIN' || userRole === 'SUPER_ADMIN';
  const isAgent = userRole === 'AGENT';
  const isAssignedAgent = isAgent && currentUserId === request.assignedAgentId;

  const currentStatus = request.currentStatus as REQUEST_STATUS;
  const isScheduled = currentStatus === REQUEST_STATUS.INSPECTION_SCHEDULED;
  const isInProgress = currentStatus === REQUEST_STATUS.INSPECTION_IN_PROGRESS;
  const isCompleted = currentStatus === REQUEST_STATUS.INSPECTION_COMPLETED;
  const isRescheduleRequested = currentStatus === REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED;
  const isCustomerNotAvailable = currentStatus === REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE;
  const isAgentNotAvailable = currentStatus === REQUEST_STATUS.AGENT_NOT_AVAILABLE;
  const isAssetMismatch = currentStatus === REQUEST_STATUS.ASSET_MISMATCH;

  // Track staged photos count for enabling/disabling complete button
  const handlePhotosChange = useCallback((photos: any[]) => {
    setStagedPhotosCount(photos.length);
  }, []);

  // Format inspection date nicely - show only date, no time
  const formatInspectionDate = (date: Date | null) => {
    if (!date) return 'Not scheduled';
    
    if (isToday(date)) {
      return 'Today';
    }
    if (isTomorrow(date)) {
      return 'Tomorrow';
    }
    return format(date, 'PPP'); // e.g., "December 3, 2025"
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    }
    if (isInProgress) {
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <PlayCircle className="mr-1 h-3 w-3" />
          In Progress
        </Badge>
      );
    }
    if (isRescheduleRequested) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <RefreshCw className="mr-1 h-3 w-3" />
          Reschedule Requested
        </Badge>
      );
    }
    if (isCustomerNotAvailable || isAgentNotAvailable) {
      return (
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {isCustomerNotAvailable ? 'Customer Not Available' : 'Agent Not Available'}
        </Badge>
      );
    }
    if (isAssetMismatch) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="mr-1 h-3 w-3" />
          Asset Mismatch
        </Badge>
      );
    }
    if (isScheduled && inspectionDate) {
      const isPastDate = isPast(inspectionDate);
      return (
        <Badge variant={isPastDate ? 'destructive' : 'secondary'}>
          <Calendar className="mr-1 h-3 w-3" />
          {isPastDate ? 'Overdue' : 'Scheduled'}
        </Badge>
      );
    }
    return null;
  };

  if (!hasInspection) {
    return (
      <SectionCard
        title="Inspection"
        icon={UserCheck}
        isLoading={isLoading}
        className={className}
        id="inspection-section"
      >
        <EmptyState
          title="No Inspection Scheduled"
          description="An agent will be assigned after the offer is accepted."
          icon={UserCheck}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Inspection"
      icon={UserCheck}
      isLoading={isLoading}
      className={className}
      id="inspection-section"
      actions={getStatusBadge()}
    >
      {/* Agent Info */}
      {agent && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {agent.firstName?.[0]}{agent.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {agent.firstName} {agent.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              Assigned Agent
            </p>
          </div>
          {agent.phoneNumber && (
            <a 
              href={`tel:${agent.phoneNumber}`}
              className="text-xs text-primary hover:underline"
            >
              {agent.phoneNumber}
            </a>
          )}
        </div>
      )}

      {/* Inspection Details */}
      <SectionGrid columns={2}>
        <SectionRow
          label="Scheduled Date"
          value={formatInspectionDate(inspectionDate)}
          valueVariant={inspectionDate && isPast(inspectionDate) && isScheduled ? 'error' : 'default'}
        />
        <SectionRow
          label="District"
          value={request.district}
        />
      </SectionGrid>

      {/* Latest Inspection Record */}
      {request.inspections && request.inspections.length > 0 && (
        <>
          <SectionDivider />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Inspection Notes</h4>
            {request.inspections.slice(-1).map((inspection) => (
              <div key={inspection.id} className="p-3 rounded-lg border text-sm">
                {inspection.notes && (
                  <p className="text-muted-foreground mb-2">{inspection.notes}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {inspection.assetCondition && (
                    <span>Condition: <strong>{inspection.assetCondition}</strong></span>
                  )}
                  {inspection.estimatedValue && (
                    <span>Est. Value: <strong>₹{inspection.estimatedValue.toLocaleString()}</strong></span>
                  )}
                  {inspection.recommendApprove !== null && (
                    <span className={inspection.recommendApprove ? 'text-emerald-600' : 'text-red-600'}>
                      {inspection.recommendApprove ? '✓ Recommended' : '✗ Not Recommended'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Agent: Photo Upload during inspection */}
      {isAssignedAgent && isInProgress && (
        <>
          <SectionDivider />
          <InspectionPhotoUpload 
            requestId={request.id} 
            onPhotosChange={handlePhotosChange}
          />
        </>
      )}

      {/* Actions */}
      {(isCustomer || isAdmin || isAssignedAgent) && (
        <>
          <SectionDivider />
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Customer: Request reschedule */}
            {isCustomer && isScheduled && onRequestReschedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRequestReschedule}
                disabled={isActionLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Request Reschedule
              </Button>
            )}

            {/* Agent: Start inspection */}
            {isAssignedAgent && isScheduled && onStartInspection && (
              <Button
                size="sm"
                onClick={onStartInspection}
                disabled={isActionLoading}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Inspection
              </Button>
            )}

            {/* Agent: Complete inspection */}
            {isAssignedAgent && isInProgress && onCompleteInspection && (
              <Button
                size="sm"
                onClick={onCompleteInspection}
                disabled={isActionLoading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Inspection
              </Button>
            )}

            {/* Admin: Reassign agent */}
            {isAdmin && (isScheduled || isRescheduleRequested || isAgentNotAvailable) && onReassignAgent && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReassignAgent}
                disabled={isActionLoading}
              >
                <User className="mr-2 h-4 w-4" />
                {isAgentNotAvailable ? 'Assign New Agent' : 'Reassign Agent'}
              </Button>
            )}
          </div>
        </>
      )}
    </SectionCard>
  );
}

/**
 * InspectionTimelineItem - For use in activity timeline
 */
interface InspectionTimelineItemProps {
  inspection: InspectionType;
  agent?: UserType | null;
}

export function InspectionTimelineItem({ inspection, agent }: InspectionTimelineItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          Inspection {inspection.status === 'COMPLETED' ? 'completed' : 'scheduled'}
        </p>
        {agent && (
          <p className="text-xs text-muted-foreground">
            by {agent.firstName} {agent.lastName}
          </p>
        )}
        {inspection.completedDate && (
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(inspection.completedDate), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}

export default InspectionSection;
