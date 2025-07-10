import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Student } from '@/types/student';
import { Mail, Users, Filter } from 'lucide-react';

interface StudentActionsProps {
  selectedCount: number;
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: Student['status']) => void;
  onBulkEmail: () => void;
}

export function StudentActions({
  selectedCount,
  filteredCount,
  totalCount,
  hasActiveFilters,
  onBulkDelete,
  onBulkStatusChange,
  onBulkEmail,
}: StudentActionsProps) {
  return (
    <div className="flex gap-4 mb-6">
      {selectedCount > 0 && (
        <>
          <Button
            variant="destructive"
            onClick={onBulkDelete}
          >
            Delete Selected ({selectedCount})
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Change Status ({selectedCount})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onBulkStatusChange('Active')}>
                Set Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatusChange('Inactive')}>
                Set Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Email Button */}
      {selectedCount > 0 && (
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={onBulkEmail}
          disabled={selectedCount === 0}
        >
          <Mail className="h-4 w-4" />
          Send Email ({selectedCount})
        </Button>
      )}
    </div>
  );
}
