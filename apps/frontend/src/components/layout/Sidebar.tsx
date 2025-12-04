"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
  NAV_ITEMS,
  hasPermission,
  type NavMenuItem,
  type PERMISSION,
} from "@fundifyhub/types"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  ScrollText,
  Bell,
  Upload,
  MapPin,
  Package,
} from "lucide-react"

// Icon mapping from string to component
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  ScrollText,
  Bell,
  Upload,
  MapPin,
  Package,
}

interface SidebarProps {
  className?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function Sidebar({ 
  className, 
  collapsed: controlledCollapsed, 
  onCollapsedChange,
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange 
}: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  
  // Use controlled state if provided, otherwise internal state
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  
  const collapsed = controlledCollapsed ?? internalCollapsed
  const mobileOpen = controlledMobileOpen ?? internalMobileOpen
  
  const setCollapsed = (value: boolean) => {
    onCollapsedChange?.(value)
    setInternalCollapsed(value)
  }
  
  const setMobileOpen = (value: boolean) => {
    onMobileOpenChange?.(value)
    setInternalMobileOpen(value)
  }

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Filter nav items based on user roles and permissions
  const getFilteredNavItems = (): NavMenuItem[] => {
    if (!user) return []

    return NAV_ITEMS.filter((item) => {
      // Check role requirement
      if (item.roles && item.roles.length > 0) {
        const userRoles = user.roles?.map((r: string) => r.toUpperCase()) || []
        const hasRequiredRole = item.roles.some((role) => 
          userRoles.includes(role.toUpperCase())
        )
        if (!hasRequiredRole) return false
      }

      // Check permission requirement
      if (item.permissions && item.permissions.length > 0) {
        const hasRequiredPermission = item.permissions.some((permission) =>
          hasPermission(user.roles || [], permission as PERMISSION)
        )
        if (!hasRequiredPermission) return false
      }

      return true
    })
  }

  // Check if a path is active
  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === pathname) return true
    // Check if current path starts with href (for nested routes, excluding dashboard)
    if (href !== '/dashboard' && pathname.startsWith(href + "/")) return true
    return false
  }

  const navItems = getFilteredNavItems()

  const renderNavItem = (item: NavMenuItem) => {
    const IconComponent = iconMap[item.icon] || LayoutDashboard
    const active = isActive(item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <IconComponent className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <span className="flex-1">{item.label}</span>
        )}
        {!collapsed && item.badge && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              FH
            </div>
            <span className="font-semibold text-lg">FundifyHub</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              FH
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
      </ScrollArea>

      {/* User info when collapsed */}
      {collapsed && user && (
        <div className="p-3 border-t">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium mx-auto uppercase">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar wrapper - allows positioning collapse button */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden lg:block transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar content */}
        <aside
          className={cn(
            "h-full flex flex-col border-r bg-background",
            className
          )}
        >
          {sidebarContent}
        </aside>

        {/* Collapse button - positioned at edge of sidebar */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-7 z-50 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>
    </>
  )
}
