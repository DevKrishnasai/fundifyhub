'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Shield,
} from 'lucide-react';
import type { RequestType, CommentType, UserType } from '@fundifyhub/types';
import { ROLES } from '@fundifyhub/types';
import { 
  SectionCard, 
  SectionDivider,
  EmptyState,
} from './SectionCard';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * CommentsSection - Displays and manages request comments
 * Supports internal (admin-only) and public comments
 */

interface CommentsSectionProps {
  request: RequestType;
  currentUser: UserType;
  userRole: keyof typeof ROLES;
  isLoading?: boolean;
  onAddComment?: (content: string, isInternal: boolean) => Promise<void>;
  isActionLoading?: boolean;
  className?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export function CommentsSection({
  request,
  currentUser,
  userRole,
  isLoading,
  onAddComment,
  isActionLoading,
  className,
  disabled = false,
  disabledMessage = 'Comments are disabled for this request.',
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showInternalComments, setShowInternalComments] = useState(true);

  const comments = request.comments || [];
  const isCustomer = userRole === ROLES.CUSTOMER;
  const isAdmin = userRole === ROLES.DISTRICT_ADMIN || userRole === ROLES.SUPER_ADMIN;
  const isAgent = userRole === ROLES.AGENT;
  const canAddComment = request.commentsEnabled !== false;
  const canSeeInternal = isAdmin || isAgent;

  // Filter comments based on visibility
  const visibleComments = comments.filter((comment) => {
    if (comment.isInternal && !canSeeInternal) return false;
    if (comment.isInternal && !showInternalComments) return false;
    return true;
  });

  // Sort by date (newest first - latest comments at top for visibility without scrolling)
  const sortedComments = [...visibleComments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // We don't auto-scroll anymore since newest comments are at top

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment) return;

    try {
      await onAddComment(newComment.trim(), isInternal);
      setNewComment('');
    } catch {
      // Error handled by parent
    }
  };

  const getRoleBadge = (comment: CommentType) => {
    const author = comment.author;
    if (!author) return null;

    const roles = author.roles || [];
    if (roles.includes(ROLES.SUPER_ADMIN)) {
      return (
        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          Super Admin
        </Badge>
      );
    }
    if (roles.includes(ROLES.DISTRICT_ADMIN)) {
      return (
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Admin
        </Badge>
      );
    }
    if (roles.includes(ROLES.AGENT)) {
      return (
        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Agent
        </Badge>
      );
    }
    return null;
  };

  const internalCount = comments.filter((c) => c.isInternal).length;
  const totalCount = comments.length;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          Comments
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {totalCount}
            </Badge>
          )}
        </span>
      }
      icon={MessageSquare}
      isLoading={isLoading}
      className={className}
      id="comments-section"
      actions={
        canSeeInternal && internalCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInternalComments(!showInternalComments)}
            className="text-xs"
          >
            {showInternalComments ? (
              <>
                <EyeOff className="mr-1 h-3 w-3" />
                Hide Internal ({internalCount})
              </>
            ) : (
              <>
                <Eye className="mr-1 h-3 w-3" />
                Show Internal ({internalCount})
              </>
            )}
          </Button>
        )
      }
    >
      {/* Comments List */}
      {sortedComments.length === 0 ? (
        <EmptyState
          title="No Comments Yet"
          description="Start a conversation about this request."
          icon={MessageSquare}
        />
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          {sortedComments.map((comment) => {
            const author = comment.author;
            const isOwnComment = author?.id === currentUser.id;
            
            return (
              <div
                key={comment.id}
                className={cn(
                  'flex gap-3 p-3 rounded-lg transition-colors hover:bg-muted/30',
                  isOwnComment && 'flex-row-reverse bg-muted/20'
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background shadow-sm">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {author?.firstName?.[0]}{author?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'flex-1 max-w-[85%]',
                    isOwnComment && 'flex flex-col items-end'
                  )}
                >
                  {/* Header */}
                  <div className={cn(
                    'flex items-center gap-2 mb-1.5 flex-wrap',
                    isOwnComment && 'flex-row-reverse'
                  )}>
                    <span className="text-sm font-semibold">
                      {author?.firstName} {author?.lastName}
                    </span>
                    {getRoleBadge(comment)}
                    {comment.isInternal && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                        <Lock className="mr-1 h-3 w-3" />
                        Internal
                      </Badge>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div
                    className={cn(
                      'rounded-xl px-4 py-2.5 shadow-sm',
                      isOwnComment
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : comment.isInternal
                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-bl-none'
                        : 'bg-muted rounded-bl-none'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  </div>
                  
                  {/* Timestamp */}
                  <span className={cn(
                    'text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1',
                    isOwnComment && 'text-right'
                  )}>
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Input */}
      {!disabled && canAddComment && onAddComment ? (
        <>
          <SectionDivider />
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[80px] pr-20 resize-none"
                maxLength={500}
                disabled={isActionLoading}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/500
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              {/* Internal toggle for admins/agents */}
              {canSeeInternal && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-gray-300"
                    disabled={isActionLoading}
                  />
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Internal (staff only)
                  </span>
                </label>
              )}
              {!canSeeInternal && <div />}
              
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || isActionLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </div>
          </form>
        </>
      ) : (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          {disabledMessage}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * CommentBubble - Compact comment for timeline/activity
 */
interface CommentBubbleProps {
  comment: CommentType;
  className?: string;
}

export function CommentBubble({ comment, className }: CommentBubbleProps) {
  const author = comment.author;

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="text-xs">
          {author?.firstName?.[0]}{author?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{author?.firstName}</span>
          {': '}
          <span className="text-muted-foreground line-clamp-2">{comment.content}</span>
        </p>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export default CommentsSection;
