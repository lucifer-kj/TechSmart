"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CustomerFiltersProps {
  filters: {
    search: string;
    status: 'all' | 'active' | 'inactive' | 'banned';
    dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  };
  onFiltersChange: (filters: { search: string; status: 'all' | 'active' | 'inactive' | 'banned'; dateRange: 'all' | 'today' | 'week' | 'month' | 'year' }) => void;
  selectedCount: number;
  onBulkAction: (action: 'ban' | 'activate' | 'export') => void;
}

export function CustomerFilters({ 
  filters, 
  onFiltersChange, 
  selectedCount, 
  onBulkAction 
}: CustomerFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (status: 'all' | 'active' | 'inactive' | 'banned') => {
    onFiltersChange({ ...filters, status });
  };

  const handleDateRangeChange = (dateRange: 'all' | 'today' | 'week' | 'month' | 'year') => {
    onFiltersChange({ ...filters, dateRange });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search customers by name, email, or phone..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <div className="flex space-x-1">
                {[
                  { value: 'all', label: 'All', count: null },
                  { value: 'active', label: 'Active', count: null },
                  { value: 'inactive', label: 'Inactive', count: null },
                  { value: 'banned', label: 'Banned', count: null }
                ].map((status) => (
                  <Button
                    key={status.value}
                    variant={filters.status === status.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(status.value as 'all' | 'active' | 'inactive' | 'banned')}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Created:</span>
              <div className="flex space-x-1">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'year', label: 'This Year' }
                ].map((range) => (
                  <Button
                    key={range.value}
                    variant={filters.dateRange === range.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleDateRangeChange(range.value as 'all' | 'today' | 'week' | 'month' | 'year')}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{selectedCount} selected</Badge>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Bulk actions:
                </span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction('activate')}
                >
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction('ban')}
                >
                  Ban
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction('export')}
                >
                  Export Selected
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
