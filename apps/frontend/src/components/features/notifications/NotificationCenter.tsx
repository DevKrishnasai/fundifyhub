"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  FileText,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Info,
  Megaphone,
  Shield,
  Archive,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import apiClient from "@/lib/api-client"

export type NotificationType =
  | "REQUEST_UPDATE"
  | "PAYMENT_REMINDER"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "SYSTEM_ALERT"
  | "PROMOTIONAL"
  | "SECURITY"

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

export interface NotificationItem {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  createdAt: Date | string
}

interface NotificationCenterProps {
  className?: string
}

const notificationTypeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  REQUEST_UPDATE: { 
    icon: <FileText className="h-4 w-4" />, 
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" 
  },
  PAYMENT_REMINDER: { 
    icon: <IndianRupee className="h-4 w-4" />, 
    color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" 
  },
  PAYMENT_SUCCESS: { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: "text-green-600 bg-green-100 dark:bg-green-900/30" 
  },
  PAYMENT_FAILED: { 
    icon: <AlertCircle className="h-4 w-4" />, 
    color: "text-red-600 bg-red-100 dark:bg-red-900/30" 
  },
  SYSTEM_ALERT: { 
    icon: <Info className="h-4 w-4" />, 
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" 
  },
  PROMOTIONAL: { 
    icon: <Megaphone className="h-4 w-4" />, 
    color: "text-pink-600 bg-pink-100 dark:bg-pink-900/30" 
  },
  SECURITY: { 
    icon: <Shield className="h-4 w-4" />, 
    color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" 
  },
}

const priorityColors: Record<NotificationPriority, string> = {
  LOW: "",
  NORMAL: "",
  HIGH: "border-l-2 border-l-yellow-500",
  URGENT: "border-l-2 border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
}

function NotificationItemComponent({ 
  notification, 
  onMarkRead, 
  onArchive 
}: { 
  notification: NotificationItem
  onMarkRead: (id: string) => void
  onArchive: (id: string) => void
}) {
  const config = notificationTypeConfig[notification.type]
  const priorityClass = priorityColors[notification.priority]
  const createdAt = typeof notification.createdAt === "string" 
    ? new Date(notification.createdAt) 
    : notification.createdAt

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        !notification.isRead && "bg-accent/30",
        priorityClass
      )}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <div className={cn("rounded-full p-2 shrink-0", config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium truncate", !notification.isRead && "font-semibold")}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onArchive(notification.id)
              }}
            >
              <Archive className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
          {notification.actionUrl && (
            <Link
              href={notification.actionUrl}
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              View <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      {!notification.isRead && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </div>
  )
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get(BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST, {
        params: { limit: 10, isArchived: false }
      })
      if (response.data.success) {
        setNotifications(response.data.data.notifications)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    try {
      await apiClient.put(BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(id))
    } catch (error) {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      )
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleArchive = async (id: string) => {
    // Optimistic update
    const archived = notifications.find((n) => n.id === id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await apiClient.put(BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.ARCHIVE(id))
    } catch (error) {
      // Revert on failure
      if (archived) {
        setNotifications((prev) => [...prev, archived])
      }
      console.error("Failed to archive notification:", error)
    }
  }

  const handleMarkAllRead = async () => {
    // Optimistic update
    const previousState = notifications.map((n) => ({ ...n }))
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await apiClient.put(BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ)
    } catch (error) {
      // Revert on failure
      setNotifications(previousState)
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItemComponent
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="w-full justify-center text-primary">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
