import { AttendanceRecord, AttendanceSummary } from './attendance-service';
import { AttendanceSummaryResponse } from './attendance-types';
import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, Timestamp, doc, getDoc } from 'firebase/firestore';
import { subMonths } from 'date-fns';

// Define interfaces for new attendance data structure
interface AttendanceSummaryData {
  present: number;
  absent: number;
}

interface AttendanceMonthData {
  present: number;
  absent: number;
}

interface AttendanceCourseData {
  courseName?: string;
  present: number;
  absent: number;
}

// Interface for attendance queries
export interface AttendanceQueryParams {
  startDate?: Date;
  endDate?: Date;
  courseId?: string;
  status?: string;
  page?: number;
  limit?: number;
  useCourseTimeframe?: boolean; // Whether to use the course start/end dates instead of custom dates
  courseStartDate?: Date; // The start date of the course
  courseEndDate?: Date; // The end date of the course
}

export async function getStudentAttendanceRecords(
  studentId: string,
  params: AttendanceQueryParams = {}
): Promise<{
  records: AttendanceRecord[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    console.log(`Fetching attendance records for student: ${studentId} with params:`, params);
    
    // Get reference to the student's attendance subcollection
    const attendanceRef = collection(db, "students", studentId, "attendance");
    
    // Build query constraints
    const constraints: any[] = [];
    
    if (params.startDate) {
      constraints.push(where("date", ">=", Timestamp.fromDate(params.startDate)));
    }
    
    if (params.endDate) {
      constraints.push(where("date", "<=", Timestamp.fromDate(params.endDate)));
    }
    
    if (params.courseId) {
      constraints.push(where("courseId", "==", params.courseId));
    }
    
    if (params.status) {
      constraints.push(where("status", "==", params.status.toLowerCase()));
    }
    
    // Default ordering by date descending (newest first)
    constraints.push(orderBy("date", "desc"));
    
    // Handle pagination
    const pageSize = params.limit || 10;
    const pageNumber = params.page || 1;
    
    // Execute query to get the total count (inefficient but works for now)
    // In production we'd use a counter or aggregate query for this
    const countQuery = query(attendanceRef, ...constraints);
    const countSnapshot = await getDocs(countQuery);
    const totalRecords = countSnapshot.size;
    const totalPages = Math.ceil(totalRecords / pageSize);
    
    console.log(`Found ${totalRecords} total records, ${totalPages} pages`);
    
    // Apply pagination
    constraints.push(limit(pageSize));
    
    if (pageNumber > 1) {
      // We need to get the last document of the previous page
      const previousPageQuery = query(
        attendanceRef, 
        ...constraints.filter(c => c.type !== 'limit'),
        limit((pageNumber - 1) * pageSize)
      );
      const previousPageDocs = await getDocs(previousPageQuery);
      const lastVisibleDoc = previousPageDocs.docs[previousPageDocs.docs.length - 1];
      
      if (lastVisibleDoc) {
        const paginatedQuery = query(
          attendanceRef,
          ...constraints.filter(c => c.type !== 'limit'),
          startAfter(lastVisibleDoc),
          limit(pageSize)
        );
        const snapshot = await getDocs(paginatedQuery);
        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Convert Firestore Timestamps to ISO strings
          const date = data.date instanceof Timestamp 
            ? data.date.toDate().toISOString().split('T')[0]
            : data.date;
          
          // Format the attendance record
          return {
            id: doc.id,
            date,
            status: data.status,
            time: data.time || null,
            dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
            dayNumber: new Date(date).getDate(),
            hoursSpent: data.hoursSpent || 0,
            courseId: data.courseId,
            courseName: data.courseName,
            timeIn: data.timeIn,
            timeOut: data.timeOut,
            notes: data.notes
          } as AttendanceRecord;
        });
        
        return {
          records,
          totalRecords,
          totalPages,
          currentPage: pageNumber
        };
      }
    }
    
    // First page or fallback for pagination
    const firstPageQuery = query(attendanceRef, ...constraints);
    const snapshot = await getDocs(firstPageQuery);
    
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamps to ISO strings
      const date = data.date instanceof Timestamp 
        ? data.date.toDate().toISOString().split('T')[0]
        : data.date;
      
      return {
        id: doc.id,
        date,
        status: data.status,
        time: data.time || null,
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
        dayNumber: new Date(date).getDate(),
        hoursSpent: data.hoursSpent || 0,
        courseId: data.courseId,
        courseName: data.courseName,
        timeIn: data.timeIn,
        timeOut: data.timeOut,
        notes: data.notes
      } as AttendanceRecord;
    });
    
    return {
      records,
      totalRecords,
      totalPages,
      currentPage: pageNumber
    };
  } catch (error) {
    console.error("Error fetching student attendance records:", error);
    
    // Return empty data with error logged
    return {
      records: [],
      totalRecords: 0,
      totalPages: 0,
      currentPage: params.page || 1
    };
  }
}

export async function getStudentAttendanceSummary(
  studentId: string,
  params: AttendanceQueryParams = {}
): Promise<AttendanceSummaryResponse> {
  try {
    console.log(`Fetching attendance summary for student: ${studentId} with params:`, params);
    
    // First, get the student document to access the real-time attendance summary
    const studentRef = doc(db, "students", studentId);
    const studentDoc = await getDoc(studentRef);
    
    if (!studentDoc.exists()) {
      throw new Error(`Student with ID ${studentId} not found`);
    }
    
    const studentData = studentDoc.data();
    
    // Access the new real-time attendance summary
    const realTimeSummary = studentData.attendanceSummary || { present: 0, absent: 0 };
    const attendanceDates = studentData.attendanceDates || [];
    
    console.log('Real-time attendance data:', { 
      studentId,
      realTimeSummary,
      attendanceDatesCount: attendanceDates.length,
      hasFilters: !!(params.startDate || params.endDate || params.courseId || params.status)
    });

    // If a course ID is provided, fetch the course to get its dates
    let courseData = null;
    if (params.courseId) {
      try {
        const courseRef = doc(db, "courses", params.courseId);
        const courseDoc = await getDoc(courseRef);
        if (courseDoc.exists()) {
          courseData = courseDoc.data();
          console.log(`Found course data for ${params.courseId}:`, {
            startDate: courseData.startDate,
            endDate: courseData.endDate,
            duration: courseData.duration
          });
          
          // If we should use course timeframe and dates are available
          if (params.useCourseTimeframe && courseData.startDate && courseData.endDate) {
            params = {
              ...params,
              startDate: new Date(courseData.startDate),
              endDate: new Date(courseData.endDate)
            };
            console.log('Using course timeframe for attendance calculation:', {
              startDate: params.startDate,
              endDate: params.endDate
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching course ${params.courseId}:`, error);
      }
    }
    
    // Get detailed attendance records from the student's attendance subcollection
    const attendanceRef = collection(db, "students", studentId, "attendance");
    
    // Build query constraints
    const constraints: any[] = [];
    
    if (params.startDate) {
      constraints.push(where("date", ">=", Timestamp.fromDate(params.startDate)));
    }
    
    if (params.endDate) {
      constraints.push(where("date", "<=", Timestamp.fromDate(params.endDate)));
    }
    
    if (params.courseId) {
      constraints.push(where("courseId", "==", params.courseId));
    }
    
    if (params.status) {
      constraints.push(where("status", "==", params.status.toLowerCase()));
    }
    
    // Order by date to process chronologically
    constraints.push(orderBy("date", "asc"));
    
    const querySnapshot = await getDocs(query(attendanceRef, ...constraints));
    
    // Process the records
    const records: AttendanceRecord[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const date = data.date instanceof Timestamp 
        ? data.date.toDate().toISOString().split('T')[0]
        : data.date;
      
      return {
        id: doc.id,
        date,
        status: data.status,
        time: data.time || null,
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
        dayNumber: new Date(date).getDate(),
        hoursSpent: data.hoursSpent || 0,
        courseId: data.courseId,
        courseName: data.courseName,
        timeIn: data.timeIn,
        timeOut: data.timeOut,
        notes: data.notes
      } as AttendanceRecord;
    });
      
    // If we have filtered data (date range, course, or status), calculate summary from filtered records
    // Otherwise, use the real-time summary data for better performance
    let totalDays, presentDays, absentDays, lateDays, excusedDays, presentPercentage, totalHours, averageHoursPerDay;
      // Check if we need to use filtered data instead of real-time data
    const useFilteredData = 
      // Use filtered data when specific courseId or status filters are applied
      params.courseId || params.status ||
      // Use filtered data when using non-default date ranges
      (params.startDate && params.endDate && 
       (Math.abs(new Date().getTime() - params.endDate.getTime()) > 86400000 || // End date is not today (allowing 1 day difference)
        Math.abs(subMonths(new Date(), 3).getTime() - params.startDate.getTime()) > 86400000)); // Start date is not 3 months ago
    
    console.log('Attendance data source decision:', { 
      useFilteredData,
      hasRealTimeData: !!(realTimeSummary.present || realTimeSummary.absent)
    });
        
    if (useFilteredData) {
      // Calculate from filtered records
      totalDays = records.length;
      presentDays = records.filter(r => r.status === 'present').length;
      absentDays = records.filter(r => r.status === 'absent').length;
      lateDays = records.filter(r => r.status === 'late').length;
      excusedDays = records.filter(r => r.status === 'excused').length;
      
      console.log('Using filtered data for attendance summary:', { totalDays, presentDays, absentDays });
    } else {
      // Use real-time summary when using default filters
      totalDays = realTimeSummary.present + realTimeSummary.absent;
      presentDays = realTimeSummary.present;
      absentDays = realTimeSummary.absent;
      lateDays = records.filter(r => r.status === 'late').length; // Calculate from records as it may not be in the summary
      excusedDays = records.filter(r => r.status === 'excused').length; // Calculate from records as it may not be in the summary
      
      console.log('Using real-time data for attendance summary:', { totalDays, presentDays, absentDays });
    }
    
    presentPercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    totalHours = records.reduce((sum, record) => sum + (record.hoursSpent || 0), 0);
    averageHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
  
  // Check if student has attendanceSummaryByMonth in the new data structure
    const monthlyBreakdown = (studentData.attendanceSummaryByMonth || {}) as Record<string, AttendanceMonthData>;
    
    // If we have filtered data, calculate monthly summary from records
    // Otherwise, use the real-time monthly summary if available
    let monthlySummary;
    
    if (useFilteredData || !Object.keys(monthlyBreakdown).length) {
      // Calculate from filtered records (traditional way)
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
      
      monthlySummary = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        presentDays: data.present,
        absentDays: data.absent,
        presentPercentage: data.total > 0 ? (data.present / data.total) * 100 : 0
      })).sort((a, b) => a.month.localeCompare(b.month));
    } else {    // Use real-time monthly summary
      monthlySummary = Object.entries(monthlyBreakdown).map(([month, data]) => ({
        month,
        presentDays: data.present,
        absentDays: data.absent,
        presentPercentage: (data.present + data.absent) > 0 
          ? (data.present / (data.present + data.absent)) * 100 
          : 0
      })).sort((a, b) => a.month.localeCompare(b.month));
    }
    
    // Check if student has attendanceSummaryByCourse in the new data structure
    const courseBreakdown = (studentData.attendanceSummaryByCourse || {}) as Record<string, AttendanceCourseData>;
      // If we have filtered data, calculate course breakdown from records
    // Otherwise, use the real-time course summary if available
    let courseBreakdownData;
    
    if (useFilteredData || !Object.keys(courseBreakdown).length) {
      // Calculate from filtered records (traditional way)
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
      
      courseBreakdownData = Object.entries(courseData).map(([courseId, data]) => ({
        courseId,
        courseName: data.courseName,
        presentDays: data.present,
        absentDays: data.absent,
        presentPercentage: data.total > 0 ? (data.present / data.total) * 100 : 0
      }));
    } else {
      // Use real-time course summary
      courseBreakdownData = Object.entries(courseBreakdown).map(([courseId, courseData]) => ({
        courseId,
        courseName: courseData.courseName || `Course ${courseId}`,
        presentDays: courseData.present,
        absentDays: courseData.absent,
        presentPercentage: (courseData.present + courseData.absent) > 0 
          ? (courseData.present / (courseData.present + courseData.absent)) * 100 
          : 0
      }));
    }    // Add course dates if available
    let courseInfo = {};
    if (courseData) {
      courseInfo = {
        courseStartDate: courseData.startDate ? new Date(courseData.startDate) : undefined,
        courseEndDate: courseData.endDate ? new Date(courseData.endDate) : undefined,
        courseDuration: courseData.duration || '',
        courseDates: {
          start: courseData.startDate ? new Date(courseData.startDate).toISOString().split('T')[0] : '',
          end: courseData.endDate ? new Date(courseData.endDate).toISOString().split('T')[0] : '',
        }
      };
    }
    
    return {
      overallSummary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        excusedDays,
        presentPercentage,
        totalHours,
        averageHoursPerDay,
        ...courseInfo
      },
      monthlySummary,
      courseBreakdown: courseBreakdownData,
      // Include raw records for any advanced processing
      records: records.slice(0, 100) // Limit to 100 records for performance
    };
  } catch (error) {
    console.error("Error fetching student attendance summary:", error);
      // Return empty data structure with zeros
    return {
      overallSummary: {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        excusedDays: 0,
        presentPercentage: 0,
        totalHours: 0,
        averageHoursPerDay: 0
      },
      monthlySummary: [],
      courseBreakdown: [],
      records: []
    };
  }
}
