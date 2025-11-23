'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Calendar } from 'lucide-react';
import { REQUEST_STATUS } from '@fundifyhub/types';

interface FilterOption {
  label: string;
  value: string;
}

interface DashboardFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  districtFilter?: string;
  onDistrictChange?: (value: string) => void;
  districts?: FilterOption[];
  showDistrictFilter?: boolean;
  onClearFilters?: () => void;
  customFilters?: React.ReactNode;
}

const STATUS_OPTIONS: FilterOption[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: REQUEST_STATUS.PENDING },
  { label: 'Under Review', value: REQUEST_STATUS.UNDER_REVIEW },
  { label: 'Offer Sent', value: REQUEST_STATUS.OFFER_SENT },
  { label: 'Offer Accepted', value: REQUEST_STATUS.OFFER_ACCEPTED },
  { label: 'Offer Declined', value: REQUEST_STATUS.OFFER_DECLINED },
  { label: 'Inspection Scheduled', value: REQUEST_STATUS.INSPECTION_SCHEDULED },
  { label: 'Inspection In Progress', value: REQUEST_STATUS.INSPECTION_IN_PROGRESS },
  { label: 'Approved', value: REQUEST_STATUS.APPROVED },
  { label: 'Active', value: REQUEST_STATUS.ACTIVE },
  { label: 'Completed', value: REQUEST_STATUS.COMPLETED },
  { label: 'Rejected', value: REQUEST_STATUS.REJECTED },
  { label: 'Cancelled', value: REQUEST_STATUS.CANCELLED },
];

export function DashboardFilters({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusChange,
  districtFilter,
  onDistrictChange,
  districts = [],
  showDistrictFilter = false,
  onClearFilters,
  customFilters,
}: DashboardFiltersProps) {
  const hasActiveFilters = searchValue || statusFilter !== 'all' || (showDistrictFilter && districtFilter !== 'all');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or request number..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* District Filter */}
        {showDistrictFilter && onDistrictChange && (
          <Select value={districtFilter} onValueChange={onDistrictChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by district" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district.value} value={district.value}>
                  {district.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Custom Filters Slot */}
        {customFilters}

        {/* Clear Filters */}
        {hasActiveFilters && onClearFilters && (
          <Button variant="outline" onClick={onClearFilters} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
