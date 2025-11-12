/**
 * RequestNextActions Component
 * 
 * Displays primary actions for a request on dashboard cards.
 * Shows 1-2 most important actions based on role and status.
 */

'use client';

import { Button } from '@/components/ui/button';
import { useRequestActions } from '@/hooks/useRequestActions';
import { REQUEST_STATUS } from '@fundifyhub/types';
import { 
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
import { cn } from '@/lib/utils';

interface Request {
  id: string;
  currentStatus: REQUEST_STATUS;
  districtId: string;
  customerId: string;
  agentId?: string | null;
}

interface RequestNextActionsProps {
  request: Request;
  onAction: (actionId: string, requestId: string) => void;
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
  UserSwitch: Users, // Use Users icon as alternative
  RefreshCw,
  Archive,
  CheckCheck,
  AlertCircle,
  FilePlus,
  Pause,
  Ban,
  UserX,
};

export function RequestNextActions({ 
  request, 
  onAction, 
  className 
}: RequestNextActionsProps) {
  const { primaryActions, canAct } = useRequestActions(request);

  if (!canAct || primaryActions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {primaryActions.map((action) => {
        const Icon = action.icon ? ICON_MAP[action.icon] : null;
        
        return (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant || 'default'}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              onAction(action.id, request.id);
            }}
            className={cn(
              "text-xs h-8",
              action.variant === 'destructive' && "hover:bg-destructive/90"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
