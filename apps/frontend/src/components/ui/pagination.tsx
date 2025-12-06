"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface PaginationProps {
  /** Current page number (1-indexed) */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  total: number
  /** Items per page */
  limit: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void
  /** Available page size options */
  pageSizeOptions?: number[]
  /** Show page size selector */
  showPageSize?: boolean
  /** Show total count */
  showTotal?: boolean
  /** Additional class name */
  className?: string
}

/**
 * Reusable pagination component following the design system
 */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = "",
}: PaginationProps) {
  const startItem = Math.min((page - 1) * limit + 1, total)
  const endItem = Math.min(page * limit, total)

  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Left side - Total and page size */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
        {showTotal && total > 0 && (
          <span>
            Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
            <span className="font-medium text-foreground">{endItem}</span> of{" "}
            <span className="font-medium text-foreground">{total.toLocaleString()}</span> results
          </span>
        )}
        
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right side - Navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">First page</span>
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page indicator */}
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Last page</span>
        </Button>
      </div>
    </div>
  )
}
