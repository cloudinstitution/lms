"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FilterOptions } from '@/types/student';
import { Filter, X } from 'lucide-react';

interface StudentFiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
}

export function StudentFilters({ filters, onFilterChange }: StudentFiltersProps) {
  const handleDateRangeChange = (from: Date | null = null, to: Date | null = null) => {
    onFilterChange({
      dateRange: {
        from: from ?? filters.dateRange.from,
        to: to ?? filters.dateRange.to,
      }
    });
  };

  const handleRemoveFilter = (key: keyof FilterOptions) => {
    switch (key) {
      case 'status':
        onFilterChange({ status: [] });
        break;
      case 'dateRange':
        onFilterChange({ dateRange: { from: null, to: null } });
        break;
      case 'coursesEnrolled':
        onFilterChange({ coursesEnrolled: undefined });
        break;
      case 'courseName':
        onFilterChange({ courseName: undefined });
        break;
      case 'courseID':
        onFilterChange({ courseID: undefined });
        break;
    }
  };

  return (
    <div className="relative inline-block">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-9 bg-secondary hover:bg-primary hover:text-white transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          align="start"
          className="relative w-screen sm:w-[550px] lg:w-[650px] p-0 overflow-hidden"
        >          <div className="flex flex-col divide-y divide-border">
            <div className="px-6 py-4 bg-muted/50">
              <h2 className="text-lg font-semibold">Filter Students</h2>
              <p className="text-sm text-muted-foreground">Apply filters to narrow down student results</p>
            </div>
            
            <div className="px-8 py-6 space-y-8 overflow-y-auto max-h-[calc(80vh-6rem)] pb-40">
              {/* Status Filter */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Status</h3>
                <Select 
                  value={filters.status[0] || 'all'}
                  onValueChange={(value) => {
                    onFilterChange({
                      status: value === 'all' ? [] : [value]
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Date Range</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <span className="text-sm text-muted-foreground">From</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {filters.dateRange.from
                            ? filters.dateRange.from.toLocaleDateString()
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.from || undefined}
                          onSelect={(date) => handleDateRangeChange(date || null, null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 space-y-2">
                    <span className="text-sm text-muted-foreground">To</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {filters.dateRange.to
                            ? filters.dateRange.to.toLocaleDateString()
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.to || undefined}
                          onSelect={(date) => handleDateRangeChange(null, date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Course Filters */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Course Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Total Courses Enrolled</label>
                    <Input
                      type="number"
                      placeholder="Minimum number"
                      value={filters.coursesEnrolled || ''}
                      onChange={(e) => onFilterChange({
                        coursesEnrolled: e.target.value ? parseInt(e.target.value, 10) : undefined
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Course Name</label>
                    <Input
                      type="text"
                      placeholder="Filter by course name"
                      value={filters.courseName || ''}
                      onChange={(e) => onFilterChange({ courseName: e.target.value || undefined })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Course ID</label>
                    <Input
                      type="text"
                      placeholder="Filter by course ID"
                      value={filters.courseID || ''}
                      onChange={(e) => onFilterChange({
                        courseID: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
