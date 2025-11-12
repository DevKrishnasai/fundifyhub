/**
 * RequestActions Component - Refactored with Workflow Engine
 * 
 * Displays all available actions for a request based on:
 * - User's role (CUSTOMER, DISTRICT_ADMIN, SUPER_ADMIN, AGENT)
 * - Request status
 * - District access permissions
 * - Ownership/assignment
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRequestActions } from '@/hooks/useRequestActions';
import { executeRequestAction, type ActionInput } from '@/lib/request-actions';
import { REQUEST_STATUS, type WorkflowAction } from '@fundifyhub/types';
import { 
  MoreHorizontal,
  CheckCircle, 
  XCircle, 
  Send, 
  FileSearch, 
  UserPlus,
  Calendar,
  PlayCircle,
  FileSignature,
  CreditCard,
  FileCheck,
  ThumbsUp,
  Edit,
  Upload,
  RotateCcw,
  Play,
  MessageCircle,
  AlertTriangle,
  Users,
  RefreshCw,
  Archive,
  CheckCheck,
  AlertCircle,
  FilePlus,
  Pause,
  Ban,
  UserX
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Modals
import CreateOfferModal from './CreateOfferModal';
import AssignAgentModal from './AssignAgentModal';

interface RequestActionsProps {
  requestId: string;
  requestStatus: string;
  district?: string;
  onUpdated?: (data: any) => void;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  XCircle,
  Send,
  FileSearch,
  UserPlus,
  Calendar,
  PlayCircle,
  FileSignature,
  CreditCard,
  FileCheck,
  ThumbsUp,
  ThumbsDown: XCircle,
  Edit,
  Upload,
  RotateCcw,
  Play,
  MessageCircle,
  AlertTriangle,
  UserSwitch: Users,
  RefreshCw,
  Archive,
  CheckCheck,
  AlertCircle,
  FilePlus,
  Pause,
  Ban,
  UserX,
};

export default function RequestActions({ 
  requestId, 
  requestStatus,
  district,
  onUpdated,
  className 
}: RequestActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [initialOffer, setInitialOffer] = useState<{ 
    amount?: number; 
    tenureMonths?: number; 
    interestRate?: number 
  } | null>(null);
  const [currentAction, setCurrentAction] = useState<WorkflowAction | null>(null);

  // Get available actions from workflow engine
  const { primaryActions, secondaryActions, canAct } = useRequestActions({
    id: requestId,
    currentStatus: requestStatus as REQUEST_STATUS,
    districtId: district || '',
    customerId: '', // Will be filtered by hook based on auth context
    agentId: null,
  });

  if (!canAct) {
    return null;
  }

  /**
   * Handle action execution with modal support
   */
  async function handleAction(action: WorkflowAction, input?: ActionInput) {
    // Actions that require modals
    if (action.id === 'make-offer' || action.id === 'revise-offer') {
      setCurrentAction(action);
      if (action.id === 'revise-offer') {
        await loadCurrentOffer();
      } else {
        setInitialOffer(null);
      }
      setShowOfferModal(true);
      return;
    }

    if (action.id === 'assign-agent' || action.id === 'reassign-agent') {
      setCurrentAction(action);
      setShowAssignModal(true);
      return;
    }

    // Actions requiring confirmation
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(
        `Are you sure you want to ${action.label.toLowerCase()}?`
      );
      if (!confirmed) return;
    }

    // Actions requiring input (simple prompt for now)
    let actionInput = input;
    if (action.requiresInput && !input) {
      const reason = window.prompt(`Please provide a reason for ${action.label.toLowerCase()}:`);
      if (!reason) return;
      actionInput = { reason, notes: reason };
    }

    // Execute the action
    setLoading(true);
    const success = await executeRequestAction(
      action.id,
      {
        requestId,
        onSuccess: (data) => {
          onUpdated?.(data);
          setLoading(false);
        },
        onError: (error) => {
          alert(error);
          setLoading(false);
        }
      },
      actionInput
    );

    if (!success) {
      setLoading(false);
    }
  }

  /**
   * Load current offer for revision
   */
  async function loadCurrentOffer() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.data?.request) {
        const req = data.data.request;
        setInitialOffer({
          amount: req.adminOfferedAmount ?? undefined,
          tenureMonths: req.adminTenureMonths ?? undefined,
          interestRate: req.adminInterestRate ?? undefined,
        });
      }
    } catch (error) {
      console.error('Failed to load current offer', error);
    }
  }

  /**
   * Render action button with icon
   */
  function renderActionButton(action: WorkflowAction, isDropdown: boolean = false) {
    const Icon = action.icon ? ICON_MAP[action.icon] : null;
    
    if (isDropdown) {
      return (
        <DropdownMenuItem
          key={action.id}
          onClick={() => handleAction(action)}
          disabled={loading}
        >
          {Icon && <Icon className="mr-2 h-4 w-4" />}
          {action.label}
        </DropdownMenuItem>
      );
    }

    return (
      <Button
        key={action.id}
        size="default"
        variant={action.variant || 'default'}
        onClick={() => handleAction(action)}
        disabled={loading}
        className={cn("h-9 px-4")}
        title={action.description}
      >
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {action.label}
      </Button>
    );
  }

  return (
    <>
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {/* Primary actions as buttons */}
        {primaryActions.map(action => renderActionButton(action))}

        {/* Secondary actions in dropdown */}
        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="default" className="h-9 px-3" disabled={loading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {secondaryActions.map(action => renderActionButton(action, true))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Modals */}
      <CreateOfferModal
        open={showOfferModal}
        onOpenChange={(open) => {
          setShowOfferModal(open);
          if (!open) {
            setInitialOffer(null);
            setCurrentAction(null);
          }
        }}
        onSubmit={async (offerData) => {
          await handleAction(currentAction!, {
            amount: offerData.amount,
            tenureMonths: offerData.tenureMonths,
            interestRate: offerData.interestRate,
          });
          setShowOfferModal(false);
          setCurrentAction(null);
        }}
        requestId={requestId}
        initialOffer={initialOffer ?? undefined}
      />

      <AssignAgentModal
        open={showAssignModal}
        onOpenChange={(open) => {
          setShowAssignModal(open);
          if (!open) {
            setCurrentAction(null);
          }
        }}
        district={district}
        onSubmit={async (agentId) => {
          await handleAction(currentAction!, { agentId });
          setShowAssignModal(false);
          setCurrentAction(null);
        }}
      />
    </>
  );
}
