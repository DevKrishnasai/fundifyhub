"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  FileX, 
  Search, 
  Inbox, 
  FolderOpen,
  FileText,
  CreditCard,
  Users,
  ClipboardList,
  type LucideIcon 
} from "lucide-react"

type EmptyStateVariant = "default" | "search" | "requests" | "loans" | "users" | "documents" | "inspections"

interface EmptyStateProps {
  /** Type of empty state for automatic icon and message */
  variant?: EmptyStateVariant
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
  /** Custom icon */
  icon?: LucideIcon
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary"
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
}

const variantConfig: Record<EmptyStateVariant, {
  icon: LucideIcon
  title: string
  description: string
}> = {
  default: {
    icon: Inbox,
    title: "No data available",
    description: "There's nothing to display at the moment.",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search or filter criteria.",
  },
  requests: {
    icon: ClipboardList,
    title: "No requests yet",
    description: "When you submit a loan request, it will appear here.",
  },
  loans: {
    icon: CreditCard,
    title: "No active loans",
    description: "You don't have any active loans at the moment.",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "No users match your current filters.",
  },
  documents: {
    icon: FileText,
    title: "No documents",
    description: "No documents have been uploaded yet.",
  },
  inspections: {
    icon: FolderOpen,
    title: "No inspections",
    description: "No inspections have been scheduled.",
  },
}

/**
 * Consistent empty state component for when there's no data to display
 */
export function EmptyState({
  variant = "default",
  title,
  description,
  icon: CustomIcon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = CustomIcon || config.icon
  
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {title || config.title}
      </h3>
      
      <p className="text-muted-foreground max-w-sm mb-6">
        {description || config.description}
      </p>
      
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button 
              variant={action.variant || "default"} 
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
