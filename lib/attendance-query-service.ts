import { AttendanceRecord, AttendanceSummary } from './attendance-service';
import { AttendanceSummaryResponse } from './attendance-types';
import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, Timestamp } from 'firebase/firestore';

// Interface for attendance queries
export interface AttendanceQueryParams {
  startDate?: Date;
  endDate?: Date;
  courseId?: string;
  status?: string;
  page?: number;
  limit?: number;
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
    
    // Get all attendance records for the student with no pagination
    // In a production environment, you might want to use a different approach for large datasets
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
      // Calculate overall summary
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const excusedDays = records.filter(r => r.status === 'excused').length;
    const presentPercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    const totalHours = records.reduce((sum, record) => sum + (record.hoursSpent || 0), 0);
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
        lateDays,
        excusedDays,
        presentPercentage,
        totalHours,
        averageHoursPerDay
      },
      monthlySummary,
      courseBreakdown,
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
