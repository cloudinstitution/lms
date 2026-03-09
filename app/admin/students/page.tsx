"use client"

import React from 'react';
import { StudentList } from './components/StudentList';
import { StudentFilters } from './components/StudentFilters';
import { StudentActions } from './components/StudentActions';
import { EditStudentDialog } from './components/EditStudentDialog';
import { EmailStudentDialog } from './components/EmailStudentDialog';
import { BulkEmailDialog } from './components/BulkEmailDialog';
import { DeleteStudentDialog } from './components/DeleteStudentDialog';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  fetchStudents,
  updateStudent,
  bulkDeleteStudents,
  bulkUpdateStudentStatus,
} from '@/lib/student-service';
import { filterStudents } from '@/lib/student-utils';
import { convertStudentsToCSV, downloadCSV, exportStudentsToExcel } from '@/lib/student-export-utils';
import type {
  Student,
  FilterOptions,
  PaginationState,
  SortField
} from '@/types/student';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Download, Plus, X, FileSpreadsheet, FileText } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from '@/lib/auth-context';
import { getAdminSession } from '@/lib/session-storage';

// Helper function to sort students
const sortStudents = (students: Student[], field: SortField, direction: 'asc' | 'desc'): Student[] => {
  return [...students].sort((a, b) => {
    let comparison = 0;
    
    // Handle special cases for each field type
    if (field === 'coursesEnrolled') {
      comparison = (a[field] || 0) - (b[field] || 0);
    } else if (field === 'joinedDate') {
      comparison = new Date(a[field]).getTime() - new Date(b[field]).getTime();
    } else {
      comparison = String(a[field] || '').localeCompare(String(b[field] || ''));
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
};

export default function AdminStudents() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Get user authentication data and claims
  const { userClaims } = useAuth()
  const adminData = getAdminSession()
  
  // Determine if user is teacher and get their assigned courses
  const isTeacher = userClaims?.role === 'teacher' || adminData?.role === 'teacher'
  const assignedCourses = userClaims?.assignedCourses || adminData?.assignedCourses || []

  const [filters, setFilters] = React.useState<FilterOptions>({
    status: [],
    dateRange: {
      from: null,
      to: null
    },
    coursesEnrolled: undefined
  });
  const [sort, setSort] = React.useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: 'name',
    direction: 'asc'
  });

  const [pagination, setPagination] = React.useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10
  });

  // Dialog states
  const [editDialog, setEditDialog] = React.useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null
  });
  const [emailDialog, setEmailDialog] = React.useState<{
    open: boolean;
    singleStudent: Student | null;
  }>({
    open: false,
    singleStudent: null
  });
  const [bulkEmailDialog, setBulkEmailDialog] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState(false);
  const [viewDetailsDialog, setViewDetailsDialog] = React.useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null
  });

  // Fetch students on mount
  React.useEffect(() => {
    loadStudents();
  }, []);
  const loadStudents = async () => {
    try {
      setLoading(true);
      const userRole = isTeacher ? 'teacher' : 'admin';
      const data = await fetchStudents(userRole, assignedCourses);
      setStudents(data);
    } catch (error) {
      toast.error('Failed to load students', {
        description: 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };// Filter and sort students
  const filteredStudents = React.useMemo(() => {
    // Apply search filter first
    let result = [...students];
    if (searchQuery) {
      result = result.filter(
        (student) =>
          student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.phoneNumber?.includes(searchQuery) ||
          student.studentId?.includes(searchQuery),
      );
    }
    // Apply other filters
    result = filterStudents(result, '', filters);
    // Apply sorting
    if (sort.field) {
      result = sortStudents(result, sort.field, sort.direction);
    }
    return result;
  }, [students, searchQuery, filters, sort]);

  // Get paginated students
  const paginatedStudents = React.useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, pagination.currentPage, pagination.itemsPerPage]);

  // Get total pages
  const totalPages = React.useMemo(() => {
    return Math.ceil(filteredStudents.length / pagination.itemsPerPage);
  }, [filteredStudents.length, pagination.itemsPerPage]);

  // Selection handlers
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    setSelectedStudents((prev) =>
      prev.length === filteredStudents.length
        ? []
        : filteredStudents.map((s) => s.id)
    );
  };
  // Sort handler
  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Edit handlers
  const handleEditStudent = async (studentData: Partial<Student>) => {
    try {
      if (editDialog.student?.id) {
        await updateStudent(editDialog.student.id, studentData);
        await loadStudents();
        setEditDialog({ open: false, student: null });
        toast.success('Student updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update student', {
        description: 'Please try again later',
      });
    }
  };

  // Delete handlers
  const handleDeleteConfirm = async () => {
    try {
      await bulkDeleteStudents(selectedStudents);
      await loadStudents();
      setSelectedStudents([]);
      setDeleteDialog(false);
      toast.success('Students deleted successfully');
    } catch (error) {
      toast.error('Failed to delete students', {
        description: 'Please try again later',
      });
    }
  };

  // Bulk status update handler
  const handleBulkStatusChange = async (status: Student['status']) => {
    try {
      if (status) {
        await bulkUpdateStudentStatus(selectedStudents, status);
        await loadStudents();
        setSelectedStudents([]);
        toast.success('Student status updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update student status', {
        description: 'Please try again later',
      });
    }
  };

  // Email handler
  const handleSendEmail = async (subject: string, message: string) => {
    try {
      setEmailDialog({ open: false, singleStudent: null });
      
      // Determine which students to email
      const targetStudents = emailDialog.singleStudent 
        ? [emailDialog.singleStudent.id]
        : selectedStudents;
      
      if (targetStudents.length === 0) {
        toast.error('No students selected', {
          description: 'Please select at least one student to send emails to.',
        });
        return;
      }

      // Show enhanced loading toast
      toast.info('📤 Sending Emails...', {
        description: `Preparing to send emails to ${targetStudents.length} student${targetStudents.length > 1 ? 's' : ''}...`,
      });

      const response = await fetch('/api/students/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: targetStudents,
          subject,
          message,
          recipientType: 'selected'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Enhanced success toast with detailed information
        const emailCount = targetStudents.length;
        const successCount = result.results?.successful || emailCount;
        const failedCount = result.results?.failed || 0;
        
        let successMessage = result.message || `Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}`;
        if (failedCount > 0) {
          successMessage += ` (${failedCount} failed)`;
        }
        
        toast.success('📧 Email Sent Successfully', {
          description: successMessage,
        });
        
        // Clear selected students after successful bulk email
        if (!emailDialog.singleStudent) {
          setSelectedStudents([]);
        }
      } else {
        toast.error('❌ Email Failed', {
          description: result.error || 'Failed to send emails. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('❌ Email Error', {
        description: 'Failed to send emails. Please check your connection and try again.',
      });
    }
  };

  // Bulk email handler
  const handleBulkEmail = async (emailData: {
    subject: string;
    message: string;
    recipientType: 'selected';
  }) => {
    try {
      setBulkEmailDialog(false);

      // Show enhanced loading toast
      toast.info('📤 Sending Bulk Emails...', {
        description: `Preparing to send emails to ${selectedStudents.length} selected students...`,
      });

      const requestBody = {
        subject: emailData.subject,
        message: emailData.message,
        recipientType: 'selected',
        studentIds: selectedStudents
      };

      const response = await fetch('/api/students/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        // Enhanced success toast with detailed information
        const emailCount = selectedStudents.length;
        const successCount = result.results?.successful || emailCount;
        const failedCount = result.results?.failed || 0;
        
        let successMessage = result.message || `Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}`;
        if (failedCount > 0) {
          successMessage += ` (${failedCount} failed)`;
        }
        
        toast.success('📧 Bulk Email Sent Successfully', {
          description: successMessage,
        });
        
        // Clear selected students after successful email
        setSelectedStudents([]);
      } else {
        toast.error('❌ Bulk Email Failed', {
          description: result.error || 'Failed to send bulk emails. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('❌ Bulk Email Error', {
        description: 'Failed to send bulk emails. Please check your connection and try again.',
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch (error) {
      return dateString;
    }
  };

  // Filter change handler
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };
  
  // Helper function to check if there are active filters
  const hasActiveFilters = () => {
    return (
      filters.status.length > 0 ||
      !!filters.courseID ||
      !!filters.courseName ||
      !!filters.coursesEnrolled ||
      !!filters.dateRange.from ||
      !!filters.dateRange.to
    );
  };

  // Also reset pagination when search changes
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // Handle items per page change
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setPagination(prev => ({ 
      itemsPerPage, 
      currentPage: 1 // Reset to first page when changing items per page
    }));
  };

  // Handle export in different formats
  const handleExport = (format: 'csv' | 'excel') => {
    // Use the filtered students for export
    const studentsToExport = selectedStudents.length > 0
      ? filteredStudents.filter(student => selectedStudents.includes(student.id))
      : filteredStudents;
    
    if (studentsToExport.length === 0) {
      toast.error('No students to export', {
        description: 'Please select at least one student or ensure your filters return results.',
      });
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `students_export_${dateStr}${format === 'excel' ? '.xlsx' : '.csv'}`;
    
    if (format === 'csv') {
      const csvData = convertStudentsToCSV(studentsToExport);
      downloadCSV(csvData, filename);
    } else {
      exportStudentsToExcel(studentsToExport, filename);
    }
  };

  // Helper function to get selected students' data
  const getSelectedStudentData = React.useMemo(() => {
    return students.filter(student => selectedStudents.includes(student.id));
  }, [students, selectedStudents]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isTeacher ? "My Students" : "Students"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isTeacher 
              ? "Students enrolled in your assigned courses"
              : "Manage all student accounts"
            }
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>              
              <Button
                variant="outline"
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white hover:text-white shadow-sm transition-all duration-200 ease-in-out hover:shadow-md"
                disabled={!students.length}
              >
                <Download className="h-4 w-4 mr-1.5" />
                <span className="font-medium">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 backdrop-blur-sm border border-border/50 shadow-lg animate-in fade-in-0 zoom-in-95"
            >
              <DropdownMenuLabel className="font-semibold px-2 py-1.5 text-sm">Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => handleExport('excel')}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-primary/10 rounded-sm"
                >
                  <div className="rounded-sm bg-emerald-100 dark:bg-emerald-900/30 p-1">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>Excel Spreadsheet (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-primary/10 rounded-sm"
                >
                  <div className="rounded-sm bg-blue-100 dark:bg-blue-900/30 p-1">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>CSV File (.csv)</span>
                </DropdownMenuItem>              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isTeacher && (
            <Button className="gap-2" onClick={() => window.location.href = "/admin/dashboard"}>
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">          
          <div className="flex flex-col gap-2">
            <div className="flex gap-4 items-center">
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <StudentFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
            {(filters.status.length > 0 || filters.dateRange.from || filters.dateRange.to || filters.coursesEnrolled || filters.courseName || filters.courseID) && (
              <div className="flex flex-wrap gap-2">
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {filters.status.join(', ')}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange({ status: [] })} />
                  </Badge>
                )}
                {(filters.dateRange.from || filters.dateRange.to) && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date Range: {filters.dateRange.from?.toLocaleDateString()} - {filters.dateRange.to?.toLocaleDateString()}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange({ dateRange: { from: null, to: null } })} />
                  </Badge>
                )}
                {filters.coursesEnrolled && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Courses: {filters.coursesEnrolled}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange({ coursesEnrolled: undefined })} />
                  </Badge>
                )}
                {filters.courseName && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Course: {filters.courseName}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange({ courseName: undefined })} />
                  </Badge>
                )}
                {filters.courseID && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Course ID: {filters.courseID}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange({ courseID: undefined })} />
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Show:</Label>
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="h-9 w-[70px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {selectedStudents.length > 0 && (
            <div className="text-sm text-muted-foreground">{selectedStudents.length} students selected</div>
          )}
          <StudentActions
            selectedCount={selectedStudents.length}
            filteredCount={filteredStudents.length}
            totalCount={students.length}
            hasActiveFilters={hasActiveFilters()}
            onBulkDelete={() => setDeleteDialog(true)}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkEmail={() => setBulkEmailDialog(true)}
          />
        </div>
      </div>

      <div className="rounded-md border mt-4">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <p className="text-sm text-muted-foreground">Loading students...</p>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">No students found</p>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </div>
        ) : (          <StudentList
            students={paginatedStudents}
            selectedStudents={selectedStudents}
            onSelect={(studentId: string) => handleSelectStudent(studentId)}
            onSelectAll={handleSelectAllStudents}
            sortField={sort.field}
            sortDirection={sort.direction}
            onSort={handleSort}
            onEdit={(student: Student) => setEditDialog({ open: true, student })}
            onDelete={(studentId: string) => handleSelectStudent(studentId)}
            onEmail={(student: Student) => setEmailDialog({ open: true, singleStudent: student })}
            onViewDetails={(student: Student) => setViewDetailsDialog({ open: true, student })}
            isTeacher={isTeacher}
          />
        )}
      </div>

      {!loading && filteredStudents.length > 0 && (
        <div className="flex justify-center mt-4">
          <nav className="flex items-center gap-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    aria-disabled={pagination.currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  const isCurrentPage = page === pagination.currentPage;
                  
                  // Show first page, current page and its neighbors, and last page
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={isCurrentPage}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }

                  // Show ellipsis if there's a gap
                  if (
                    page === 2 ||
                    page === totalPages - 1
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return null;
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    className={pagination.currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    aria-disabled={pagination.currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </nav>
        </div>
      )}

      <EditStudentDialog
        student={editDialog.student}
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, student: null })}
        onSave={handleEditStudent}
      />

      <EmailStudentDialog
        recipientCount={emailDialog.singleStudent ? 1 : selectedStudents.length}
        open={emailDialog.open}
        onClose={() => setEmailDialog({ open: false, singleStudent: null })}
        onSend={handleSendEmail}
      />

      <DeleteStudentDialog
        studentCount={selectedStudents.length}
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
      
      <BulkEmailDialog
        open={bulkEmailDialog}
        onClose={() => setBulkEmailDialog(false)}
        onSend={handleBulkEmail}
        selectedCount={selectedStudents.length}
        selectedStudents={getSelectedStudentData}
        currentFilters={filters}
      />
      <Dialog
        open={viewDetailsDialog.open}
        onOpenChange={(open) => setViewDetailsDialog({ open, student: open ? viewDetailsDialog.student : null })}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Detailed information about {viewDetailsDialog.student?.name}</DialogDescription>
          </DialogHeader>
          {viewDetailsDialog.student && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Name:</Label>
                <div className="col-span-2">{viewDetailsDialog.student.name}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Email:</Label>
                <div className="col-span-2">{viewDetailsDialog.student.username}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Phone:</Label>
                <div className="col-span-2">{viewDetailsDialog.student.phoneNumber}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Student ID:</Label>
                <div className="col-span-2">{viewDetailsDialog.student.studentId}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Total Courses:</Label>
                <div className="col-span-2">{viewDetailsDialog.student.coursesEnrolled}</div>
              </div>
              <div className="grid grid-cols-3 items-start gap-4">
                <Label className="text-right font-medium mt-2">Enrolled Courses:</Label>
                <div className="col-span-2">
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course Name</TableHead>
                          <TableHead>Course ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewDetailsDialog.student?.courseName?.map((name, index) => (
                          <TableRow key={index}>
                            <TableCell>{name}</TableCell>
                            <TableCell>{viewDetailsDialog.student?.courseID?.[index]?.toString() || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                        {(!viewDetailsDialog.student?.courseName?.length) && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                              No courses enrolled
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Join Date:</Label>
                <div className="col-span-2">{formatDate(viewDetailsDialog.student.joinedDate)}</div>
              </div>              <div className="grid grid-cols-3 items-center gap-4">
                <Label className="text-right font-medium">Status:</Label>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewDetailsDialog.student.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                      }`}
                  >
                    {viewDetailsDialog.student.status || 'Active'}
                  </span>
                </div>
              </div>              <div className="grid grid-cols-3 items-center gap-4 mt-4">
                <Label className="text-right font-medium">Attendance:</Label>
                <div className="col-span-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      window.location.href = `/admin/students/${viewDetailsDialog.student?.id}/attendance`;
                    }}
                  >
                    View Full Attendance Record
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDetailsDialog({ open: false, student: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
