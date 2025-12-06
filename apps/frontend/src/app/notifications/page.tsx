"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead,
  useDeleteNotification 
} from "@/hooks/queries/useNotifications"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { NotificationsListSkeleton } from "@/components/loading-skeletons"
import toast from "@/lib/toast"
import { cn } from "@/lib/utils"
import { 
  Bell, CheckCheck, Loader2, Trash2, Circle, 
  CreditCard, FileText, UserCheck, AlertCircle,
  Clock, CheckCircle, XCircle, Info
} from "lucide-react"

interface NotificationItem {
  id: string
  title: string
  message: string
  type?: string | undefined
  read?: boolean | undefined
  createdAt: string
  data?: {
    requestId?: string | undefined
    loanId?: string | undefined
    actionUrl?: string | undefined
  } | undefined
}

function NotificationsSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <NotificationsListSkeleton items={5} />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function getNotificationIcon(type: string | undefined) {
  switch (type) {
    case "LOAN_STATUS":
    case "REQUEST_STATUS":
      return <FileText className="h-5 w-5" />
    case "PAYMENT":
    case "EMI_REMINDER":
      return <CreditCard className="h-5 w-5" />
    case "AGENT_ASSIGNED":
    case "USER":
      return <UserCheck className="h-5 w-5" />
    case "ALERT":
    case "WARNING":
      return <AlertCircle className="h-5 w-5" />
    case "SUCCESS":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "ERROR":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "INFO":
      return <Info className="h-5 w-5 text-blue-500" />
    default:
      return <Bell className="h-5 w-5" />
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString("en-IN", { 
    day: "numeric", 
    month: "short" 
  })
}

function NotificationItemComponent({ 
  notification, 
  onMarkRead, 
  onDelete,
  isMarkingRead,
  isDeleting 
}: { 
  notification: NotificationItem
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  isMarkingRead: boolean
  isDeleting: boolean
}) {
  return (
    <div 
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
        notification.read ? "bg-background" : "bg-muted/50"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg",
        notification.read ? "bg-muted" : "bg-primary/10"
      )}>
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium",
            !notification.read && "text-foreground"
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <Circle className="h-2 w-2 fill-primary text-primary" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(notification.createdAt)}
          </span>
          {notification.data?.requestId && (
            <Badge variant="outline" className="text-xs">
              Request #{notification.data.requestId.slice(0, 8)}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!notification.read && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onMarkRead(notification.id)}
            disabled={isMarkingRead}
          >
            {isMarkingRead ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(notification.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

function NotificationsContent() {
  const { user, isLoading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [markingReadId, setMarkingReadId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // React Query hooks
  const { 
    data, 
    isLoading, 
    isError 
  } = useNotifications(
    { page: currentPage, limit: pageSize },
    { enabled: !!user }
  )

  const markReadMutation = useMarkNotificationRead()
  const markAllReadMutation = useMarkAllNotificationsRead()
  const deleteMutation = useDeleteNotification()

  // Transform data to match component expectations
  const notifications: NotificationItem[] = (data?.notifications || []).map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    data: n.data as NotificationItem['data']
  }))
  const pagination = data?.pagination

  const handleMarkRead = async (id: string) => {
    setMarkingReadId(id)
    try {
      await markReadMutation.mutateAsync(id)
    } catch {
      toast.error("Failed to mark as read")
    } finally {
      setMarkingReadId(null)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync()
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Failed to mark all as read")
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Notification deleted")
    } catch {
      toast.error("Failed to delete notification")
    } finally {
      setDeletingId(null)
    }
  }

  if (authLoading) {
    return <NotificationsSkeleton />
  }

  if (!user) {
    return null
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Notifications"
          description="Stay updated with your account activity."
          actions={
            unreadCount > 0 ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all read ({unreadCount})
              </Button>
            ) : null
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-medium">Failed to load notifications</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-lg border">
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                You&apos;re all caught up! New notifications will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {notifications.length} Total
              </Badge>
              {unreadCount > 0 && (
                <Badge variant="default">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>

            {/* Notification List */}
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItemComponent
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  isMarkingRead={markingReadId === notification.id}
                  isDeleting={deletingId === notification.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 0 && (
              <div className="mt-6">
                <Pagination
                  page={currentPage}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize)
                    setCurrentPage(1)
                  }}
                  pageSizeOptions={[10, 20, 50]}
                />
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  )
}
