"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, Ban, type LucideIcon } from "lucide-react"

type ErrorVariant = "default" | "network" | "server" | "unauthorized" | "notFound"

interface ErrorStateProps {
  /** Type of error for automatic icon and message */
  variant?: ErrorVariant
  /** Custom title */
  title?: string
  /** Custom description/error message */
  description?: string
  /** Custom icon */
  icon?: LucideIcon
  /** Retry action */
  onRetry?: () => void
  /** Custom retry button label */
  retryLabel?: string
  /** Go back action */
  onBack?: () => void
  /** Show error code or reference */
  errorCode?: string
  /** Additional CSS classes */
  className?: string
}

const variantConfig: Record<ErrorVariant, {
  icon: LucideIcon
  title: string
  description: string
}> = {
  default: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
  },
  network: {
    icon: WifiOff,
    title: "Network error",
    description: "Unable to connect. Please check your internet connection and try again.",
  },
  server: {
    icon: ServerCrash,
    title: "Server error",
    description: "Our servers are experiencing issues. Please try again later.",
  },
  unauthorized: {
    icon: Ban,
    title: "Access denied",
    description: "You don't have permission to access this resource.",
  },
  notFound: {
    icon: AlertTriangle,
    title: "Not found",
    description: "The requested resource could not be found.",
  },
}

/**
 * Consistent error state component for displaying errors
 */
export function ErrorState({
  variant = "default",
  title,
  description,
  icon: CustomIcon,
  onRetry,
  retryLabel = "Try again",
  onBack,
  errorCode,
  className,
}: ErrorStateProps) {
  const config = variantConfig[variant]
  const Icon = CustomIcon || config.icon
  
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-destructive" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {title || config.title}
      </h3>
      
      <p className="text-muted-foreground max-w-sm mb-4">
        {description || config.description}
      </p>
      
      {errorCode && (
        <p className="text-xs text-muted-foreground font-mono mb-4">
          Error code: {errorCode}
        </p>
      )}
      
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Go back
          </Button>
        )}
      </div>
    </div>
  )
}
