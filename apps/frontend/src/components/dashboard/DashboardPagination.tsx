'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

export function DashboardPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: DashboardPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Items Per Page */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">per page</span>
      </div>

      {/* Page Info */}
      <div className="text-sm text-muted-foreground">
        {totalItems === 0 ? (
          <span>No items found</span>
        ) : (
          <span>
            Showing {startItem} to {endItem} of {totalItems} items
          </span>
        )}
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {/* Show first page */}
          {currentPage > 2 && (
            <>
              <Button variant="outline" size="sm" onClick={() => onPageChange(1)}>
                1
              </Button>
              {currentPage > 3 && <span className="px-2 text-muted-foreground">...</span>}
            </>
          )}

          {/* Show previous page */}
          {currentPage > 1 && (
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)}>
              {currentPage - 1}
            </Button>
          )}

          {/* Current page */}
          <Button variant="default" size="sm" disabled>
            {currentPage}
          </Button>

          {/* Show next page */}
          {currentPage < totalPages && (
            <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)}>
              {currentPage + 1}
            </Button>
          )}

          {/* Show last page */}
          {currentPage < totalPages - 1 && (
            <>
              {currentPage < totalPages - 2 && <span className="px-2 text-muted-foreground">...</span>}
              <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)}>
                {totalPages}
              </Button>
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
