import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Student } from '@/types/student';

interface StudentActionsProps {
  selectedCount: number;  onBulkDelete: () => void;
  onBulkStatusChange: (status: Student['status']) => void;
  onEmailSelected: () => void;
}

export function StudentActions({
  selectedCount,  onBulkDelete,
  onBulkStatusChange,
  onEmailSelected,
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

          <Button
            variant="outline"
            onClick={onEmailSelected}
          >
            Email Selected ({selectedCount})
          </Button>
        </>
      )}
    </div>
  );
}
