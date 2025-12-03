"use client"

import { ReactNode, useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { usePathname } from "next/navigation"

interface AppLayoutProps {
  children: ReactNode
  /** Hide sidebar and show full-width content */
  fullWidth?: boolean
  /** Additional classes for the main content area */
  className?: string
  /** Hide the header */
  hideHeader?: boolean
}

/**
 * Application layout wrapper with header and sidebar navigation
 * 
 * Use this layout for authenticated pages that need navigation.
 * For public pages or full-screen layouts, set fullWidth=true.
 */
export function AppLayout({ children, fullWidth = false, className, hideHeader = false }: AppLayoutProps) {
  const { isLoggedIn } = useAuth()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Don't show sidebar for unauthenticated users or full-width mode
  if (!isLoggedIn || fullWidth) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />
      
      {/* Main content area */}
      <div className={cn(
        "flex flex-col transition-all duration-200",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Header */}
        {!hideHeader && (
          <Header 
            onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            isMobileMenuOpen={mobileMenuOpen}
          />
        )}
        
        {/* Page content */}
        <main className={cn("flex-1 overflow-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * Page container with consistent padding and max-width
 */
export function PageContainer({ 
  children, 
  className,
  maxWidth = "7xl"
}: { 
  children: ReactNode
  className?: string 
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full"
}) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  }

  return (
    <div className={cn(
      "mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Page header with title and optional actions
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8", className)}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
