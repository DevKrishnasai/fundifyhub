'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  User,
  UserCheck,
  UserCog,
  FileUp,
  MessageSquare,
  PenLine,
  Banknote,
  Calendar,
  PlayCircle,
  RefreshCw,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  Search,
  Filter,
} from 'lucide-react';
import { 
  REQUEST_HISTORY_ACTION, 
  REQUEST_HISTORY_CATEGORY,
  REQUEST_HISTORY_ACTION_CONFIG,
} from '@fundifyhub/types';
import type { RequestType, RequestHistoryItem } from '@fundifyhub/types';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getMetadataString, getMetadataSearchableText, getMetadataNumber, hasMetadata } from '@/lib/type-guards';

/**
 * TimelineSidebar - Shows request history/activity timeline
 * Displays all actions taken on the request in chronological order
 */

interface TimelineSidebarProps {
  request: RequestType;
  history?: RequestHistoryItem[];
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
  onViewAll?: () => void;
  userRole?: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
}

// Icon mapping for history actions
const ACTION_ICONS: Partial<Record<REQUEST_HISTORY_ACTION | string, typeof FileText>> = {
  [REQUEST_HISTORY_ACTION.STATUS_UPDATED]: RefreshCw,
  [REQUEST_HISTORY_ACTION.OFFER_CREATED]: Send,
  [REQUEST_HISTORY_ACTION.OFFER_REVISED]: RefreshCw,
  [REQUEST_HISTORY_ACTION.ASSIGNED_AGENT]: UserCheck,
  [REQUEST_HISTORY_ACTION.ADMIN_ASSIGNED]: UserCog,
  [REQUEST_HISTORY_ACTION.LOAN_CREATED]: Banknote,
  [REQUEST_HISTORY_ACTION.COMMENT_ADDED]: MessageSquare,
  [REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED]: FileUp,
  [REQUEST_HISTORY_ACTION.AGREEMENT_GENERATED]: FileText,
  [REQUEST_HISTORY_ACTION.SIGNED_AGREEMENT_UPLOADED]: PenLine,
  [REQUEST_HISTORY_ACTION.INSPECTION_COMPLETED]: CheckCircle,
  [REQUEST_HISTORY_ACTION.PAYMENT_INITIATED]: CreditCard,
  [REQUEST_HISTORY_ACTION.PAYMENT_SUCCESS]: CheckCircle,
  [REQUEST_HISTORY_ACTION.PAYMENT_FAILED]: XCircle,
  // Additional offer/inspection actions
  'OFFER_ACCEPTED': CheckCircle,
  'OFFER_DECLINED': XCircle,
  'INSPECTION_SCHEDULED': Calendar,
};

// Color mapping for history actions
const ACTION_COLORS: Partial<Record<REQUEST_HISTORY_ACTION | string, string>> = {
  [REQUEST_HISTORY_ACTION.STATUS_UPDATED]: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  [REQUEST_HISTORY_ACTION.OFFER_CREATED]: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  [REQUEST_HISTORY_ACTION.OFFER_REVISED]: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  [REQUEST_HISTORY_ACTION.ASSIGNED_AGENT]: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  [REQUEST_HISTORY_ACTION.ADMIN_ASSIGNED]: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  [REQUEST_HISTORY_ACTION.LOAN_CREATED]: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  [REQUEST_HISTORY_ACTION.COMMENT_ADDED]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  [REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED]: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  [REQUEST_HISTORY_ACTION.INSPECTION_COMPLETED]: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  [REQUEST_HISTORY_ACTION.PAYMENT_SUCCESS]: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  [REQUEST_HISTORY_ACTION.PAYMENT_FAILED]: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  // Additional offer/inspection actions
  'OFFER_ACCEPTED': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'OFFER_DECLINED': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  'INSPECTION_SCHEDULED': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
};

// Status display names
const STATUS_DISPLAY: Record<string, string> = {
  PENDING: 'Pending Review',
  MORE_INFO_REQUIRED: 'More Info Required',
  OFFER_SENT: 'Offer Sent',
  OFFER_ACCEPTED: 'Offer Accepted',
  OFFER_DECLINED: 'Offer Declined',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  INSPECTION_SCHEDULED: 'Inspection Scheduled',
  INSPECTION_RESCHEDULE_REQUESTED: 'Reschedule Requested',
  INSPECTION_IN_PROGRESS: 'Inspection In Progress',
  INSPECTION_COMPLETED: 'Inspection Completed',
  CUSTOMER_NOT_AVAILABLE: 'Customer Not Available',
  ASSET_MISMATCH: 'Asset Mismatch',
  AGENT_NOT_AVAILABLE: 'Agent Not Available',
  APPROVED: 'Approved',
  PENDING_SIGNATURE: 'Pending Signature',
  PENDING_BANK_DETAILS: 'Pending Bank Details',
  BANK_DETAILS_SUBMITTED: 'Bank Details Submitted',
  TRANSFER_FAILED: 'Transfer Failed',
  AMOUNT_DISBURSED: 'Amount Disbursed',
  ACTIVE: 'Active',
  PAYMENT_OVERDUE: 'Payment Overdue',
  DEFAULTED: 'Defaulted',
  COMPLETED: 'Completed',
};

const formatStatus = (status: string) => STATUS_DISPLAY[status] || status.replace(/_/g, ' ');

export function TimelineSidebar({
  request,
  history = [],
  isLoading,
  className,
  maxItems = 10,
  onViewAll,
  userRole,
}: TimelineSidebarProps) {
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'DISTRICT_ADMIN';

  // Sort history by date (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get unique action types for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(history.map(item => item.action));
    return Array.from(actions).sort();
  }, [history]);

  // Filter history for the modal
  const filteredHistory = useMemo(() => {
    return sortedHistory.filter(item => {
      // Apply action filter
      if (actionFilter !== 'all' && item.action !== actionFilter) {
        return false;
      }
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const config = REQUEST_HISTORY_ACTION_CONFIG[item.action as REQUEST_HISTORY_ACTION];
        const actionLabel = config?.label || item.action;
        const actorName = item.actor ? `${item.actor.firstName || ''} ${item.actor.lastName || ''}`.trim() : '';
        
        // Search in action label, actor name, and common metadata fields
        const searchableText = [
          actionLabel,
          actorName,
          getMetadataSearchableText(item.metadata),
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [sortedHistory, actionFilter, searchQuery]);

  const displayedHistory = sortedHistory.slice(0, maxItems);
  const hasMore = sortedHistory.length > maxItems;

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getActionIcon = (action: string) => {
    return ACTION_ICONS[action as REQUEST_HISTORY_ACTION] || FileText;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action as REQUEST_HISTORY_ACTION] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const getActionLabel = (item: RequestHistoryItem) => {
    const config = REQUEST_HISTORY_ACTION_CONFIG[item.action as REQUEST_HISTORY_ACTION];
    if (config) return config.label;
    return item.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  };

  const renderTimelineItem = (item: RequestHistoryItem, showExpand: boolean = false) => {
    const Icon = getActionIcon(item.action);
    const colorClass = getActionColor(item.action);
    const isExpanded = expandedItems.has(item.id);
    const actorName = item.actor ? `${item.actor.firstName || ''} ${item.actor.lastName || ''}`.trim() : null;
    const actorRoles = item.actor?.roles as string[] | undefined;
    
    // Get display role badge
    const getActorRoleBadge = () => {
      if (!actorRoles || actorRoles.length === 0) return null;
      if (actorRoles.includes('SUPER_ADMIN')) return { label: 'Super Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      if (actorRoles.includes('DISTRICT_ADMIN')) return { label: 'Admin', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' };
      if (actorRoles.includes('AGENT')) return { label: 'Agent', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      if (actorRoles.includes('CUSTOMER')) return { label: 'Customer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      return null;
    };
    
    const roleBadge = getActorRoleBadge();

    return (
      <div key={item.id} className="relative flex gap-3 pl-2">
        {/* Icon */}
        <div className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          colorClass
        )}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">
              {getActionLabel(item)}
            </p>
            {showExpand && isAdmin && hasMetadata(item.metadata) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 -mt-0.5"
                onClick={() => toggleExpanded(item.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          
          {/* Status change info */}
          {item.action === REQUEST_HISTORY_ACTION.STATUS_UPDATED && getMetadataString(item.metadata, 'toStatus') && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {getMetadataString(item.metadata, 'fromStatus') && (
                  <>
                    <Badge variant="outline" className="text-[10px] h-5 bg-muted">
                      {formatStatus(getMetadataString(item.metadata, 'fromStatus') || '')}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </>
                )}
                <Badge variant="secondary" className="text-[10px] h-5">
                  {formatStatus(getMetadataString(item.metadata, 'toStatus') || '')}
                </Badge>
              </div>
              {getMetadataString(item.metadata, 'reason') && (
                <p className="text-[10px] text-muted-foreground italic">
                  Note: {getMetadataString(item.metadata, 'reason')}
                </p>
              )}
            </div>
          )}

          {/* Document upload info */}
          {item.action === REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED && (
            <div className="mt-1 space-y-1">
              {getMetadataString(item.metadata, 'fileName') && (
                <p className="text-xs text-muted-foreground truncate">
                  {getMetadataString(item.metadata, 'fileName')}
                </p>
              )}
              {getMetadataString(item.metadata, 'category') && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {(getMetadataString(item.metadata, 'category') || '').replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          )}

          {/* Agent assignment info */}
          {item.action === REQUEST_HISTORY_ACTION.ASSIGNED_AGENT && getMetadataString(item.metadata, 'agentEmail') && (
            <p className="text-xs text-muted-foreground mt-1">
              Assigned to {getMetadataString(item.metadata, 'agentEmail')}
            </p>
          )}

          {/* Comment added */}
          {item.action === REQUEST_HISTORY_ACTION.COMMENT_ADDED && (
            <p className="text-xs text-muted-foreground mt-1">Added a comment</p>
          )}

          {/* Payment info */}
          {item.action === REQUEST_HISTORY_ACTION.PAYMENT_SUCCESS && getMetadataNumber(item.metadata, 'totalAmount') && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{(getMetadataNumber(item.metadata, 'totalAmount') || 0).toLocaleString()} received
            </p>
          )}

          {/* Submit info */}
          {item.action === 'SUBMIT_INFO' && getMetadataString(item.metadata, 'notes') && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              {getMetadataString(item.metadata, 'notes')}
            </p>
          )}

          {/* Actor with role badge and time */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {actorName && (
              <span className="text-xs text-foreground/80 flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                {actorName}
                {roleBadge && (
                  <Badge variant="secondary" className={cn('text-[9px] h-4 px-1.5 font-normal', roleBadge.color)}>
                    {roleBadge.label}
                  </Badge>
                )}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Expanded details for admins */}
          {showExpand && isAdmin && isExpanded && hasMetadata(item.metadata) && (
            <div className="mt-2 p-2 bg-muted/50 rounded-md text-[10px] space-y-1">
              <p className="font-medium text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Details
              </p>
              {Object.entries(item.metadata as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground font-medium">{key}:</span>
                  <span className="text-foreground break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <Clock className="h-6 w-6 text-muted-foreground mx-auto animate-pulse" />
              <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
            </div>
          ) : displayedHistory.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <History className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">No activity yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="px-4 pb-4">
                <div className="relative">
                  {/* Timeline line - aligned to center of icon (pl-2 + h-8/2 = 0.5rem + 1rem = 1.5rem = left-6) */}
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

                  {/* Timeline items */}
                  <div className="space-y-4">
                    {displayedHistory.map((item) => renderTimelineItem(item, true))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* View All Button */}
          {hasMore && (
            <div className="px-4 pb-4 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setViewAllOpen(true)}
              >
                View all {sortedHistory.length} activities
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewAllOpen} onOpenChange={(open) => {
        setViewAllOpen(open);
        if (!open) {
          // Reset filters when closing
          setSearchQuery('');
          setActionFilter('all');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              All Activities ({sortedHistory.length})
            </DialogTitle>
          </DialogHeader>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 py-3 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {uniqueActions.map((action) => {
                  const config = REQUEST_HISTORY_ACTION_CONFIG[action as REQUEST_HISTORY_ACTION];
                  const label = config?.label || action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
                  return (
                    <SelectItem key={action} value={action}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Results count */}
          {(searchQuery || actionFilter !== 'all') && (
            <p className="text-xs text-muted-foreground py-2">
              Showing {filteredHistory.length} of {sortedHistory.length} activities
              {actionFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-2 text-xs text-primary hover:text-primary/80"
                  onClick={() => {
                    setSearchQuery('');
                    setActionFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </p>
          )}
          
          <ScrollArea className="flex-1 h-full">
            <div className="relative py-4 pr-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No activities match your filters</p>
                </div>
              ) : (
                <>
                  {/* Timeline line - aligned to center of icon */}
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

                  {/* All timeline items */}
                  <div className="space-y-4">
                    {filteredHistory.map((item) => renderTimelineItem(item, true))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * TimelineItem - Individual timeline entry (for use in other contexts)
 */
interface TimelineItemProps {
  item: RequestHistoryItem;
  showLine?: boolean;
  compact?: boolean;
}

export function TimelineItem({ item, showLine = true, compact = false }: TimelineItemProps) {
  const Icon = ACTION_ICONS[item.action as REQUEST_HISTORY_ACTION] || FileText;
  const colorClass = ACTION_COLORS[item.action as REQUEST_HISTORY_ACTION] || 'bg-gray-100 text-gray-600';
  const config = REQUEST_HISTORY_ACTION_CONFIG[item.action as REQUEST_HISTORY_ACTION];

  return (
    <div className={cn('relative flex gap-3', showLine && 'pl-2')}>
      {showLine && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
      )}
      <div className={cn(
        'relative z-10 flex shrink-0 items-center justify-center rounded-full',
        colorClass,
        compact ? 'h-6 w-6' : 'h-8 w-8'
      )}>
        <Icon className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
          {config?.label || item.action}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default TimelineSidebar;
