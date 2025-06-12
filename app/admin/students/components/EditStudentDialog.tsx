import React from 'react';
import { StudentDialog } from './StudentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Student } from '../../../../types/student';

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onSave: (student: Partial<Student>) => void;
}

export function EditStudentDialog({
  student,
  open,
  onClose,
  onSave,
}: EditStudentDialogProps) {
  const [formData, setFormData] = React.useState<Partial<Student>>({});

  React.useEffect(() => {
    if (student) {
      setFormData(student);
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <StudentDialog
      open={open}
      onClose={onClose}
      title={student ? 'Edit Student' : 'Add Student'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name">Name</label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>          <Input
            id="username"
            type="email"
            value={formData.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="status">Status</label>          <Select
            value={formData.status || ''}
            onValueChange={(value) => handleChange('status', value)}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </StudentDialog>
  );
}
