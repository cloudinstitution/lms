import React from 'react';
import { StudentDialog } from './StudentDialog';
import { Button } from '@/components/ui/button';

interface DeleteStudentDialogProps {
  studentCount: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteStudentDialog({
  studentCount,
  open,
  onClose,
  onConfirm,
}: DeleteStudentDialogProps) {
  return (
    <StudentDialog
      open={open}
      onClose={onClose}
      title="Delete Students"
      description={`Are you sure you want to delete ${studentCount} selected student${
        studentCount !== 1 ? 's' : ''
      }? This action cannot be undone.`}
    >
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </StudentDialog>
  );
}
