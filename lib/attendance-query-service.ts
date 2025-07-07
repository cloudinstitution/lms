/**
 * ATTENDANCE QUERY SERVICE IMPROVEMENTS
 * 
 * This service has been enhanced to provide comprehensive course data for individual student 
 * attendance pages with the following features:
 * 
 * 1. COURSE DETAILS RETRIEVAL:
 *    - Fetches complete course information from courses collection
 *    - Includes start date, end date, duration, category, description, price, etc.
 *    - Combines with student's attendance data from attendanceByCourse
 * 
 * 2. FIXED COURSE NAME DISPLAY:
 *    - Now properly displays course title from courses collection
 *    - Falls back gracefully if course title is not available
 *    - No longer shows 'Course courseId' format
 * 
 * 3. UI-READY COURSE DATA:
 *    - formatCourseForCard() function formats data for presentable cards
 *    - Includes formatted dates, prices, attendance percentages
 *    - Provides helper properties for UI state management
 * 
 * 4. COMPREHENSIVE API ENDPOINTS:
 *    - Enhanced attendance API with includeCoursesDetail parameter
 *    - New dedicated courses API for student course details
 *    - Optimized data structure for frontend consumption
 * 
 * USAGE:
 * - For attendance records only: Use getStudentAttendanceRecords()
 * - For attendance summary with courses: Use getStudentAttendanceWithCourses()
 * - For course details only: Use getStudentCoursesData() or formatCourseForCard()
 */

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

// Interface for student attendanceByCourse structure
interface StudentAttendanceByCourse {
  [courseId: string]: {
    datesPresent: string[];
    summary: {
      totalClasses: number;
      attended: number;
      percentage: number;
    };
    courseName?: string;
  };
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

// Interface for course data
export interface CourseInfo {
  id: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
  duration?: string;
  title?: string;
  category?: string;
  description?: string;
  price?: string;
  status?: string;
  // Additional fields for better course presentation
  instructors?: string[];
  mode?: string;
  location?: string;
  totalHours?: number;
  level?: string;
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
    // Fetch student's attendanceByCourse summary
    const studentDoc = await getDoc(doc(db, "students", studentId));
    if (!studentDoc.exists()) {
      throw new Error(`Student with ID ${studentId} not found`);
    }
    const studentData = studentDoc.data();
    const attendanceByCourse = studentData.attendanceByCourse as StudentAttendanceByCourse || {};

    // Collect all present dates for all courses (or specific course if filtered)
    let allRecords: AttendanceRecord[] = [];
    const coursesToProcess = params.courseId 
      ? { [params.courseId]: attendanceByCourse[params.courseId] }
      : attendanceByCourse;

    for (const [courseId, courseData] of Object.entries(coursesToProcess)) {
      if (!courseData) continue; // Skip if course data doesn't exist
      
      // Fetch course info to get start/end dates if using course timeframe
      let courseStartDate: Date | undefined;
      let courseEndDate: Date | undefined;
      
      if (params.useCourseTimeframe) {
        try {
          const courseDoc = await getDoc(doc(db, "courses", courseId));
          if (courseDoc.exists()) {
            const courseInfo = courseDoc.data();
            
            // Handle different date formats that might be stored in Firestore
            if (courseInfo.startDate) {
              if (courseInfo.startDate.toDate) {
                // Firestore Timestamp
                courseStartDate = courseInfo.startDate.toDate();
              } else if (typeof courseInfo.startDate === 'string') {
                // String date
                courseStartDate = new Date(courseInfo.startDate);
              } else if (courseInfo.startDate instanceof Date) {
                // Already a Date object
                courseStartDate = courseInfo.startDate;
              }
              
              // Validate the date
              if (courseStartDate && isNaN(courseStartDate.getTime())) {
                console.warn(`Invalid start date for course ${courseId}:`, courseInfo.startDate);
                courseStartDate = undefined;
              }
            }
            
            if (courseInfo.endDate) {
              if (courseInfo.endDate.toDate) {
                // Firestore Timestamp
                courseEndDate = courseInfo.endDate.toDate();
              } else if (typeof courseInfo.endDate === 'string') {
                // String date
                courseEndDate = new Date(courseInfo.endDate);
              } else if (courseInfo.endDate instanceof Date) {
                // Already a Date object
                courseEndDate = courseInfo.endDate;
              }
              
              // Validate the date
              if (courseEndDate && isNaN(courseEndDate.getTime())) {
                console.warn(`Invalid end date for course ${courseId}:`, courseInfo.endDate);
                courseEndDate = undefined;
              }
            }
            
            console.log(`Course ${courseId} dates:`, {
              startDate: courseStartDate,
              endDate: courseEndDate,
              rawStartDate: courseInfo.startDate,
              rawEndDate: courseInfo.endDate,
              startDateType: typeof courseInfo.startDate,
              endDateType: typeof courseInfo.endDate,
              hasToDateStart: courseInfo.startDate?.toDate ? 'yes' : 'no',
              hasToDateEnd: courseInfo.endDate?.toDate ? 'yes' : 'no'
            });
          }
        } catch (error) {
          console.error(`Error fetching course ${courseId}:`, error);
        }
      }

      const datesPresent: string[] = courseData.datesPresent || [];
      for (const date of datesPresent) {
        // Apply date filtering
        const recordDate = new Date(date);
        
        // Use course dates if useCourseTimeframe is true, otherwise use provided dates
        const startDate = params.useCourseTimeframe ? courseStartDate : params.startDate;
        const endDate = params.useCourseTimeframe ? courseEndDate : params.endDate;
        
        if (startDate && recordDate < startDate) continue;
        if (endDate && recordDate > endDate) continue;
        
        // Fetch attendance doc for this course/date
        const attendanceDoc = await getDoc(doc(db, "attendance", courseId, "dates", date));
        if (attendanceDoc.exists()) {
          const data = attendanceDoc.data();
          
          // Fetch course info to get proper course title
          let actualCourseName = courseData.courseName || `Course ${courseId}`;
          try {
            const courseDoc = await getDoc(doc(db, "courses", courseId));
            if (courseDoc.exists()) {
              const courseInfo = courseDoc.data();
              actualCourseName = courseInfo.title || courseInfo.courseName || actualCourseName;
            }
          } catch (error) {
            console.warn(`Could not fetch course info for ${courseId}:`, error);
          }
          
          allRecords.push({
            id: attendanceDoc.id,
            date: data.date,
            status: data.presentStudents.includes(studentId) ? "present" : "absent",
            time: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "") : null,
            hoursSpent: 7, // Default, or fetch from data if available
            courseId: data.courseId,
            courseName: actualCourseName,
            dayName: new Date(data.date).toLocaleDateString('en-US', { weekday: 'long' }),
            dayNumber: new Date(data.date).getDate(),
          });
        }
      }
    }

    // Apply status filter
    if (params.status) {
      allRecords = allRecords.filter(r => r.status === params.status);
    }
    
    // Sort by date desc
    allRecords.sort((a, b) => b.date.localeCompare(a.date));
    
    // Pagination
    const pageSize = params.limit || 10;
    const pageNumber = params.page || 1;
    const totalRecords = allRecords.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const records = allRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    
    return { records, totalRecords, totalPages, currentPage: pageNumber };
  } catch (error) {
    console.error("Error fetching student attendance records:", error);
    return { records: [], totalRecords: 0, totalPages: 0, currentPage: params.page || 1 };
  }
}

export async function getStudentAttendanceSummary(
  studentId: string,
  params: AttendanceQueryParams = {}
): Promise<AttendanceSummaryResponse> {
  try {
    // Fetch student's attendanceByCourse summary
    const studentDoc = await getDoc(doc(db, "students", studentId));
    if (!studentDoc.exists()) {
      throw new Error(`Student with ID ${studentId} not found`);
    }
    const studentData = studentDoc.data();
    const attendanceByCourse = studentData.attendanceByCourse as StudentAttendanceByCourse || {};
    
    let totalClasses = 0, attended = 0;
    let courseBreakdown: any[] = [];
    let monthlySummary: any[] = [];
    let courseInfo: any = {};
    
    // Process courses - filter by courseId if specified, otherwise show only courses with attendance
    const coursesToProcess = params.courseId 
      ? (attendanceByCourse[params.courseId] ? { [params.courseId]: attendanceByCourse[params.courseId] } : {})
      : Object.fromEntries(Object.entries(attendanceByCourse).filter(([_, data]) => data.datesPresent && data.datesPresent.length > 0));

    // Fetch course info for date ranges and course names
    const courseInfoPromises = Object.keys(coursesToProcess).map(async (courseId) => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          
          // Handle different date formats that might be stored in Firestore
          let startDate, endDate;
          
          if (courseData.startDate) {
            if (courseData.startDate.toDate) {
              // Firestore Timestamp
              startDate = courseData.startDate.toDate();
            } else if (typeof courseData.startDate === 'string') {
              // String date
              startDate = new Date(courseData.startDate);
            } else if (courseData.startDate instanceof Date) {
              // Already a Date object
              startDate = courseData.startDate;
            }
            
            // Validate the date
            if (startDate && isNaN(startDate.getTime())) {
              console.warn(`Invalid start date for course ${courseId}:`, courseData.startDate);
              startDate = undefined;
            }
          }
          
          if (courseData.endDate) {
            if (courseData.endDate.toDate) {
              // Firestore Timestamp
              endDate = courseData.endDate.toDate();
            } else if (typeof courseData.endDate === 'string') {
              // String date
              endDate = new Date(courseData.endDate);
            } else if (courseData.endDate instanceof Date) {
              // Already a Date object
              endDate = courseData.endDate;
            }
            
            // Validate the date
            if (endDate && isNaN(endDate.getTime())) {
              console.warn(`Invalid end date for course ${courseId}:`, courseData.endDate);
              endDate = undefined;
            }
          }
          
          return {
            courseId,
            startDate,
            endDate,
            duration: courseData.duration,
            title: courseData.title || courseData.courseName
          };
        }
      } catch (error) {
        console.error(`Error fetching course ${courseId}:`, error);
      }
      return null;
    });

    const courseInfoResults = await Promise.all(courseInfoPromises);
    const courseInfoMap = courseInfoResults.reduce((acc, info) => {
      if (info) acc[info.courseId] = info;
      return acc;
    }, {} as any);

    // Calculate overall summary and course breakdown
    const monthlyData: { [month: string]: { present: number; absent: number; total: number } } = {};
    
    for (const [courseId, courseData] of Object.entries(coursesToProcess)) {
      const summary = courseData.summary || { totalClasses: 0, attended: 0, percentage: 0 };
      const courseInfo = courseInfoMap[courseId];
      
      // Apply date filtering if specified
      let filteredDatesPresent = courseData.datesPresent || [];
      if (params.useCourseTimeframe && courseInfo) {
        const courseStartDate = courseInfo.startDate;
        const courseEndDate = courseInfo.endDate;
        
        filteredDatesPresent = filteredDatesPresent.filter(date => {
          const recordDate = new Date(date);
          if (courseStartDate && recordDate < courseStartDate) return false;
          if (courseEndDate && recordDate > courseEndDate) return false;
          return true;
        });
      } else if (params.startDate || params.endDate) {
        filteredDatesPresent = filteredDatesPresent.filter(date => {
          const recordDate = new Date(date);
          if (params.startDate && recordDate < params.startDate) return false;
          if (params.endDate && recordDate > params.endDate) return false;
          return true;
        });
      }

      // Calculate filtered attendance
      const filteredAttended = filteredDatesPresent.length;
      const filteredTotal = summary.totalClasses; // Use total classes from summary as baseline
      
      totalClasses += filteredTotal;
      attended += filteredAttended;
      
      // Add to monthly summary
      filteredDatesPresent.forEach(date => {
        const month = date.substring(0, 7); // YYYY-MM format
        if (!monthlyData[month]) {
          monthlyData[month] = { present: 0, absent: 0, total: 0 };
        }
        monthlyData[month].present += 1;
        monthlyData[month].total += 1;
      });

      courseBreakdown.push({
        courseId,
        courseName: courseInfo?.title || courseInfo?.name || courseData.courseName || `Course ${courseId}`,
        presentDays: filteredAttended,
        absentDays: Math.max(0, filteredTotal - filteredAttended),
        presentPercentage: filteredTotal > 0 ? (filteredAttended / filteredTotal) * 100 : 0,
        totalClasses: filteredTotal,
        // Add comprehensive course details
        startDate: courseInfo?.startDate,
        endDate: courseInfo?.endDate,
        duration: courseInfo?.duration,
        category: courseInfo?.category,
        description: courseInfo?.description,
        price: courseInfo?.price,
        status: courseInfo?.status
      });
    }

    // Process monthly summary
    monthlySummary = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      presentDays: data.present,
      absentDays: data.absent,
      presentPercentage: data.total > 0 ? (data.present / data.total) * 100 : 0
    })).sort((a, b) => a.month.localeCompare(b.month));

    // Add course date information if using specific course
    if (params.courseId && courseInfoMap[params.courseId]) {
      const courseData = courseInfoMap[params.courseId];
      
      // Only add course info if we have valid dates
      if (courseData.startDate && courseData.endDate) {
        courseInfo = {
          startDate: courseData.startDate,
          endDate: courseData.endDate,
          duration: courseData.duration || '',
          courseDates: {
            start: courseData.startDate.toISOString().split('T')[0],
            end: courseData.endDate.toISOString().split('T')[0],
          }
        };
      } else {
        // Log what we found for debugging
        console.log(`Course ${params.courseId} missing date information:`, {
          hasStartDate: !!courseData.startDate,
          hasEndDate: !!courseData.endDate,
          startDate: courseData.startDate,
          endDate: courseData.endDate,
          title: courseData.title
        });
      }
    } else if (!params.courseId && Object.keys(courseInfoMap).length > 0) {
      // When showing all courses, add date range information from the first course with valid dates
      // This will show the overall course period in the attendance summary
      const validCourses = Object.values(courseInfoMap)
        .filter((course: any) => course && course.startDate && course.endDate);
      
      if (validCourses.length > 0) {
        // If there's only one course, use its details
        if (validCourses.length === 1) {
          const singleCourse = validCourses[0] as any;
          courseInfo = {
            startDate: singleCourse.startDate,
            endDate: singleCourse.endDate,
            duration: singleCourse.duration || '',
            courseDates: {
              start: singleCourse.startDate.toISOString().split('T')[0],
              end: singleCourse.endDate.toISOString().split('T')[0],
            }
          };
        } else {
          // If multiple courses, use the earliest start and latest end
          const earliestStart = validCourses.reduce((earliest: any, course: any) => 
            course.startDate < earliest ? course.startDate : earliest, (validCourses[0] as any).startDate);
          const latestEnd = validCourses.reduce((latest: any, course: any) => 
            course.endDate > latest ? course.endDate : latest, (validCourses[0] as any).endDate);
          
          courseInfo = {
            startDate: earliestStart,
            endDate: latestEnd,
            duration: `${validCourses.length} courses`,
            courseDates: {
              start: (earliestStart as any).toISOString().split('T')[0],
              end: (latestEnd as any).toISOString().split('T')[0],
            }
          };
        }
      }
    }
    
    // Fallback: If no course info was added but we have course data, try to add course information
    // This ensures that even if the above conditions aren't met, we still try to show course dates
    if (!courseInfo.startDate && Object.keys(courseInfoMap).length > 0) {
      console.log('Trying fallback course info logic...');
      const validCourses = Object.values(courseInfoMap)
        .filter((course: any) => course && course.startDate && course.endDate);
      
      if (validCourses.length > 0) {
        const firstValidCourse = validCourses[0] as any;
        courseInfo = {
          startDate: firstValidCourse.startDate,
          endDate: firstValidCourse.endDate,
          duration: firstValidCourse.duration || (validCourses.length > 1 ? `${validCourses.length} courses` : ''),
          courseDates: {
            start: firstValidCourse.startDate.toISOString().split('T')[0],
            end: firstValidCourse.endDate.toISOString().split('T')[0],
          }
        };
        console.log('Fallback course info applied:', courseInfo);
      }
    }

    const presentPercentage = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;
    
    // Debug logging for course info
    console.log('Course info being returned:', {
      hasCourseInfo: !!courseInfo.startDate,
      startDate: courseInfo.startDate,
      endDate: courseInfo.endDate,
      duration: courseInfo.duration,
      courseCount: Object.keys(coursesToProcess).length,
      selectedCourseId: params.courseId,
      courseInfoMapKeys: Object.keys(courseInfoMap),
      courseInfoMapValues: Object.values(courseInfoMap).map((c: any) => ({ 
        courseId: c?.courseId, 
        hasStartDate: !!c?.startDate, 
        hasEndDate: !!c?.endDate, 
        title: c?.title 
      }))
    });
    
    return {
      overallSummary: {
        totalDays: totalClasses,
        presentDays: attended,
        absentDays: totalClasses - attended,
        lateDays: 0,
        excusedDays: 0,
        presentPercentage,
        totalHours: attended * 7, // Default 7 hours per day
        averageHoursPerDay: attended > 0 ? 7 : 0,
        ...courseInfo
      },
      monthlySummary,
      courseBreakdown,
      records: [],
    };
  } catch (error) {
    console.error("Error fetching student attendance summary:", error);
    return {
      overallSummary: {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        excusedDays: 0,
        presentPercentage: 0,
        totalHours: 0,
        averageHoursPerDay: 0,
      },
      monthlySummary: [],
      courseBreakdown: [],
      records: [],
    };
  }
}

// Function to fetch course information from the courses collection
export async function fetchCourseInfo(courseId: string): Promise<CourseInfo | null> {
  try {
    const courseDoc = await getDoc(doc(db, "courses", courseId));
    if (!courseDoc.exists()) {
      console.warn(`Course with ID ${courseId} not found`);
      return null;
    }
    
    const courseData = courseDoc.data();
    console.log(`Raw course data for ${courseId}:`, {
      startDate: courseData.startDate,
      endDate: courseData.endDate,
      duration: courseData.duration,
      title: courseData.title,
      startDateType: typeof courseData.startDate,
      endDateType: typeof courseData.endDate,
      hasToDateMethod: courseData.startDate?.toDate ? 'yes' : 'no'
    });
    
    // Handle different date formats that might be stored in Firestore
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (courseData.startDate) {
      if (courseData.startDate.toDate) {
        // Firestore Timestamp
        startDate = courseData.startDate.toDate();
        console.log(`Converted startDate from Timestamp: ${startDate}`);
      } else if (typeof courseData.startDate === 'string') {
        // String date
        startDate = new Date(courseData.startDate);
        console.log(`Converted startDate from string: ${startDate}`);
      } else if (courseData.startDate instanceof Date) {
        // Already a Date object
        startDate = courseData.startDate;
        console.log(`Using Date object for startDate: ${startDate}`);
      }
      
      // Validate the date
      if (startDate && isNaN(startDate.getTime())) {
        console.warn(`Invalid start date for course ${courseId}:`, courseData.startDate);
        startDate = undefined;
      }
    }
    
    if (courseData.endDate) {
      if (courseData.endDate.toDate) {
        // Firestore Timestamp
        endDate = courseData.endDate.toDate();
        console.log(`Converted endDate from Timestamp: ${endDate}`);
      } else if (typeof courseData.endDate === 'string') {
        // String date
        endDate = new Date(courseData.endDate);
        console.log(`Converted endDate from string: ${endDate}`);
      } else if (courseData.endDate instanceof Date) {
        // Already a Date object
        endDate = courseData.endDate;
        console.log(`Using Date object for endDate: ${endDate}`);
      }
      
      // Validate the date
      if (endDate && isNaN(endDate.getTime())) {
        console.warn(`Invalid end date for course ${courseId}:`, courseData.endDate);
        endDate = undefined;
      }
    }

    const result = {
      id: courseId,
      name: courseData.title || courseData.courseName || `Course ${courseId}`,
      startDate,
      endDate,
      duration: courseData.duration,
      title: courseData.title,
      category: courseData.category,
      description: courseData.description,
      price: courseData.price,
      status: courseData.status,
      // Additional fields
      instructors: courseData.instructors || [],
      mode: courseData.mode || courseData.deliveryMode,
      location: courseData.location,
      totalHours: courseData.totalHours,
      level: courseData.level
    };
    
    console.log(`Final course info for ${courseId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    return null;
  }
}

// Function to fetch multiple courses
export async function fetchCoursesInfo(courseIds: string[]): Promise<CourseInfo[]> {
  try {
    const coursePromises = courseIds.map(id => fetchCourseInfo(id));
    const courses = await Promise.all(coursePromises);
    return courses.filter(course => course !== null) as CourseInfo[];
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

// Debug function to check course date structure
export async function debugCourseDate(courseId: string) {
  try {
    const courseDoc = await getDoc(doc(db, "courses", courseId));
    if (courseDoc.exists()) {
      const courseData = courseDoc.data();
      console.log(`Course ${courseId} raw data:`, {
        startDate: courseData.startDate,
        endDate: courseData.endDate,
        startDateType: typeof courseData.startDate,
        endDateType: typeof courseData.endDate,
        hasToDate: courseData.startDate?.toDate ? 'yes' : 'no',
        title: courseData.title || courseData.courseName
      });
      return courseData;
    } else {
      console.log(`Course ${courseId} not found`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    return null;
  }
}

// Function to get student's course data with detailed course information
export async function getStudentCoursesData(studentId: string): Promise<{
  courses: (CourseInfo & {
    attendanceData?: {
      datesPresent: string[];
      summary: {
        totalClasses: number;
        attended: number;
        percentage: number;
      };
    };
  })[];
}> {
  try {
    // Fetch student's data to get courses and attendance
    const studentDoc = await getDoc(doc(db, "students", studentId));
    if (!studentDoc.exists()) {
      throw new Error(`Student with ID ${studentId} not found`);
    }
    
    const studentData = studentDoc.data();
    const attendanceByCourse = studentData.attendanceByCourse as StudentAttendanceByCourse || {};
    
    // Get course IDs from student's attendance data
    const courseIds = Object.keys(attendanceByCourse);
    
    // Fetch detailed course information
    const coursesData = await Promise.all(
      courseIds.map(async (courseId) => {
        const courseInfo = await fetchCourseInfo(courseId);
        if (!courseInfo) return null;
        
        return {
          ...courseInfo,
          attendanceData: attendanceByCourse[courseId]
        };
      })
    );
    
    // Filter out null values and return
    return {
      courses: coursesData.filter(course => course !== null) as any[]
    };
  } catch (error) {
    console.error("Error fetching student courses data:", error);
    return { courses: [] };
  }
}

// Function to format course data for presentable cards
export function formatCourseForCard(course: CourseInfo & { attendanceData?: any }) {
  const formatDate = (date?: Date) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return 'Duration not specified';
    return duration;
  };

  const formatPrice = (price?: string) => {
    if (!price) return 'Free';
    return price.startsWith('₹') ? price : `₹${price}`;
  };

  const calculateAttendancePercentage = () => {
    if (!course.attendanceData?.summary) return 0;
    const { attended, totalClasses } = course.attendanceData.summary;
    return totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;
  };

  return {
    id: course.id,
    title: course.title || course.name,
    category: course.category || 'General',
    description: course.description || 'No description available',
    startDate: formatDate(course.startDate),
    endDate: formatDate(course.endDate),
    duration: formatDuration(course.duration),
    price: formatPrice(course.price),
    status: course.status || 'Active',
    mode: course.mode || 'Not specified',
    location: course.location || 'Online',
    level: course.level || 'Beginner',
    totalHours: course.totalHours || 0,
    instructors: course.instructors || [],
    attendancePercentage: calculateAttendancePercentage(),
    attendedClasses: course.attendanceData?.summary?.attended || 0,
    totalClasses: course.attendanceData?.summary?.totalClasses || 0,
    datesPresent: course.attendanceData?.datesPresent || [],
    // Helper properties for UI
    isActive: course.status?.toLowerCase() === 'active',
    hasValidDates: !!(course.startDate && course.endDate),
    isPaid: course.price && course.price !== '0' && course.price !== 'Free',
    attendanceStatus: calculateAttendancePercentage() >= 75 ? 'good' : 
                     calculateAttendancePercentage() >= 50 ? 'warning' : 'danger'
  };
}

// Function to get comprehensive course data for student attendance page
export async function getStudentAttendanceWithCourses(
  studentId: string,
  params: AttendanceQueryParams = {}
) {
  try {
    // Get attendance summary
    const attendanceSummary = await getStudentAttendanceSummary(studentId, params);
    
    // Get detailed course data
    const coursesData = await getStudentCoursesData(studentId);
    
    // Format courses for UI presentation
    const formattedCourses = coursesData.courses.map(course => formatCourseForCard(course));
    
    return {
      ...attendanceSummary,
      coursesDetail: formattedCourses,
      hasMultipleCourses: formattedCourses.length > 1,
      activeCourses: formattedCourses.filter(course => course.isActive),
      completedCourses: formattedCourses.filter(course => !course.isActive)
    };
  } catch (error) {
    console.error("Error fetching student attendance with courses:", error);
    throw error;
  }
}
