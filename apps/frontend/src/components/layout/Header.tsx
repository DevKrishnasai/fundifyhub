"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { ThemeToggle } from "@/components/theme-toggle"
import { useNotifications, useUnreadNotificationCount } from "@/hooks/queries"
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  Shield,
  UserCheck,
  Menu,
  X,
  ChevronDown,
  Circle,
} from "lucide-react"
import logger from "@/lib/logger"

interface HeaderProps {
  onMenuClick?: () => void
  isMobileMenuOpen?: boolean
  className?: string
}

export function Header({ onMenuClick, isMobileMenuOpen, className }: HeaderProps) {
  const { user, logout, getDisplayName, isSuperAdmin, isDistrictAdmin, isAgent, isCustomer } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const notificationsQuery = useNotifications(
    { limit: 5, page: 1 },
    { enabled: Boolean(user), staleTime: 30_000 }
  )
  const unreadCountQuery = useUnreadNotificationCount({ enabled: Boolean(user) })

  const notifications = useMemo(() => notificationsQuery.data?.notifications ?? [], [notificationsQuery.data])
  const unreadCount = unreadCountQuery.data?.count ?? 0

  if (!user) return null

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      logger.error("Logout error:", error as Error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getInitials = () => {
    const name = getDisplayName() || user.email || ""
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ""
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ""
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getRoleLabel = () => {
    if (isSuperAdmin()) return "Super Admin"
    if (isDistrictAdmin()) return "District Admin"
    if (isAgent()) return "Agent"
    if (isCustomer()) return "Customer"
    return "User"
  }

  const getRoleIcon = () => {
    if (isSuperAdmin() || isDistrictAdmin()) return <Shield className="w-4 h-4" />
    if (isAgent()) return <UserCheck className="w-4 h-4" />
    return <User className="w-4 h-4" />
  }

  const formatTimeAgo = (dateInput: string | Date) => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // TODO: Implement global search
      console.log("Search:", searchQuery)
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6",
        className
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuClick}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Logo - visible on mobile when sidebar is hidden */}
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden shrink-0">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">
          F
        </div>
        <span className="font-semibold hidden sm:inline">FundifyHub</span>
      </Link>

      {/* Search - centered */}
      <form onSubmit={handleSearch} className="hidden md:flex flex-1 justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search requests, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </form>

      {/* Spacer for mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right side actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Search button for mobile */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Link href="/notifications" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const isRead = notification.isRead ?? (notification as { read?: boolean }).read ?? false
                  return (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <p className="text-sm font-medium flex-1">{notification.title}</p>
                        {!isRead && (
                          <Circle className="h-2 w-2 fill-primary text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </DropdownMenuItem>
                  )
                })
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="w-full text-center text-primary justify-center">
                See all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 px-2 gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {getDisplayName() || user.email}
                </span>
                <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {getDisplayName() || user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 pt-1">
                  {getRoleIcon()}
                  <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
