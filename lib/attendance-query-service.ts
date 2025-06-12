import { AttendanceRecord, AttendanceSummary } from './attendance-service';

// Interface for attendance queries
export interface AttendanceQueryParams {
  startDate?: Date;
  endDate?: Date;
  courseId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Mock data for development - replace with real data fetching logic
export async function getStudentAttendanceRecords(
  studentId: string,
  params: AttendanceQueryParams = {}
): Promise<{
  records: AttendanceRecord[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}> {
  // This is a mock implementation
  // In a real application, you would fetch this data from your database
  
  const mockAttendanceData: AttendanceRecord[] = Array.from({ length: 50 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNumber = date.getDate();
    const randomHours = Math.floor(Math.random() * 6) + 1;
    
    // Randomly assign statuses with some weighting towards present
    const statuses = ["present", "present", "present", "present", "absent"] as const;
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      date: date.toISOString().split('T')[0],
      status: randomStatus,
      time: randomStatus === 'present' ? `${Math.floor(Math.random() * 3) + 8}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} AM` : null,
      dayName,
      dayNumber,
      courseId: Math.random() > 0.5 ? 'COURSE-1' : 'COURSE-2',
      courseName: Math.random() > 0.5 ? 'Introduction to Programming' : 'Advanced Web Development',
      hoursSpent: randomStatus === 'present' ? randomHours : 0
    };
  });
  
  // Apply filters
  let filteredRecords = [...mockAttendanceData];
  
  if (params.startDate) {
    filteredRecords = filteredRecords.filter(record => 
      new Date(record.date) >= params.startDate!
    );
  }
  
  if (params.endDate) {
    filteredRecords = filteredRecords.filter(record => 
      new Date(record.date) <= params.endDate!
    );
  }
    if (params.courseId) {
    filteredRecords = filteredRecords.filter(record => 
      record.courseId === params.courseId
    );
  }
  
  if (params.status) {
    filteredRecords = filteredRecords.filter(record => 
      record.status === params.status as any // Type assertion to handle extended status types
    );
  }
  
  // Handle pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / limit);
  
  const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);
  
  return {
    records: paginatedRecords,
    totalRecords,
    totalPages,
    currentPage: page
  };
}

export async function getStudentAttendanceSummary(
  studentId: string,
  params: AttendanceQueryParams = {}
): Promise<{
  overallSummary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    presentPercentage: number;
    totalHours: number;
    averageHoursPerDay: number;
  };
  monthlySummary: {
    month: string;
    presentDays: number;
    absentDays: number;
    presentPercentage: number;
  }[];
  courseBreakdown: {
    courseId: string;
    courseName: string;
    presentDays: number;
    absentDays: number;
    presentPercentage: number;
  }[];
}> {
  // Fetch all attendance records first
  const { records } = await getStudentAttendanceRecords(studentId, {
    ...params,
    page: 1,
    limit: 1000 // Large limit to get all records
  });
  
  // Calculate overall summary
  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'present').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const presentPercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
  const totalHours = records.reduce((sum, record) => sum + record.hoursSpent, 0);
  const averageHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
  
  // Calculate monthly summary
  const monthlyData = records.reduce((acc, record) => {
    const month = record.date.substring(0, 7); // YYYY-MM format
    
    if (!acc[month]) {
      acc[month] = {
        total: 0,
        present: 0,
        absent: 0
      };
    }
    
    acc[month].total += 1;
    if (record.status === 'present') acc[month].present += 1;
    if (record.status === 'absent') acc[month].absent += 1;
    
    return acc;
  }, {} as Record<string, { total: number; present: number; absent: number }>);
  
  const monthlySummary = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    presentDays: data.present,
    absentDays: data.absent,
    presentPercentage: data.total > 0 ? (data.present / data.total) * 100 : 0
  })).sort((a, b) => a.month.localeCompare(b.month));
  
  // Calculate course breakdown
  const courseData = records.reduce((acc, record) => {
    const courseId = record.courseId || 'unknown';
    const courseName = record.courseName || 'Unknown Course';
    
    if (!acc[courseId]) {
      acc[courseId] = {
        courseName,
        total: 0,
        present: 0,
        absent: 0
      };
    }
    
    acc[courseId].total += 1;
    if (record.status === 'present') acc[courseId].present += 1;
    if (record.status === 'absent') acc[courseId].absent += 1;
    
    return acc;
  }, {} as Record<string, { courseName: string; total: number; present: number; absent: number }>);
  
  const courseBreakdown = Object.entries(courseData).map(([courseId, data]) => ({
    courseId,
    courseName: data.courseName,
    presentDays: data.present,
    absentDays: data.absent,
    presentPercentage: data.total > 0 ? (data.present / data.total) * 100 : 0
  }));
  
  return {
    overallSummary: {
      totalDays,
      presentDays,
      absentDays,
      presentPercentage,
      totalHours,
      averageHoursPerDay
    },
    monthlySummary,
    courseBreakdown
  };
}
