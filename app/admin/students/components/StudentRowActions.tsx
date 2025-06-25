"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash, Mail, Eye } from "lucide-react"
import { Student } from "@/types/student"

interface StudentRowActionsProps {
  student: Student
  onEdit: (student: Student) => void
  onDelete: (studentId: string) => void
  onEmail: (student: Student) => void
  onViewDetails: (student: Student) => void
  isTeacher?: boolean
}

export function StudentRowActions({ 
  student,
  onEdit,
  onDelete,
  onEmail,
  onViewDetails,
  isTeacher = false
}: StudentRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewDetails(student)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        {!isTeacher && (
          <>
            <DropdownMenuItem onClick={() => onEdit(student)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEmail(student)}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(student.id)}
              className="text-red-600"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
