"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateStudentAttendanceSummary } from "@/lib/attendance-total-classes-service"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { getAdminSession } from "@/lib/session-storage"
import { cn } from "@/lib/utils"
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from "firebase/firestore"
import { DownloadCloud, Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import * as XLSX from 'xlsx'
import AttendanceScanner from "./attendance-scanner"

interface Student {
  id: string
  customId: string
  name: string
  present: boolean
  courses: {
    courseID: string
    courseName: string
  }[]
  primaryCourseIndex: number
  attendanceSummary?: {
    present: number
    absent: number
  }
}

interface CourseStats {
  courseID: string
  courseName: string
  totalStudents: number
  presentStudents: number
  percentage: number
}

interface AttendanceStats {
  totalStudents: number
  presentStudents: number
  absentStudents: number
  attendancePercentage: number
  courseStats: CourseStats[]
}

interface BatchAttendanceState {
  changes: Map<string, boolean>
  modified: boolean
  submitting: boolean
}

type FilterStatus = "all" | "present" | "absent"

export default function AdminAttendancePage() {
  const { user, userProfile } = useAuth()
  const adminSession = getAdminSession() // Get admin session data
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<{ [key: string]: { id: string; title: string } }>({})
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [courseNamesUpdated, setCourseNamesUpdated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all")
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [scannerRefreshKey, setScannerRefreshKey] = useState(0)
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentStudents: 0,
    absentStudents: 0,
    attendancePercentage: 0,
    courseStats: []
  })
  
  const [batchAttendance, setBatchAttendance] = useState<BatchAttendanceState>({
    changes: new Map(),
    modified: false,
    submitting: false
  });

  const [isThrottling, setIsThrottling] = useState(false);

  // Throttle function to prevent rapid clicks
  const throttleAction = useCallback(async (action: () => void | Promise<void>) => {
    if (isThrottling) return;
    
    setIsThrottling(true);
    try {
      await action();
    } finally {
      setTimeout(() => setIsThrottling(false), 500); // 500ms throttle
    }
  }, [isThrottling]);

  // Get user authentication data and claims (memoized to prevent frequent updates)
  const { userClaims } = useAuth()
  const adminData = getAdminSession()
  
  // Determine if user is teacher and get their assigned courses (memoized)
  const isTeacher = useMemo(() => 
    userClaims?.role === 'teacher' || adminData?.role === 'teacher',
    [userClaims?.role, adminData?.role]
  )
  
  const assignedCourses = useMemo(() => 
    userClaims?.assignedCourses || adminData?.assignedCourses || [],
    [userClaims?.assignedCourses, adminData?.assignedCourses]
  )

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  // Stable stringified version of assigned courses to prevent frequent re-fetches
  const assignedCoursesString = useMemo(() => 
    JSON.stringify(assignedCourses.sort()),
    [assignedCourses]
  )

  // Load courses data on component mount (only when auth stabilizes)
  useEffect(() => {
    // Only prevent fetch if already in progress or already fetched successfully
    if (coursesFetchedRef.current && !coursesError) return;
    
    const fetchCourses = async (): Promise<void> => {
      setCoursesLoading(true)
      setCoursesError(null)
      coursesFetchedRef.current = true // Mark as fetched to prevent multiple calls
      
      try {
        const coursesCollection = collection(db, "courses")
        let coursesSnapshot
        
        // Filter courses for teachers based on their assigned courses
        if (isTeacher && assignedCourses.length > 0) {
          const coursesQuery = query(coursesCollection, where("__name__", "in", assignedCourses))
          coursesSnapshot = await getDocs(coursesQuery)
        } else {
          coursesSnapshot = await getDocs(coursesCollection)
        }
        
        const courseMapping: { [key: string]: { id: string; title: string } } = {}

        coursesSnapshot.docs.forEach(doc => {
          const courseData = doc.data()
          if (courseData.courseID) {
            const courseIdString = courseData.courseID.toString()
            courseMapping[courseIdString] = {
              id: doc.id,
              title: courseData.title || "Untitled Course"
            }
          }
        })
        
        setCourses(courseMapping)
      } catch (error) {
        console.error("Error fetching courses:", error)
        setCoursesError("Failed to load courses. Please refresh the page.")
        coursesFetchedRef.current = false // Reset flag on error so user can retry
      } finally {
        setCoursesLoading(false)
      }
    }

    fetchCourses()
  }, [isTeacher, assignedCoursesString])

  // Show error message if courses failed to load
  useEffect(() => {
    if (coursesError) {
      toast.error(coursesError, {
        description: "Please check your network connection and try again."
      })
    }
  }, [coursesError])

  const matchesSearch = (student: Student) => {
    const query = searchQuery.toLowerCase();
    return student.name.toLowerCase().includes(query) ||
      student.customId.toLowerCase().includes(query);
  };

  // Batch Controls Component
  const BatchControls = () => (
    <div className="flex items-center gap-4 my-4">
      <Button
        variant="outline"
        onClick={() => throttleAction(() => markAllStudents(true))}
        className="hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
        disabled={batchAttendance.submitting || loading || isThrottling}>
        Mark All Present
      </Button>
      <Button
        variant="outline"
        onClick={() => throttleAction(() => markAllStudents(false))}
        className="hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
        disabled={batchAttendance.submitting || loading || isThrottling}>
        Mark All Absent
      </Button>
      <Button
        variant="outline"
        onClick={() => throttleAction(submitAttendanceChanges)}
        className="hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
        disabled={!batchAttendance.modified || batchAttendance.submitting || loading || isThrottling}>
        {batchAttendance.submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Attendance'
        )}
      </Button>
    </div>
  );

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const primaryCourse = student.courses[student.primaryCourseIndex];
      const courseMatch = selectedCourse === "all" || primaryCourse.courseID === selectedCourse;
      const statusMatch = selectedStatus === "all" ||
        (selectedStatus === "present" && student.present) ||
        (selectedStatus === "absent" && !student.present);
      return courseMatch && statusMatch && matchesSearch(student);
    });
  }, [students, selectedCourse, selectedStatus, searchQuery]);
  
  const calculateCourseStats = useCallback((studentsList: Student[]): CourseStats[] => {
    // Group students by their primary course
    const courseGroups = new Map<string, Student[]>();

    studentsList.forEach(student => {
      const primaryCourse = student.courses[student.primaryCourseIndex];
      if (!courseGroups.has(primaryCourse.courseID)) {
        courseGroups.set(primaryCourse.courseID, []);
      }
      courseGroups.get(primaryCourse.courseID)!.push(student);
    });

    // Calculate stats for each course
    const courseStats = Array.from(courseGroups.entries()).map(([courseID, students]) => {
      const totalStudents = students.length;
      const presentStudents = students.filter(s => s.present).length;

      return {
        courseID,
        courseName: courses[courseID]?.title || "Uncategorized", // Use courses state directly
        totalStudents,
        presentStudents,
        percentage: totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0
      };
    });    
    
    // Sort courses by name
    return courseStats.sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [courses]) // Add courses as dependency
  
  // Use ref to avoid dependency cycles
  const fetchStudentsRef = useRef<((showToast?: boolean) => Promise<void>) | null>(null);
  const coursesFetchedRef = useRef(false);

  const fetchStudentsForDate = useCallback(async (showToast = true) => {
    if (!date) return
    
    if (showToast) {
      toast.info("Loading students", {
        id: "loading-students",
        description: "Fetching student data for the selected date"
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(date)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate > today) {
      toast.error("Cannot mark attendance for future dates", {
        id: "future-date-error",
        description: "Please select today or a past date",
        duration: 5000
      })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const dateString = formatDate(date)
      
      // Get all students
      const studentsQuery = query(collection(db, "students"))
      const studentSnapshot = await getDocs(studentsQuery)
      
      // Get attendance data for all courses for this date in a single batch
      const attendanceDataByCourse = new Map<string, string[]>()
      
      // Get all course IDs from students to check their attendance
      const allCourseIds = new Set<string>()
      studentSnapshot.docs.forEach(studentDoc => {
        const studentData = studentDoc.data()
        const courseIDs = Array.isArray(studentData.courseID) ? studentData.courseID : [studentData.courseID]
        courseIDs.forEach((id: string) => {
          if (id) allCourseIds.add(id.toString())
        })
      })

      // Fetch attendance data for all courses using direct Firebase operations
      const attendancePromises = Array.from(allCourseIds).map(async (courseId) => {
        try {
          const attendanceDocRef = doc(db, "attendance", courseId, "dates", dateString)
          const attendanceDoc = await getDoc(attendanceDocRef)
          const presentStudents = attendanceDoc.exists() ? (attendanceDoc.data().presentStudents || []) : []
          return {
            courseId,
            data: presentStudents,
            exists: attendanceDoc.exists()
          }
        } catch (error) {
          console.error(`Error fetching attendance for course ${courseId}:`, error)
          return {
            courseId,
            data: [],
            exists: false
          }
        }
      })

      const attendanceResults = await Promise.all(attendancePromises)
      
      attendanceResults.forEach(({ courseId, data }) => {
        attendanceDataByCourse.set(courseId, data)
      })
      
      // Create the students list with attendance status
      const studentsList = studentSnapshot.docs.map(studentDoc => {
        const studentData = studentDoc.data();
        const customId = studentData.studentId || "unknown";
        
        // Handle multiple courses
        const courseIDs = Array.isArray(studentData.courseID) ? studentData.courseID : [studentData.courseID];
        const primaryCourseIndex = studentData.primaryCourseIndex || 0;
        
        // Map all courses with their names - use current courses state
        const studentCourses = courseIDs.map((id: string) => {
          const courseId = id ? id.toString() : "0";
          const courseName = courses[courseId]?.title || "Uncategorized";
          return {
            courseID: courseId,
            courseName: courseName
          };
        });

        // Check if student is present in their primary course
        const primaryCourseId = studentCourses[primaryCourseIndex]?.courseID || "0"
        const presentStudentsInCourse = attendanceDataByCourse.get(primaryCourseId) || []
        const isPresent = presentStudentsInCourse.includes(studentDoc.id)

        return {
          id: studentDoc.id,
          customId: customId,
          name: studentData.name || "Unknown Student",
          courses: studentCourses,
          primaryCourseIndex: primaryCourseIndex,
          present: isPresent,
          attendanceSummary: studentData.attendanceSummary || { present: 0, absent: 0 }
        }
      })

      // Calculate statistics for primary courses only
      const totalStudents = studentsList.length
      const presentCount = studentsList.filter(s => s.present).length
      const absentCount = totalStudents - presentCount
      const attendancePercentage = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0
      const courseStats = calculateCourseStats(studentsList)

      // Update state
      setStudents(studentsList)
      setStats({
        totalStudents,
        presentStudents: presentCount,
        absentStudents: absentCount,
        attendancePercentage,
        courseStats
      })

    } catch (error) {
      console.error("Error fetching students:", error)
      setError("Failed to load student data. Please try again.")
      toast.error("Failed to load student data", {
        description: "Please try again"
      })
    } finally {
      setLoading(false)
    }
  }, [date, courses]) // Include courses to ensure proper course names

  // Store the function in ref to avoid dependency cycles
  useEffect(() => {
    fetchStudentsRef.current = fetchStudentsForDate
  }, [fetchStudentsForDate])

  // Load students when date changes AND courses are loaded
  useEffect(() => {
    if (date && fetchStudentsRef.current && !coursesLoading && Object.keys(courses).length > 0) {
      setCourseNamesUpdated(false); // Reset flag when date changes
      fetchStudentsRef.current(true) // Show toast on initial date load
    }
  }, [date, coursesLoading, courses]) // Include courses in dependency array

  // Update student course names when courses are loaded (simplified since fetchStudentsForDate now depends on courses)
  useEffect(() => {
    if (!coursesLoading && Object.keys(courses).length > 0 && students.length > 0 && !courseNamesUpdated) {
      setStudents(prevStudents => 
        prevStudents.map(student => ({
          ...student,
          courses: student.courses.map(course => ({
            ...course,
            courseName: courses[course.courseID]?.title || "Uncategorized"
          }))
        }))
      );
      setCourseNamesUpdated(true);
    }
  }, [courses, coursesLoading, courseNamesUpdated, students.length]) // Add students.length to dependency
  
  // Callback for when attendance is marked via scanner
  const handleAttendanceMarked = useCallback(() => {
    if (fetchStudentsRef.current) {
      fetchStudentsRef.current(false) // Refresh the student list without showing toast
    }
    setScannerRefreshKey(prev => prev + 1) // Reset scanner
  }, []) // No dependencies needed
  const downloadAttendance = (format: 'csv' | 'xlsx', groupBy?: 'course' | 'none') => {
    if (!date || !students.length) return;

    const dateStr = date.toISOString().split('T')[0];
    let data: any[] = [];

    if (groupBy === 'course') {
      // Group by primary course
      const courseGroups = new Map<string, Student[]>();
      students.forEach(student => {
        const primaryCourse = student.courses[student.primaryCourseIndex];
        if (!courseGroups.has(primaryCourse.courseName)) {
          courseGroups.set(primaryCourse.courseName, []);
        }
        courseGroups.get(primaryCourse.courseName)!.push(student);
      });

      courseGroups.forEach((students, courseName) => {
        data.push({ 'Course': courseName }); // Add course header
        students.forEach(student => {
          data.push({
            'Student ID': student.customId,
            'Name': student.name,
            'Status': student.present ? 'Present' : 'Absent'
          });
        });
        data.push({}); // Add empty row between courses
      });
    } else {
      // No grouping, but include primary course info
      data = students.map(student => ({
        'Student ID': student.customId,
        'Name': student.name,
        'Course': student.courses[student.primaryCourseIndex].courseName,
        'Status': student.present ? 'Present' : 'Absent'
      }));
    }    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');      if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_${dateStr}.csv`;
      link.click();
      
      // Show success toast for CSV download
      toast.success("Download started", {
        id: "csv-download",
        description: `Attendance data for ${dateStr} has been downloaded as CSV`
      });
    } else {
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_${dateStr}.xlsx`;
      link.click();
      
      // Show success toast for XLSX download
      toast.success("Download started", {
        id: "xlsx-download",
        description: `Attendance data for ${dateStr} has been downloaded as Excel file`
      });
    }
  };

  // Update the attendance change in local state
  const handleAttendanceChange = useCallback((studentId: string, customId: string, name: string, present: boolean) => {
    setBatchAttendance((prev: BatchAttendanceState) => ({
      ...prev,
      changes: new Map(prev.changes).set(studentId, present),
      modified: true
    }));
    
    // Update UI immediately
    setStudents((prevStudents: Student[]) => {
      const updatedStudents = prevStudents.map(student =>
        student.id === studentId ? { ...student, present } : student
      );
      
      return updatedStudents;
    });
  }, []);

  // Separate effect to recalculate stats when students change
  useEffect(() => {
    const totalStudents = students.length;
    const presentCount = students.filter(s => s.present).length;
    const absentCount = totalStudents - presentCount;
    const attendancePercentage = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
    const courseStats = calculateCourseStats(students);

    setStats({
      totalStudents,
      presentStudents: presentCount,
      absentStudents: absentCount,
      attendancePercentage,
      courseStats
    });
  }, [students]);

  // Mark all students present/absent
  const markAllStudents = useCallback((present: boolean) => {
    const newChanges = new Map();
    filteredStudents.forEach(student => {
      newChanges.set(student.id, present);
    });

    setBatchAttendance((prev: BatchAttendanceState) => ({
      ...prev,
      changes: new Map([...prev.changes, ...newChanges]),
      modified: true
    }));

    // Update UI immediately
    setStudents((prevStudents: Student[]) => {
      const updatedStudents = prevStudents.map(student => {
        // Only update students that are in the filtered list
        const shouldUpdate = filteredStudents.some(fs => fs.id === student.id);
        return shouldUpdate ? { ...student, present } : student;
      });
      
      return updatedStudents;
    });
  }, [filteredStudents]);
  // Submit all attendance changes using direct Firebase operations
  const submitAttendanceChanges = useCallback(async (): Promise<void> => {
    if (!date) return;

    setBatchAttendance((prev: BatchAttendanceState) => ({ ...prev, submitting: true }));
    const dateString = formatDate(date);

    try {
      // Group students by their primary course with both present and absent lists
      const courseGroups = new Map<string, { presentStudents: string[], absentStudents: string[], allStudentsInCourse: string[] }>();
      
      // Process each student's attendance change
      students.forEach(student => {
        const primaryCourse = student.courses[student.primaryCourseIndex];
        const courseId = primaryCourse.courseID;
        
        if (!courseGroups.has(courseId)) {
          courseGroups.set(courseId, { 
            presentStudents: [], 
            absentStudents: [], 
            allStudentsInCourse: [] 
          });
        }
        
        const courseGroup = courseGroups.get(courseId)!;
        courseGroup.allStudentsInCourse.push(student.id);
        
        // Check if student should be marked present (use batch changes if available, otherwise current state)
        const isPresent = batchAttendance.changes.has(student.id) 
          ? batchAttendance.changes.get(student.id) 
          : student.present;
          
        if (isPresent) {
          courseGroup.presentStudents.push(student.id);
        } else {
          courseGroup.absentStudents.push(student.id);
        }
      });

      // Filter out courses that have no students at all
      const coursesWithStudents = Array.from(courseGroups.entries()).filter(([courseId, { allStudentsInCourse }]) => 
        allStudentsInCourse.length > 0
      );

      // Mark attendance for each course using direct Firebase operations
      const promises = coursesWithStudents.map(async ([courseId, { presentStudents, absentStudents, allStudentsInCourse }]) => {
        try {
          // Use admin session data for proper Firestore document ID
          const teacherId = adminSession?.id || userProfile?.firestoreId || user?.uid || 'admin';
          const teacherName = adminSession?.role || userProfile?.role || 'admin';
          
          const attendanceDocRef = doc(db, "attendance", courseId, "dates", dateString);
          
          // Only create/update attendance document if there are present students
          if (presentStudents.length > 0) {
            await setDoc(attendanceDocRef, {
              presentStudents,
              createdBy: teacherId,
              createdByName: teacherName,
              timestamp: Timestamp.now(),
              courseId,
              date: dateString
            });
          } else {
            // If no students are present, delete the attendance document if it exists
            try {
              const existingDoc = await getDoc(attendanceDocRef);
              if (existingDoc.exists()) {
                await deleteDoc(attendanceDocRef);
              }
            } catch (error) {
              // Document doesn't exist, which is fine
            }
          }

          // Update student attendance summaries for present students
          const presentStudentPromises = presentStudents.map(async (studentId) => {
            const studentDocRef = doc(db, "students", studentId);
            const studentDoc = await getDoc(studentDocRef);
            
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              const updatedAttendanceByCourse = await updateStudentAttendanceSummary(
                studentData,
                courseId,
                dateString,
                true // student is present
              );

              await setDoc(studentDocRef, {
                ...studentData,
                attendanceByCourse: updatedAttendanceByCourse
              }, { merge: true });
            }
          });

          // Update student attendance summaries for absent students - remove this date from their present dates
          const absentStudentPromises = absentStudents.map(async (studentId) => {
            const studentDocRef = doc(db, "students", studentId);
            const studentDoc = await getDoc(studentDocRef);
            
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              const updatedAttendanceByCourse = await updateStudentAttendanceSummary(
                studentData,
                courseId,
                dateString,
                false // student is absent
              );

              await setDoc(studentDocRef, {
                ...studentData,
                attendanceByCourse: updatedAttendanceByCourse
              }, { merge: true });
            }
          });

          await Promise.all([...presentStudentPromises, ...absentStudentPromises]);
          return { success: true };
        } catch (error) {
          console.error(`Error marking attendance for course ${courseId}:`, error);
          throw error;
        }
      });

      // Wait for all attendance marking to complete
      await Promise.all(promises);

      // Clear batch state
      setBatchAttendance({
        changes: new Map(),
        modified: false,
        submitting: false
      });

      // Show success message
      toast.success("Attendance submitted successfully", {
        description: "Updated attendance for all students",
        duration: 5000
      });

      // Refresh the student list
      if (fetchStudentsRef.current) {
        await fetchStudentsRef.current(false);
      }

    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast.error("Failed to submit attendance", {
        description: "There was a problem updating attendance. Please try again.",
        duration: 5000
      });
    } finally {
      setBatchAttendance(prev => ({ ...prev, submitting: false }));
    }
  }, [date, students, batchAttendance.changes, adminSession, userProfile, user, fetchStudentsRef]);

  // Reset batch state when date changes
  useEffect(() => {
    setBatchAttendance({
      changes: new Map(),
      modified: false,
      submitting: false
    });
    
    // Clean up function
    return () => {
      setBatchAttendance({
        changes: new Map(),
        modified: false,
        submitting: false
      });
    };
  }, [date]);

  // Manual refresh function for courses
  const refreshCourses = useCallback(() => {
    coursesFetchedRef.current = false;
    setCoursesLoading(true);
    setCourses({});
    setCourseNamesUpdated(false);
    
    // Trigger re-fetch by updating a dummy state
    const timer = setTimeout(() => {
      // The useEffect will run again because coursesFetchedRef.current is now false
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Attendance Management</h1>
      
      <Tabs defaultValue="manual">
        <TabsList className="mb-6 bg-muted/50">
          <TabsTrigger value="manual" className="data-[state=active]:bg-background data-[state=active]:text-primary">
            Manual Attendance
          </TabsTrigger>
          <TabsTrigger value="scanner" className="data-[state=active]:bg-background data-[state=active]:text-primary">
            Attendance Scanner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <div className="space-y-6">
            {/* Daily Summary Stats */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Enrolled students</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Present Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{stats.presentStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Students marked present</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Absent Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.absentStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Students marked absent</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.attendancePercentage >= 75 ? 'text-emerald-600' : stats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.attendancePercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overall attendance rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Course-wise Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Course-wise Attendance</CardTitle>
                <CardDescription>Breakdown of attendance by course</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.courseStats.map((course, index) => (
                    <div
                      key={`course-stat-${course.courseID}-${index}`}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {course.courseName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {course.presentStudents} / {course.totalStudents} students present
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${course.percentage >= 75 ? 'text-emerald-600' :
                        course.percentage >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                        {course.percentage.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                  {stats.courseStats.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No course data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-[250px_1fr]">
              <Card className="h-fit">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm text-foreground">Select Date</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">Choose a date to view or mark attendance</CardDescription>
                    </div>                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2 bg-primary text-primary-foreground shadow-sm !transition-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                          disabled={!date || !students.length}
                        >
                          <DownloadCloud className="h-4 w-4 mr-1.5" />
                          <span className="font-medium">Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-2 backdrop-blur-sm border border-border/50 shadow-lg animate-in fade-in-0 zoom-in-95"
                      >
                        <DropdownMenuLabel className="font-semibold px-2 py-1.5 text-sm">Simple Format</DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-1.5" />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => downloadAttendance('xlsx', 'none')}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-primary/10 rounded-sm"
                          >
                            <div className="rounded-sm bg-emerald-100 dark:bg-emerald-900/30 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </div>
                            <span>Excel Spreadsheet (.xlsx)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => downloadAttendance('csv', 'none')}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-primary/10 rounded-sm"
                          >
                            <div className="rounded-sm bg-blue-100 dark:bg-blue-900/30 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                                <path d="M8 13h2" />
                                <path d="M8 17h2" />
                                <path d="M14 13h2" />
                                <path d="M14 17h2" />
                              </svg>
                            </div>
                            <span>CSV File (.csv)</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="my-1.5" />
                        <DropdownMenuLabel className="font-semibold px-2 py-1.5 text-sm">Grouped by Course</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => downloadAttendance('xlsx', 'course')}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-primary/10 rounded-sm"
                          >
                            <div className="rounded-sm bg-purple-100 dark:bg-purple-900/30 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                                <path d="M3 15h18" />
                                <path d="M3 19h18" />
                              </svg>
                            </div>
                            <span>Grouped Excel (.xlsx)</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => downloadAttendance('csv', 'course')}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-primary/10 rounded-sm"
                          >
                            <div className="rounded-sm bg-orange-100 dark:bg-orange-900/30 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-400">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                <polyline points="14 2 14 8 20 8" />
                                <path d="M3 11h18" />
                                <path d="M3 15h18" />
                                <path d="M3 19h18" />
                              </svg>
                            </div>
                            <span>Grouped CSV (.csv)</span>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="relative p-1">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (!newDate) return;

                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      
                      if (newDate > today) {                        
                        // Show a more prominent warning for future dates
                        toast.error("⚠️ Future Date Selected", {
                          id: "calendar-future-date",
                          description: "Attendance cannot be marked for future dates. Please select today or a past date.",
                          duration: 4000
                        });
                        return;
                      }

                      setDate(newDate)
                    }}
                    fromDate={new Date("2024-01-01")}
                    toDate={new Date()}
                    modifiers={{
                      disabled: (date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date > today
                      }
                    }}
                    modifiersStyles={{
                      disabled: {
                        cursor: 'not-allowed',
                        opacity: 0.5
                      }
                    }}
                    className="rounded-md border bg-background p-2"
                    showOutsideDays={true}
                    defaultMonth={date}
                    weekStartsOn={0}
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return date > today || date < new Date("2024-01-01")
                    }}
                    initialFocus
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center mb-2",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: cn(
                        buttonVariants({ variant: "outline" }),
                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                      ),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse",
                      head_row: "grid grid-cols-7 mb-1",
                      head_cell: "text-xs font-medium text-muted-foreground text-center",
                      row: "grid grid-cols-7",
                      cell: "text-center text-sm relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 p-0 font-normal text-sm aria-selected:opacity-100 hover:bg-accent rounded-md mx-auto",
                      day_range_end: "day-range-end",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_hidden: "invisible",
                    }}
                  />
                  <Button onClick={() => fetchStudentsForDate(true)} className="w-full mt-4" disabled={!date || loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Refresh Attendance"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Student Attendance</CardTitle>                  <CardDescription className="text-muted-foreground">
                    {date ? `Attendance for ${date.toLocaleDateString()}` : "Select a date"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading students...</span>
                    </div>
                  ) : students.length > 0 ? (
                    <>
                      <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                          <Input
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => {
                              const query = e.target.value;
                              setSearchQuery(query)
                              
                              // Show toast only if user enters something
                              if (query.trim().length > 0) {
                                toast.info("Searching...", {
                                  id: "search-students",
                                  description: `Filtering students by "${query}"`,
                                  duration: 2000
                                })
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={selectedCourse}
                            onValueChange={(value) => {
                              setSelectedCourse(value)
                              
                              // Show toast notification for course filter change
                              const courseName = value === "all" 
                                ? "all courses" 
                                : courses[value]?.title || "selected course";
                                
                              toast.info("Course filter applied", {
                                id: "filter-course",
                                description: `Now showing students from ${courseName}`
                              })
                            }}
                            disabled={coursesLoading}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={coursesLoading ? "Loading..." : "Select course"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Courses</SelectItem>
                              {!coursesLoading && Object.entries(courses).map(([courseID, course]) => (
                                <SelectItem
                                  key={`course-select-${courseID}`}
                                  value={courseID}
                                >
                                  {course.title}
                                </SelectItem>
                              ))}
                              {coursesLoading && (
                                <SelectItem value="loading" disabled>
                                  Loading courses...
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={selectedStatus} 
                            onValueChange={(value: string) => {
                              setSelectedStatus(value as FilterStatus)
                              
                              // Show toast notification for filter change
                              const statusText = value === "all" 
                                ? "Showing all students" 
                                : value === "present" 
                                  ? "Showing present students only" 
                                  : "Showing absent students only";
                                  
                              toast.info("Filter applied", {
                                id: "filter-status",
                                description: statusText
                              })
                            }}>
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Students</SelectItem>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <BatchControls />
                      <div className="space-y-4">
                        {filteredStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
                            <div>
                              <p className="font-medium text-foreground">{student.name}</p>
                              <p className="text-sm text-muted-foreground">ID: {student.customId}</p>
                              <p className="text-sm text-muted-foreground">Course: {student.courses[student.primaryCourseIndex].courseName}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={student.present ? "default" : "outline"}
                                onClick={() => throttleAction(() => handleAttendanceChange(student.id, student.customId, student.name, true))}
                                className={cn(
                                  "text-white !transition-none",
                                  student.present 
                                    ? "bg-emerald-500 dark:bg-emerald-600" 
                                    : "bg-muted"
                                )}
                                disabled={batchAttendance.submitting || isThrottling}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={!student.present ? "destructive" : "outline"}
                                onClick={() => throttleAction(() => handleAttendanceChange(student.id, student.customId, student.name, false))}
                                className={cn(
                                  "text-white !transition-none",
                                  !student.present 
                                    ? "bg-red-500 dark:bg-red-600" 
                                    : "bg-muted"
                                )}
                                disabled={batchAttendance.submitting || isThrottling}
                              >
                                Absent
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {filteredStudents.length === 0 && (
                        <div className="text-center py-10 bg-muted/30 rounded-lg">
                          <p className="text-muted-foreground">No students found matching the filters</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-10 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">No students found for this date</p>
                      <p className="text-sm text-muted-foreground mt-1">Try selecting a different date</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scanner">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">QR Code Scanner</CardTitle>
              <CardDescription className="text-muted-foreground">
                Scan student QR codes to mark attendance for {date?.toLocaleDateString() || "today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceScanner key={scannerRefreshKey} onAttendanceMarked={handleAttendanceMarked} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}