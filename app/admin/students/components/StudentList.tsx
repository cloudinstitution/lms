"use client";

import React from 'react';
import { Student, SortField, SortOrder } from '@/types/student';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StudentRowActions } from './StudentRowActions';
import { formatDate } from '@/lib/student-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  selectedStudents: string[];
  onSelect: (studentId: string) => void;
  onSelectAll: (selected: boolean) => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (field: SortField) => void;
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
  onEmail: (student: Student) => void;
  onViewDetails: (student: Student) => void;
  isTeacher?: boolean;
}

export function StudentList({
  students,
  selectedStudents,
  onSelect,
  onSelectAll,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onEmail,
  onViewDetails,
  isTeacher = false
}: StudentListProps) {
  const [showSelection, setShowSelection] = React.useState(false);

  const handleDoubleClick = () => {
    setShowSelection((prev) => !prev);
  };
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
      : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
  };

  return (
    <div onDoubleClick={handleDoubleClick}>
      <Table>
        <TableHeader>
          <TableRow>
            {showSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedStudents.length === students.length &&
                    students.length > 0
                  }
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
            )}
            <TableHead>
              <div
                className="flex items-center hover:text-primary cursor-pointer"
                onClick={() => onSort('name')}
              >
                Name {getSortIcon('name')}
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center">Username</div>
            </TableHead>
            <TableHead>
              <div
                className="flex items-center hover:text-primary cursor-pointer"
                onClick={() => onSort('studentId')}
              >
                Student ID {getSortIcon('studentId')}
              </div>
            </TableHead>
            <TableHead>
              <div
                className="flex items-center hover:text-primary cursor-pointer"
                onClick={() => onSort('coursesEnrolled')}
              >
                Courses Enrolled {getSortIcon('coursesEnrolled')}
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center">Status</div>
            </TableHead>
            <TableHead>
              <div
                className="flex items-center hover:text-primary cursor-pointer"
                onClick={() => onSort('joinedDate')}
              >
                Joined Date {getSortIcon('joinedDate')}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              {showSelection && (
                <TableCell>
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={() => onSelect(student.id)}
                  />
                </TableCell>
              )}
              <TableCell>{student.name}</TableCell>
              <TableCell>{student.username}</TableCell>
              <TableCell>{student.studentId}</TableCell>
              <TableCell>{student.coursesEnrolled}</TableCell>
              <TableCell>{student.status || 'N/A'}</TableCell>
              <TableCell>{formatDate(student.joinedDate)}</TableCell>
              <TableCell className="text-right">
                <StudentRowActions
                  student={student}
                  onEdit={() => onEdit(student)}
                  onDelete={() => onDelete(student.id)}
                  onEmail={() => onEmail(student)}
                  onViewDetails={() => onViewDetails(student)}
                  isTeacher={isTeacher}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
