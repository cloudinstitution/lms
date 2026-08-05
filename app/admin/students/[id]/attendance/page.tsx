"use client";

import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// UI components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';

// Icons
import {
    ArrowLeft,
    Calendar as CalendarIcon,
    ChevronDown,
    Download,
    FileText,
    Loader2,
    Printer,
    User
} from 'lucide-react';

// Chart Components
import { Chart } from '@/components/ui/chart';

// Services
import { toast } from '@/components/ui/use-toast';
import { AttendanceQueryParams, getStudentAttendanceRecords, getStudentAttendanceSummary, getStudentCoursesData } from '@/lib/attendance-query-service';
import { fetchStudents } from '@/lib/student-service';

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

// Helper function to format date for display
const formatDate = (date: string) => {
  if (!date) return "N/A";
  try {
    return format(parseISO(date), 'PPP');
  } catch (error) {
    return date;
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
    // State for course dates when applicable
  const [courseDates, setCourseDates] = useState<{
    start?: Date;
    end?: Date;
    duration?: string;
    isActive: boolean;
  }>({
    isActive: false
  });

  // State for filters
  const [filters, setFilters] = useState<AttendanceQueryParams>({
    startDate: subMonths(new Date(), 3),
    endDate: new Date(),
    courseId: undefined,
    status: undefined,
    page: 1,
    limit: 10,
    useCourseTimeframe: false
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
  
  // State for comprehensive course details
  const [courseDetails, setCourseDetails] = useState<any[]>([]);
  const [loadingCourseDetails, setLoadingCourseDetails] = useState<boolean>(true);
  
  // State to track export operations
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
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
          
          // Load comprehensive course data instead of just using student's course names
          if (foundStudent.courseID) {
            try {
              const coursesData = await getStudentCoursesData(studentId);
              const studentCourses = coursesData.courses.map((course: any) => ({
                id: course.id,
                name: course.title || course.name || `Course ${course.id}`
              }));
              setCourses(studentCourses);
            } catch (error) {
              console.error("Error loading course data:", error);
              // Fallback to student's course names if available
              if (foundStudent.courseName) {
                const studentCourses = foundStudent.courseID.map((id, index) => ({
                  id: id.toString(),
                  name: foundStudent.courseName?.[index] || `Course ${id}`
                }));
                setCourses(studentCourses);
              }
            }
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

  // Load course details for cards
  useEffect(() => {
    const loadCourseDetails = async () => {
      try {
        setLoadingCourseDetails(true);
        const coursesData = await getStudentCoursesData(studentId);
        const formattedCourses = coursesData.courses.map((course: any) => ({
          ...course,
          // Format course data for display
          formattedStartDate: course.startDate ? course.startDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : 'Not set',
          formattedEndDate: course.endDate ? course.endDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : 'Not set',
          formattedPrice: course.price ? (course.price.startsWith('₹') ? course.price : `₹${course.price}`) : 'Free',
          attendancePercentage: course.attendanceData?.summary ? 
            Math.round((course.attendanceData.summary.attended / course.attendanceData.summary.totalClasses) * 100) : 0
        }));
        setCourseDetails(formattedCourses);
      } catch (error) {
        console.error("Error loading course details:", error);
      } finally {
        setLoadingCourseDetails(false);
      }
    };
    
    if (studentId) {
      loadCourseDetails();
    }
  }, [studentId]);

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
    // Handle using course dates for attendance
  const handleUseCourseTimeframe = () => {
    // If already using course timeframe, toggle it off
    if (filters.useCourseTimeframe) {
      handleFilterChange({
        useCourseTimeframe: false
      });
      toast({
        title: "Custom Timeframe",
        description: "Now using custom date range",
      });
      return;
    }
    
    // First check if we have a selected course
    if (!filters.courseId) {      
      toast({
        title: "No Course Selected",
        description: "Please select a course first to use its timeframe",
        variant: "destructive"
      });
      return;
    }
    
    // Show visual feedback that we're applying course dates
    toast({
      title: "Applying Course Dates",
      description: "Fetching and applying date range from course...",
    });

    // Then check if we have course dates from the summary
    if (attendanceSummary?.overallSummary?.courseDates) {
      const { start, end } = attendanceSummary.overallSummary.courseDates;
      
      if (start && end) {
        handleFilterChange({
          startDate: parseISO(start),
          endDate: parseISO(end),
          useCourseTimeframe: true
        });
        
        toast({
          title: "Using Course Timeframe",
          description: `Showing attendance from ${format(parseISO(start), 'PP')} to ${format(parseISO(end), 'PP')}`,
        });
      } else {        
        toast({
          title: "Course Dates Unavailable",
          description: "This course doesn't have defined start and end dates",
          variant: "destructive"
        });
      }
    } else {
      // Get course dates by loading the summary again with the useCourseTimeframe flag
      setLoadingSummary(true);
      getStudentAttendanceSummary(studentId, {
        courseId: filters.courseId,
        useCourseTimeframe: true
      }).then(summary => {
        setAttendanceSummary(summary);
        
        if (summary?.overallSummary?.courseDates?.start && summary?.overallSummary?.courseDates?.end) {
          const { start, end } = summary.overallSummary.courseDates;
          handleFilterChange({
            startDate: parseISO(start),
            endDate: parseISO(end),
            useCourseTimeframe: true
          });
          
          toast({
            title: "Using Course Timeframe",
            description: `Showing attendance from ${format(parseISO(start), 'PP')} to ${format(parseISO(end), 'PP')}`,
          });
        } else {          
          toast({
            title: "Course Dates Unavailable",
            description: "Could not retrieve course dates",
            variant: "destructive"
          });
        }
      }).catch(error => {
        console.error("Error fetching course dates:", error);
        toast({
          title: "Error",
          description: "Failed to load course dates",
          variant: "destructive"
        });
      }).finally(() => {
        setLoadingSummary(false);
      });
    }
  };
  
  // Handle export to CSV
  const handleExportCSV = () => {
    if (!student || isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Create URL with query parameters for filtering
      let exportUrl = `/api/students/${studentId}/export-attendance?format=csv`;
      
      if (filters.startDate) {
        exportUrl += `&startDate=${filters.startDate.toISOString()}`;
      }
      
      if (filters.endDate) {
        exportUrl += `&endDate=${filters.endDate.toISOString()}`;
      }
      
      if (filters.courseId) {
        exportUrl += `&courseId=${filters.courseId}`;
      }
      
      if (filters.status) {
        exportUrl += `&status=${filters.status}`;
      }
      
      // Create a more informative description based on active filters
      let filterDescription = '';
      if (filters.status) filterDescription += ` filtered by ${filters.status} status`;
      if (filters.courseId) filterDescription += ` for selected course`;
      
      toast({
        title: "Exporting CSV",
        description: `Your attendance data${filterDescription} is being exported to CSV format.`,
      });
      
      // Open the URL in a new tab or trigger download
      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your attendance data. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Reset exporting state after a short delay to allow UI feedback
      setTimeout(() => setIsExporting(false), 1000);
    }
  };
  
  // Handle print
  const handlePrint = () => {
    window.print();
  };
  
  // Handle export to Excel
  const handleExportExcel = () => {
    if (!student || isExporting) return;
    
    try {
      setIsExporting(true);
      
      // Create URL with query parameters for filtering
      let exportUrl = `/api/students/${studentId}/export-attendance?format=xlsx`;
      
      if (filters.startDate) {
        exportUrl += `&startDate=${filters.startDate.toISOString()}`;
      }
      
      if (filters.endDate) {
        exportUrl += `&endDate=${filters.endDate.toISOString()}`;
      }
      
      if (filters.courseId) {
        exportUrl += `&courseId=${filters.courseId}`;
      }
      
      if (filters.status) {
        exportUrl += `&status=${filters.status}`;
      }
      
      // Create a more informative description based on active filters
      let filterDescription = '';
      if (filters.status) filterDescription += ` filtered by ${filters.status} status`;
      if (filters.courseId) {
        // Get course name if available
        const course = courses.find(c => c.id === filters.courseId);
        filterDescription += ` for ${course?.name || 'selected course'}`;
      }
      
      toast({
        title: "Exporting Excel",
        description: `Your attendance data${filterDescription} is being exported to Excel format.`,
      });
      
      // Open the URL in a new tab or trigger download
      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your attendance data. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Reset exporting state after a short delay to allow UI feedback
      setTimeout(() => setIsExporting(false), 1000);
    }  };
  // Student attendance overview chart data
  const getOverviewChartData = () => {
    if (!attendanceSummary || !attendanceSummary.overallSummary) return {
      labels: ['Present', 'Absent'],
      datasets: [{ label: 'Days', data: [0, 0], backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'], borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)'], borderWidth: 1 }]
    };
    
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
  };  // Monthly trend chart data
  const getTrendChartData = () => {
    // Default empty chart data configuration
    const emptyChartData = {
      labels: ['No Data'],
      datasets: [
        {
          label: 'Present',
          data: [0],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.3
        },
        {
          label: 'Absent',
          data: [0],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          tension: 0.3
        }
      ]
    };

    // Handle missing data cases
    if (!attendanceSummary || !attendanceSummary.monthlySummary || attendanceSummary.monthlySummary.length === 0) {
      return emptyChartData;
    }

    try {
      // Make a safe copy of the monthly summary array
      const monthlySummaryArray = Array.isArray(attendanceSummary.monthlySummary) 
        ? [...attendanceSummary.monthlySummary] 
        : [];
        
      // If array is still empty after validation, return empty chart
      if (monthlySummaryArray.length === 0) {
        return emptyChartData;
      }

      // Sort months chronologically before mapping
      const sortedMonths = monthlySummaryArray.sort((a, b) => {
        try {
          return new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime();
        } catch (err) {
          console.error('Error sorting months:', err, { a, b });
          return 0;
        }
      });
      
      // Format month labels to be more readable (e.g., "Jan 2025" instead of "2025-01")
      const labels = sortedMonths.map((month) => {
        try {
          const [year, monthNum] = month.month.split('-');
          const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
          return format(date, 'MMM yyyy');
        } catch (err) {
          console.error('Error formatting month label:', err, { month });
          return month.month || 'Unknown';
        }
      });
      
      const presentData = sortedMonths.map((month) => month.presentDays || 0);
      const absentData = sortedMonths.map((month) => month.absentDays || 0);
      
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
    } catch (error) {
      console.error('Error generating trend chart data:', error);      return emptyChartData;
    }
  };
  // Course breakdown chart data - comparing to 100%
  const getCourseChartData = () => {
    if (!attendanceSummary?.courseBreakdown) return {
      labels: [],
      datasets: [
        {
          label: 'Attended %',
          data: [],
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderWidth: 1
        },
        {
          label: 'Missed %',
          data: [],
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderWidth: 1
        }
      ]
    };
    
    const labels = attendanceSummary.courseBreakdown.map((course: any) => course.courseName);
    const attendedData = attendanceSummary.courseBreakdown.map((course: any) => course.presentPercentage || 0);
    const missedData = attendanceSummary.courseBreakdown.map((course: any) => 100 - (course.presentPercentage || 0));
    
    return {
      labels,
      datasets: [
        {
          label: 'Attended %',
          data: attendedData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Missed %',
          data: missedData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }
      ]
    };
  };  if (loadingStudent) {
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
        </div>          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    disabled={!attendanceRecords || attendanceRecords.records.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem 
                      onClick={handleExportCSV}
                      disabled={isExporting || !attendanceRecords || attendanceRecords.records.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span>CSV File</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleExportExcel}
                      disabled={isExporting || !attendanceRecords || attendanceRecords.records.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Excel File</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint} 
                className="flex items-center gap-1"
                disabled={!attendanceRecords || attendanceRecords.records.length === 0}
              >
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
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Export will use current filters</span>
              {attendanceRecords && attendanceRecords.records.length > 0 && (
                <span className="font-semibold">
                  ({attendanceRecords.records.length} records)
                </span>
              )}
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date">Start Date</Label>              <Input
                id="start-date"
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  
                  // If using course timeframe, enforce date constraints
                  if (filters.useCourseTimeframe && newDate && attendanceSummary?.overallSummary?.courseDates) {
                    const courseDates = attendanceSummary.overallSummary.courseDates;
                    const courseStart = courseDates.start ? parseISO(courseDates.start) : null;
                    const courseEnd = courseDates.end ? parseISO(courseDates.end) : null;
                    
                    // Validate that the selected date is within course range
                    if (courseStart && newDate < courseStart) {
                      toast({
                        title: "Date Adjusted",
                        description: "Start date can't be earlier than course start date",
                      });
                      handleFilterChange({ startDate: courseStart });
                      return;
                    }
                    
                    if (courseEnd && newDate > courseEnd) {
                      toast({
                        title: "Date Adjusted",
                        description: "Start date can't be later than course end date",
                      });
                      handleFilterChange({ startDate: courseEnd });
                      return;
                    }
                  }
                  
                  handleFilterChange({ startDate: newDate });
                }}
                min={attendanceSummary?.overallSummary?.courseDates?.start && filters.useCourseTimeframe 
                  ? attendanceSummary.overallSummary.courseDates.start : undefined}
                max={attendanceSummary?.overallSummary?.courseDates?.end && filters.useCourseTimeframe 
                  ? attendanceSummary.overallSummary.courseDates.end : undefined}
                disabled={filters.useCourseTimeframe && (!attendanceSummary?.overallSummary?.courseDates?.start || !attendanceSummary?.overallSummary?.courseDates?.end)}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date">End Date</Label>              
              <Input
                id="end-date"
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined;
                  
                  // If using course timeframe, enforce date constraints
                  if (filters.useCourseTimeframe && newDate && attendanceSummary?.overallSummary?.courseDates) {
                    const courseDates = attendanceSummary.overallSummary.courseDates;
                    const courseStart = courseDates.start ? parseISO(courseDates.start) : null;
                    const courseEnd = courseDates.end ? parseISO(courseDates.end) : null;
                    
                    // Validate that the selected date is within course range
                    if (courseStart && newDate < courseStart) {
                      toast({
                        title: "Date Adjusted",
                        description: "End date can't be earlier than course start date",
                      });
                      handleFilterChange({ endDate: courseStart });
                      return;
                    }
                    
                    if (courseEnd && newDate > courseEnd) {
                      toast({
                        title: "Date Adjusted",
                        description: "End date can't be later than course end date",
                      });
                      handleFilterChange({ endDate: courseEnd });
                      return;
                    }
                  }
                  
                  handleFilterChange({ endDate: newDate });
                }}
                min={attendanceSummary?.overallSummary?.courseDates?.start && filters.useCourseTimeframe 
                  ? attendanceSummary.overallSummary.courseDates.start : undefined}
                max={attendanceSummary?.overallSummary?.courseDates?.end && filters.useCourseTimeframe 
                  ? attendanceSummary.overallSummary.courseDates.end : undefined}
                disabled={filters.useCourseTimeframe && (!attendanceSummary?.overallSummary?.courseDates?.start || !attendanceSummary?.overallSummary?.courseDates?.end)}
              />
            </div>            
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Label htmlFor="course">Course</Label>
                {filters.useCourseTimeframe && (
                  <Badge variant="outline" className="text-xs">Course Timeframe Active</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">                  <Select
                    value={filters.courseId || 'all'}
                    onValueChange={(value) => {
                      // If switching from a specific course to "All Courses", 
                      // also deactivate course timeframe
                      if (value === 'all') {
                        handleFilterChange({ 
                          courseId: undefined, 
                          useCourseTimeframe: false
                        });
                      } else {
                        // Update the courseId and automatically fetch course dates
                        handleFilterChange({ courseId: value });
                        
                        // Automatically fetch and apply course dates when a course is selected
                        setLoadingSummary(true);
                        getStudentAttendanceSummary(studentId, {
                          courseId: value,
                          useCourseTimeframe: true
                        }).then(summary => {
                          setAttendanceSummary(summary);
                          
                          if (summary?.overallSummary?.courseDates?.start && summary?.overallSummary?.courseDates?.end) {
                            const { start, end } = summary.overallSummary.courseDates;
                            handleFilterChange({
                              startDate: parseISO(start),
                              endDate: parseISO(end),
                              useCourseTimeframe: true
                            });
                            
                            toast({
                              title: "Course Timeframe Applied",
                              description: `Using dates from ${format(parseISO(start), 'PP')} to ${format(parseISO(end), 'PP')}`,
                            });
                          }
                        }).catch(error => {
                          console.error("Error fetching course dates:", error);
                        }).finally(() => {
                          setLoadingSummary(false);
                        });
                      }
                    }}
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
                <Button 
                  variant={filters.useCourseTimeframe ? "secondary" : "outline"}
                  size="icon" 
                  title={filters.useCourseTimeframe ? "Course Dates Active" : "Use Course Dates"}
                  onClick={handleUseCourseTimeframe}
                  disabled={!filters.courseId}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>
            </div><div className="flex flex-col gap-1.5">
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
        <TabsContent value="calendar">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Attendance Calendar</CardTitle>
              <CardDescription className="text-muted-foreground">
                Color-coded dates based on attendance status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Enhanced Calendar Legend */}
              <div className="flex flex-wrap gap-4 mb-6 justify-center p-4 bg-muted/30 dark:bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-sm" />
                  <span className="text-sm font-medium">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 dark:bg-red-400 shadow-sm" />
                  <span className="text-sm font-medium">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 dark:bg-yellow-400 shadow-sm" />
                  <span className="text-sm font-medium">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 dark:bg-blue-400 shadow-sm" />
                  <span className="text-sm font-medium">Excused</span>
                </div>
              </div>
              
              <div className="flex justify-center mb-6">
                <Calendar
                  mode="multiple"
                  selected={[]}
                  className="rounded-md border border-border bg-card dark:bg-card shadow-sm"
                  modifiers={{
                    present: calendarDates.present || [],
                    absent: calendarDates.absent || [],
                    late: calendarDates.late || [],
                    excused: calendarDates.excused || []
                  }}
                  modifiersClassNames={{
                    present: 'bg-emerald-500 text-white font-bold hover:bg-emerald-600',
                    absent: 'bg-red-500 text-white font-bold hover:bg-red-600',
                    late: 'bg-yellow-500 text-white font-bold hover:bg-yellow-600',
                    excused: 'bg-blue-500 text-white font-bold hover:bg-blue-600'
                  }}
                  disabled
                />
              </div>

              {/* Enhanced Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {calendarDates.present?.length || 0}
                  </div>
                  <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    Present Days
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {calendarDates.absent?.length || 0}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Absent Days
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {calendarDates.late?.length || 0}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                    Late Days
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {calendarDates.excused?.length || 0}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Excused Days
                  </div>
                </div>
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
                          x: {
                            stacked: true,
                            title: {
                              display: true,
                              text: 'Courses'
                            }
                          },
                          y: {
                            stacked: true,
                            beginAtZero: true,
                            max: 100,
                            title: {
                              display: true,
                              text: 'Attendance Percentage (%)'
                            },
                            ticks: {
                              callback: function(value: any) {
                                return value + '%';
                              }
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context: any) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                              }
                            }
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
      
      {/* Course Information Cards */}
      {!loadingCourseDetails && courseDetails.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Details about enrolled courses with attendance data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseDetails.map((course) => (
                <div
                  key={course.id}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-base mb-1">
                        {course.title || course.name}
                      </h3>
                      <Badge 
                        variant={course.status === 'Active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {course.status || 'Active'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        course.attendancePercentage >= 75 
                          ? 'text-green-600 dark:text-green-400' 
                          : course.attendancePercentage >= 50 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {course.attendancePercentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Attendance
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{course.category || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">{course.formattedStartDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">{course.formattedEndDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{course.duration || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{course.formattedPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Classes Attended:</span>
                      <span className="font-medium">
                        {course.attendanceData?.summary?.attended || 0} / {course.attendanceData?.summary?.totalClasses || 0}
                      </span>
                    </div>
                  </div>

                  {course.description && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingCourseDetails && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Course Information</CardTitle>
            <CardDescription>Loading course details...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      )}

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
