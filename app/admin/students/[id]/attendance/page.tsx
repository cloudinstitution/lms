"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  User,
} from 'lucide-react';

// Chart Components
import { Chart } from '@/components/ui/chart';

// Services
import { getStudentAttendanceRecords, getStudentAttendanceSummary, AttendanceQueryParams } from '@/lib/attendance-query-service';
import { fetchStudents } from '@/lib/student-service';
import { toast } from '@/components/ui/use-toast';

// Types
import type { AttendanceRecord } from '@/lib/attendance-service';
import type { Student } from '@/types/student';

// Helper function to get attendance status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800';
    case 'absent':
      return 'bg-red-100 text-red-800';
    case 'late':
      return 'bg-yellow-100 text-yellow-800';
    case 'excused':
      return 'bg-blue-100 text-blue-800';
    case 'holiday':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  } catch (error) {
    return dateString;
  }
};

export default function StudentAttendancePage() {
  // Get student ID from URL
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  
  // State for student data
  const [student, setStudent] = useState<Student | null>(null);
  const [loadingStudent, setLoadingStudent] = useState<boolean>(true);
  
  // State for filters
  const [filters, setFilters] = useState<AttendanceQueryParams>({
    startDate: subMonths(new Date(), 3),
    endDate: new Date(),
    courseId: undefined,
    status: undefined,
    page: 1,
    limit: 10
  });
  
  // State for attendance data
  const [attendanceRecords, setAttendanceRecords] = useState<{
    records: AttendanceRecord[];
    totalRecords: number;
    totalPages: number;
    currentPage: number;
  } | null>(null);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(true);
  
  // State for attendance summary
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  
  // State for course list (for filtering)
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  
  // State for current tab
  const [currentTab, setCurrentTab] = useState<string>('overview');
    // State for calendar view
  const [calendarDates, setCalendarDates] = useState<{
    present: Date[];
    absent: Date[];
    late: Date[];
    excused: Date[];
  }>({
    present: [],
    absent: [],
    late: [],
    excused: []
  });

  // Load student data
  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoadingStudent(true);
        const students = await fetchStudents();
        const foundStudent = students.find(s => s.id === studentId);
        
        if (foundStudent) {
          setStudent(foundStudent);
          
          // Extract courses for filtering
          if (foundStudent.courseID && foundStudent.courseName) {
            const studentCourses = foundStudent.courseID.map((id, index) => ({
              id: id.toString(),
              name: foundStudent.courseName?.[index] || 'Unknown Course'
            }));
            setCourses(studentCourses);
          }
        } else {
          toast({
            title: "Student not found",
            description: "Could not locate the student record",
            variant: "destructive"
          });
          router.push('/admin/students');
        }
      } catch (error) {
        console.error("Error loading student:", error);
        toast({
          title: "Error",
          description: "Failed to load student data",
          variant: "destructive"
        });
      } finally {
        setLoadingStudent(false);
      }
    };
    
    loadStudent();
  }, [studentId, router]);

  // Load attendance records when filters change
  useEffect(() => {
    const loadAttendanceRecords = async () => {
      try {
        setLoadingRecords(true);
        const records = await getStudentAttendanceRecords(studentId, filters);
        setAttendanceRecords(records);
          // Update calendar dates for the calendar view categorized by status
        if (records.records.length > 0) {
          const presentDates = records.records
            .filter(record => record.status === 'present')
            .map(record => parseISO(record.date));
            
          const absentDates = records.records
            .filter(record => record.status === 'absent')
            .map(record => parseISO(record.date));
            
          const lateDates = records.records
            .filter(record => record.status === 'late')
            .map(record => parseISO(record.date));
            
          const excusedDates = records.records
            .filter(record => record.status === 'excused')
            .map(record => parseISO(record.date));
            
          setCalendarDates({
            present: presentDates,
            absent: absentDates,
            late: lateDates,
            excused: excusedDates
          });
        }
      } catch (error) {
        console.error("Error loading attendance records:", error);
        toast({
          title: "Error",
          description: "Failed to load attendance records",
          variant: "destructive"
        });
      } finally {
        setLoadingRecords(false);
      }
    };
    
    if (studentId) {
      loadAttendanceRecords();
    }
  }, [studentId, filters]);

  // Load attendance summary
  useEffect(() => {
    const loadAttendanceSummary = async () => {
      try {
        setLoadingSummary(true);
        const summary = await getStudentAttendanceSummary(studentId, {
          startDate: filters.startDate,
          endDate: filters.endDate,
          courseId: filters.courseId
        });
        setAttendanceSummary(summary);
      } catch (error) {
        console.error("Error loading attendance summary:", error);
        toast({
          title: "Error",
          description: "Failed to load attendance summary",
          variant: "destructive"
        });
      } finally {
        setLoadingSummary(false);
      }
    };
    
    if (studentId) {
      loadAttendanceSummary();
    }
  }, [studentId, filters.startDate, filters.endDate, filters.courseId]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AttendanceQueryParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle date range filter changes
  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    
    let startDate;
    switch (range) {
      case 'last7days':
        startDate = subDays(now, 7);
        break;
      case 'last30days':
        startDate = subDays(now, 30);
        break;
      case 'last3months':
        startDate = subMonths(now, 3);
        break;
      case 'last6months':
        startDate = subMonths(now, 6);
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        handleFilterChange({
          startDate,
          endDate: endOfMonth(lastMonth)
        });
        return;
      default:
        startDate = subMonths(now, 3); // Default to last 3 months
    }
    
    handleFilterChange({
      startDate,
      endDate: now
    });
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    if (!attendanceRecords?.records.length) return;
    
    let csv = 'Date,Status,Time,Course,Hours Spent\n';
    
    attendanceRecords.records.forEach(record => {
      csv += `${record.date},${record.status},${record.time || ''},${record.courseName || ''},${record.hoursSpent}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${student?.name || 'student'}_attendance.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Student attendance overview chart data
  const getOverviewChartData = () => {
    if (!attendanceSummary) return {};
    
    return {
      labels: ['Present', 'Absent'],
      datasets: [
        {
          label: 'Days',
          data: [
            attendanceSummary.overallSummary.presentDays,
            attendanceSummary.overallSummary.absentDays
          ],
          backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
          borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
          borderWidth: 1
        }
      ]
    };
  };

  // Monthly trend chart data
  const getTrendChartData = () => {
    if (!attendanceSummary?.monthlySummary) return {};
    
    const labels = attendanceSummary.monthlySummary.map((month: any) => month.month);
    const presentData = attendanceSummary.monthlySummary.map((month: any) => month.presentDays);
    const absentData = attendanceSummary.monthlySummary.map((month: any) => month.absentDays);
    
    return {
      labels,
      datasets: [
        {
          label: 'Present',
          data: presentData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.3
        },
        {
          label: 'Absent',
          data: absentData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          tension: 0.3
        }
      ]
    };
  };

  // Course breakdown chart data
  const getCourseChartData = () => {
    if (!attendanceSummary?.courseBreakdown) return {};
    
    const labels = attendanceSummary.courseBreakdown.map((course: any) => course.courseName);
    const presentData = attendanceSummary.courseBreakdown.map((course: any) => course.presentPercentage);
    
    return {
      labels,
      datasets: [
        {
          label: 'Attendance %',
          data: presentData,
          backgroundColor: [
            'rgba(34, 197, 94, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(249, 115, 22, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(236, 72, 153, 0.7)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-destructive">Student not found</p>
          <Button asChild>
            <Link href="/admin/students">Return to Students</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 print:py-2 max-w-7xl">
      {/* Header with breadcrumb and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 print:hidden">
        <div className="flex flex-col gap-1 mb-4 md:mb-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/admin/students" className="hover:underline">Students</Link>
            <span>/</span>
            <span>{student.name}</span>
            <span>/</span>
            <span className="text-foreground">Attendance</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <User className="h-6 w-6" /> 
            {student.name}'s Attendance
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1">
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
          <Button asChild variant="default" size="sm" className="flex items-center gap-1">
            <Link href={`/admin/students`}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Student info card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Student Information</CardTitle>
          <CardDescription>Basic profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="font-medium">{student.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Student ID</span>
              <span className="font-medium">{student.studentId}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{student.username}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Phone</span>
              <span className="font-medium">{student.phoneNumber || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-medium">
                <Badge variant={student.status === 'Active' ? 'success' : 'destructive'}>
                  {student.status || 'Active'}
                </Badge>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Enrolled Courses</span>
              <span className="font-medium">{student.coursesEnrolled || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filters */}
      <Card className="mb-6 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Date Range</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => handleDateRangeChange('last7days')}>
                    Last 7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeChange('last30days')}>
                    Last 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeChange('thisMonth')}>
                    This month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeChange('lastMonth')}>
                    Last month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeChange('last3months')}>
                    Last 3 months
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeChange('last6months')}>
                    Last 6 months
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleFilterChange({ startDate: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleFilterChange({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>
              <div className="flex flex-col gap-1.5">
              <Label htmlFor="course">Course</Label>              <Select
                value={filters.courseId || 'all'}
                onValueChange={(value) => handleFilterChange({ courseId: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="course">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Attendance Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange({ status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange({ status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for different views */}
      <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab} className="print:hidden">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="details">Detailed Records</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="courses">By Course</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {loadingSummary ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Days</span>
                      <span className="font-medium">{attendanceSummary?.overallSummary?.totalDays || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Present Days</span>
                      <span className="font-medium">{attendanceSummary?.overallSummary?.presentDays || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Absent Days</span>
                      <span className="font-medium">{attendanceSummary?.overallSummary?.absentDays || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Attendance Rate</span>
                      <span className="font-medium">
                        {attendanceSummary?.overallSummary?.presentPercentage?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Hours</span>
                      <span className="font-medium">{attendanceSummary?.overallSummary?.totalHours || 0} hrs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Hours/Day</span>
                      <span className="font-medium">{attendanceSummary?.overallSummary?.averageHoursPerDay?.toFixed(1) || 0} hrs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle>Attendance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    {attendanceSummary && (
                      <Chart
                        type="doughnut"
                        data={getOverviewChartData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right',
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle>Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {attendanceSummary && (
                      <Chart
                        type="line"
                        data={getTrendChartData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Days'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Month'
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Calendar Tab */}
        <TabsContent value="calendar">          <Card>
            <CardHeader>
              <CardTitle>Attendance Calendar</CardTitle>
              <CardDescription>Color-coded dates based on attendance status</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Calendar Legend */}
              <div className="flex flex-wrap gap-4 mb-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="text-sm">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="text-sm">Excused</span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Calendar
                  mode="multiple"
                  selected={[]}
                  className="rounded-md border"
                  modifiers={{
                    present: calendarDates.present || [],
                    absent: calendarDates.absent || [],
                    late: calendarDates.late || [],
                    excused: calendarDates.excused || []
                  }}
                  modifiersStyles={{
                    present: { backgroundColor: 'rgba(34, 197, 94, 0.5)', color: 'white' },
                    absent: { backgroundColor: 'rgba(239, 68, 68, 0.5)', color: 'white' },
                    late: { backgroundColor: 'rgba(234, 179, 8, 0.5)', color: 'white' },
                    excused: { backgroundColor: 'rgba(59, 130, 246, 0.5)', color: 'white' }
                  }}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Detailed Records Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRecords ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !attendanceRecords || attendanceRecords.records.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Records Found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters to see different results
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.records.map((record, index) => (
                        <TableRow key={`${record.date}-${index}`}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell>{record.time || '-'}</TableCell>
                          <TableCell>{record.courseName || 'N/A'}</TableCell>
                          <TableCell className="text-right">{record.hoursSpent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  {attendanceRecords.totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handlePageChange(filters.page! - 1)}
                              className={filters.page === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: attendanceRecords.totalPages }).map((_, i) => {
                            const page = i + 1;
                            const isCurrentPage = page === filters.page;
                            
                            // Show first page, current page and its neighbors, and last page
                            if (
                              page === 1 ||
                              page === attendanceRecords.totalPages ||
                              (page >= (filters.page! - 1) && page <= (filters.page! + 1))
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
                              page === attendanceRecords.totalPages - 1
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
                              onClick={() => handlePageChange(filters.page! + 1)}
                              className={filters.page === attendanceRecords.totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attendance Trends</CardTitle>
              <CardDescription>Track attendance patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-[500px]">
                  {attendanceSummary && (
                    <Chart
                      type="line"
                      data={getTrendChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Days'
                            }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Month'
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false,
                          }
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Course Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Attendance by Course</CardTitle>
              <CardDescription>Compare attendance rates across different courses</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !attendanceSummary || !attendanceSummary.courseBreakdown?.length ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Course Data Found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No course attendance data is available for this period
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-[300px] mb-6">
                    <Chart
                      type="bar"
                      data={getCourseChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Attendance Percentage'
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            display: false,
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Present Days</TableHead>
                        <TableHead>Absent Days</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceSummary.courseBreakdown.map((course: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{course.courseName}</TableCell>
                          <TableCell>{course.presentDays}</TableCell>
                          <TableCell>{course.absentDays}</TableCell>
                          <TableCell className="text-right">{course.presentPercentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Print view - only shown when printing */}
      <div className="hidden print:block mt-6">
        <h2 className="text-2xl font-bold mb-4">Attendance Summary</h2>
        
        {attendanceSummary && (
          <>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Overview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Days</span>
                    <span>{attendanceSummary.overallSummary.totalDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Present Days</span>
                    <span>{attendanceSummary.overallSummary.presentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Absent Days</span>
                    <span>{attendanceSummary.overallSummary.absentDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendance Rate</span>
                    <span>{attendanceSummary.overallSummary.presentPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-md p-4 col-span-2">
                <h3 className="font-medium mb-2">Course Breakdown</h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Course</th>
                      <th className="text-right">Present</th>
                      <th className="text-right">Absent</th>
                      <th className="text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSummary.courseBreakdown.map((course: any, index: number) => (
                      <tr key={index}>
                        <td>{course.courseName}</td>
                        <td className="text-right">{course.presentDays}</td>
                        <td className="text-right">{course.absentDays}</td>
                        <td className="text-right">{course.presentPercentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Detailed Records</h2>
            {attendanceRecords && attendanceRecords.records.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Time</th>
                    <th className="py-2 text-left">Course</th>
                    <th className="py-2 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.records.map((record, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{formatDate(record.date)}</td>
                      <td className="py-2">{record.status}</td>
                      <td className="py-2">{record.time || '-'}</td>
                      <td className="py-2">{record.courseName || 'N/A'}</td>
                      <td className="py-2 text-right">{record.hoursSpent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No records found for the selected period.</p>
            )}
            
            <div className="mt-8 text-center text-sm text-muted-foreground">
              <p>Report generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
