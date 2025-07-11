"use client"

import StudentLayout from "@/components/student-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore"
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

interface AttendanceRecord {
  date: string
  status: "present" | "absent"
  time?: string
  hoursSpent: number
}

interface AttendanceSummary {
  startDate: string
  currentDate: string
  totalDays: number
  presentDays: number
  absentDays: number
  percentage: number
  totalHours: number
  averageHoursPerDay: number
  dailyRecords: AttendanceRecord[]
  primaryCourse: {
    courseID: string
    courseName: string
  }
}

interface BatchInfo {
  batchId: string
  startDate: string
  endDate: string
  duration: string
  instructors: string[]
  schedule: {
    weekdays: string
    labSessions: string
    weekend: string
  }
}

export default function StudentAttendance() {
  const router = useRouter()
  // Temporarily using session-based approach like other student pages
  // const { user, userProfile, loading: authLoading } = useAuth()
  
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary>({
    startDate: "",
    currentDate: "",
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    percentage: 0,
    totalHours: 0,
    averageHoursPerDay: 0,
    dailyRecords: [],
    primaryCourse: {
      courseID: "",
      courseName: ""
    }
  })
  const [batchInfo, setBatchInfo] = useState<BatchInfo>({
    batchId: "",
    startDate: "",
    endDate: "",
    duration: "",
    instructors: [],
    schedule: {
      weekdays: "",
      labSessions: "",
      weekend: "",
    },
  })
  const [loading, setLoading] = useState(true)

  // Use refs to track mounted state and prevent state updates after unmount
  const isMounted = useRef(true)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const batchUnsubscribeRef = useRef<(() => void) | null>(null)

  // Get primary course from student profile with proper course ID handling
  const getPrimaryCourse = useCallback(() => {
    console.log("🔍 Debug - Getting primary course")
    
    // Use session storage like other student pages
    const studentData = getStudentSession()
    console.log("🔍 Debug - Student data from session:", studentData)
    
    if (!studentData) {
      console.warn("🔍 Debug - No student data available")
      return null
    }

    if (studentData.courseName) {
      // Use the actual structure from Firebase: courseName array and primaryCourseIndex
      const primaryIndex = studentData.primaryCourseIndex || 0
      
      const courseIDs = Array.isArray(studentData.courseID) 
        ? studentData.courseID 
        : [studentData.courseID]
        
      const courseNames = Array.isArray(studentData.courseName) 
        ? studentData.courseName 
        : [studentData.courseName]
      
      const courseID = courseIDs[primaryIndex]?.toString() || courseIDs[0]?.toString() || ""
      const courseName = courseNames[primaryIndex] || courseNames[0] || ""
      
      console.log("🔍 Debug - Course IDs from studentData:", courseIDs)
      console.log("🔍 Debug - Course Names from studentData:", courseNames)
      console.log("🔍 Debug - Primary index:", primaryIndex)
      
      const primaryCourse = { courseID, courseName }
      console.log("🔍 Debug - Primary course from studentData:", primaryCourse)
      return primaryCourse
    }
    
    console.warn("🔍 Debug - No course data available in studentData")
    return null
  }, []) // Removed userProfile dependency since we're using session storage

  // Fetch attendance data for primary course from start date to current date
  const fetchAttendanceData = useCallback(async () => {
    console.log("🔍 Debug - Starting fetchAttendanceData")
    
    // Use session storage like other student pages
    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("No student data in session")
      if (isMounted.current) {
        setLoading(false)
      }
      return
    }

    const primaryCourse = getPrimaryCourse()
    console.log("🔍 Debug - Primary Course:", primaryCourse)
    
    if (!primaryCourse) {
      console.warn("No primary course available")
      if (isMounted.current) {
        setLoading(false)
      }
      return
    }

    try {
      // Fetch student document from Firestore to get attendance data
      // Use the student ID from session data to get the document
      console.log("🔍 Debug - Fetching student document for ID:", studentData.id)
      
      let studentDoc = null
      let studentDocData = null
      
      // First try using the session ID as document ID
      try {
        studentDoc = await getDoc(doc(db, "students", studentData.id))
        if (studentDoc.exists()) {
          studentDocData = studentDoc.data()
          console.log("🔍 Debug - Found student document by session ID")
        }
      } catch (error) {
        console.log("🔍 Debug - Error fetching by session ID:", error)
      }
      
      // If not found by ID, try to find by custom student ID or email
      if (!studentDocData) {
        console.log("🔍 Debug - Trying to find student by custom ID or email")
        const studentQuery = query(
          collection(db, "students"), 
          where("studentId", "==", studentData.studentId || studentData.customStudentId)
        )
        const studentSnapshot = await getDocs(studentQuery)
        
        if (!studentSnapshot.empty) {
          studentDocData = studentSnapshot.docs[0].data()
          console.log("🔍 Debug - Found student document by custom student ID")
        } else {
          // Try by email as last resort
          if (studentData.email) {
            const emailQuery = query(collection(db, "students"), where("email", "==", studentData.email))
            const emailSnapshot = await getDocs(emailQuery)
            if (!emailSnapshot.empty) {
              studentDocData = emailSnapshot.docs[0].data()
              console.log("🔍 Debug - Found student document by email")
            }
          }
        }
      }
      
      if (!studentDocData) {
        console.warn("🔍 Debug - Student document not found in Firestore")
        // Use fallback data structure
        const currentDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        
        const fallbackData: AttendanceSummary = {
          startDate: startDate.toISOString().split('T')[0],
          currentDate: currentDate.toISOString().split('T')[0],
          totalDays: 30,
          presentDays: 0,
          absentDays: 30,
          percentage: 0,
          totalHours: 0,
          averageHoursPerDay: 0,
          dailyRecords: [],
          primaryCourse
        }
        
        if (isMounted.current) {
          setAttendanceData(fallbackData)
          setLoading(false)
        }
        return
      }

      console.log("🔍 Debug - Student Document Data:", studentDocData)
      
      // Get attendance data from student's attendanceByCourse field (same as admin page)
      const attendanceByCourse = studentDocData.attendanceByCourse || {}
      console.log("🔍 Debug - Attendance By Course:", attendanceByCourse)
      
      // Get attendance for the primary course
      const courseIdToCheck = primaryCourse.courseID.toString()
      let courseAttendance = attendanceByCourse[courseIdToCheck]
      
      // Try different course ID formats if not found
      if (!courseAttendance) {
        const alternativeIds = [
          primaryCourse.courseID,
          parseInt(primaryCourse.courseID),
          primaryCourse.courseID.toString()
        ].filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
        
        console.log("🔍 Debug - Trying course ID variants:", alternativeIds)
        console.log("🔍 Debug - Available attendance keys:", Object.keys(attendanceByCourse))
        
        for (const courseId of alternativeIds) {
          if (attendanceByCourse[courseId]) {
            courseAttendance = attendanceByCourse[courseId]
            console.log("🔍 Debug - Found attendance data with courseId:", courseId, typeof courseId)
            break
          }
        }
      }
      
      if (!courseAttendance) {
        console.log("🔍 Debug - No attendance data found for course:", primaryCourse.courseID)
        courseAttendance = {
          datesPresent: [],
          summary: { totalClasses: 0, attended: 0, percentage: 0 }
        }
      }
      
      console.log("🔍 Debug - Course Attendance Data:", courseAttendance)

      // Get course start date (try multiple sources)
      let startDate = new Date()
      let courseDataSource = "default"
      
      // Try to get course document to find start date
      try {
        console.log("🔍 Debug - Fetching course document for courseID:", primaryCourse.courseID)
        
        // Try direct document lookup first
        let courseDoc = await getDoc(doc(db, "courses", primaryCourse.courseID))
        let courseData = null
        
        if (courseDoc.exists()) {
          courseData = courseDoc.data()
          console.log("🔍 Debug - Found course document by direct ID lookup")
        } else {
          // Try query by courseID field
          const courseQuery = query(collection(db, "courses"), where("courseID", "==", parseInt(primaryCourse.courseID)))
          const courseSnapshot = await getDocs(courseQuery)
          
          if (!courseSnapshot.empty) {
            courseData = courseSnapshot.docs[0].data()
            console.log("🔍 Debug - Found course document by courseID field query")
          }
        }
        
        if (courseData && courseData.startDate) {
          // Handle Firestore Timestamp or string dates
          if (courseData.startDate.toDate) {
            startDate = courseData.startDate.toDate()
          } else {
            startDate = new Date(courseData.startDate)
          }
          courseDataSource = "course"
          console.log("🔍 Debug - Using course start date:", startDate)
        }
      } catch (courseError) {
        console.warn("🔍 Debug - Error fetching course document:", courseError)
      }
      
      // Fallback to batch start date if no course start date
      if (courseDataSource === "default" && studentData.batch) {
        try {
          const batchQuery = query(collection(db, "batches"), where("batchId", "==", studentData.batch))
          const batchSnapshot = await getDocs(batchQuery)
          if (!batchSnapshot.empty) {
            const batchData = batchSnapshot.docs[0].data()
            if (batchData.startDate) {
              startDate = batchData.startDate.toDate ? batchData.startDate.toDate() : new Date(batchData.startDate)
              courseDataSource = "batch"
              console.log("🔍 Debug - Using batch start date:", startDate)
            }
          }
        } catch (batchError) {
          console.warn("🔍 Debug - Error fetching batch:", batchError)
        }
      }
      
      // Final fallback
      if (courseDataSource === "default") {
        if (studentDocData.joinedDate) {
          startDate = new Date(studentDocData.joinedDate)
          courseDataSource = "joinedDate"
        } else {
          startDate.setDate(startDate.getDate() - 30)
          courseDataSource = "default30days"
        }
        console.log("🔍 Debug - Using fallback start date:", startDate, "source:", courseDataSource)
      }

      // Generate daily records from start date to current date
      const currentDate = new Date()
      currentDate.setHours(23, 59, 59, 999)
      
      // Calculate total days from start to current date
      const timeDiff = currentDate.getTime() - startDate.getTime()
      const totalDaysCalculated = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1)
      
      console.log("🔍 Debug - Date range:", {
        startDate: startDate.toISOString().split('T')[0],
        currentDate: currentDate.toISOString().split('T')[0],
        totalDaysCalculated,
        courseDataSource
      })

      // Generate daily records
      const dailyRecords: AttendanceRecord[] = []
      const dateIterator = new Date(startDate)
      dateIterator.setHours(0, 0, 0, 0)

      while (dateIterator <= currentDate) {
        const dateString = dateIterator.toISOString().split('T')[0]
        const isPresent = courseAttendance.datesPresent?.includes(dateString) || false
        
        dailyRecords.push({
          date: dateString,
          status: isPresent ? "present" : "absent",
          time: isPresent ? "10:00 AM" : undefined,
          hoursSpent: isPresent ? 8 : 0
        })
        
        dateIterator.setDate(dateIterator.getDate() + 1)
      }

      // Sort records by date (newest first for display)
      dailyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Use the summary data from student document (same as admin page)
      const presentDays = courseAttendance.summary?.attended || courseAttendance.datesPresent?.length || 0
      const totalClasses = courseAttendance.summary?.totalClasses || totalDaysCalculated
      const absentDays = Math.max(0, totalClasses - presentDays)
      
      // Use summary percentage if available, otherwise calculate
      let percentage = 0
      if (courseAttendance.summary?.percentage !== undefined) {
        percentage = Math.round(courseAttendance.summary.percentage)
      } else if (totalClasses > 0) {
        percentage = Math.round((presentDays / totalClasses) * 100)
      }
      
      const totalHours = presentDays * 8
      const averageHoursPerDay = totalClasses > 0 ? totalHours / totalClasses : 0

      console.log("🔍 Debug - Final Statistics:", {
        presentDays,
        totalClasses,
        absentDays,
        percentage,
        totalHours,
        averageHoursPerDay,
        dailyRecordsCount: dailyRecords.length,
        summaryData: courseAttendance.summary
      })

      const summaryData: AttendanceSummary = {
        startDate: startDate.toISOString().split('T')[0],
        currentDate: currentDate.toISOString().split('T')[0],
        totalDays: totalClasses,
        presentDays,
        absentDays,
        percentage,
        totalHours,
        averageHoursPerDay,
        dailyRecords,
        primaryCourse
      }

      if (isMounted.current) {
        setAttendanceData(summaryData)
        setLoading(false)
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error)
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [getPrimaryCourse]) // Keep dependencies minimal

  // Initialize attendance data and set up real-time listener
  useEffect(() => {
    console.log("Attendance page mounting")
    isMounted.current = true

    // Use session storage approach like other student pages
    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("No student data in session, redirecting to login")
      router.push("/login")
      return
    }

    console.log("Student data found in session, loading attendance data")
    // Fetch immediately when student data is available
    fetchAttendanceData()

    // TEMPORARILY COMMENTED OUT REAL-TIME LISTENERS TO PREVENT AUTH ISSUES
    /* 
    // Set up real-time listener for student document changes (for profile updates)
    // Note: We're only setting up a listener for the UID-based document
    // If the document is found by email/username, real-time updates won't work
    // but the data will still be fetched on page load and when userProfile changes
    const studentDocRef = doc(db, "students", user.uid)
    const unsubscribe = onSnapshot(studentDocRef, (doc) => {
      if (doc.exists() && isMounted.current) {
        console.log("Student document updated, refreshing attendance data")
        fetchAttendanceData()
      } else {
        console.log("Student document listener: document does not exist or was deleted")
      }
    }, (error) => {
      console.warn("Student document listener error:", error)
    })

    unsubscribeRef.current = unsubscribe
    */

    // Cleanup function
    return () => {
      console.log("Attendance page unmounting")
      isMounted.current = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (batchUnsubscribeRef.current) {
        batchUnsubscribeRef.current()
      }
    }
  }, [router, fetchAttendanceData]) // Removed user, authLoading dependencies

  // TEMPORARILY COMMENTED OUT USER PROFILE EFFECT
  /*
  // Separate effect to re-fetch when userProfile loads
  useEffect(() => {
    if (userProfile) {
      console.log("User profile loaded, re-fetching attendance data with updated profile")
      fetchAttendanceData()
    }
  }, [userProfile, fetchAttendanceData])
  */

  // Fetch batch info
  useEffect(() => {
    // Use session storage approach like other student pages
    const studentData = getStudentSession()
    if (!studentData) {
      setBatchInfo({
        batchId: "Not assigned",
        startDate: "N/A",
        endDate: "N/A",
        duration: "N/A",
        instructors: [],
        schedule: {
          weekdays: "N/A",
          labSessions: "N/A",
          weekend: "N/A",
        },
      })
      return
    }

    // Get batch from student data
    const batchId = studentData.batch
    
    if (!batchId) {
      setBatchInfo({
        batchId: "Not assigned",
        startDate: "N/A",
        endDate: "N/A",
        duration: "N/A",
        instructors: [],
        schedule: {
          weekdays: "N/A",
          labSessions: "N/A",
          weekend: "N/A",
        },
      })
      return
    }

    setupBatchListener(batchId)

    function setupBatchListener(batchId: string) {
      if (!batchId) return
      
      try {
        // Query the batches collection
        const batchQuery = query(collection(db, "batches"), where("batchId", "==", batchId))

        // Set up real-time listener for batch info
        const unsubscribe = onSnapshot(batchQuery, (snapshot) => {
          if (!isMounted.current) return

          if (!snapshot.empty) {
            const batchDoc = snapshot.docs[0].data()

            // Format dates
            const startDate = batchDoc.startDate?.toDate?.()
              ? batchDoc.startDate.toDate().toLocaleDateString()
              : batchDoc.startDate || "N/A"

            const endDate = batchDoc.endDate?.toDate?.()
              ? batchDoc.endDate.toDate().toLocaleDateString()
              : batchDoc.endDate || "N/A"

            setBatchInfo({
              batchId: batchDoc.batchId || "Not assigned",
              startDate,
              endDate,
              duration: batchDoc.duration || "N/A",
              instructors: batchDoc.instructors || [],
              schedule: batchDoc.schedule || {
                weekdays: "N/A",
                labSessions: "N/A",
                weekend: "N/A",
              },
            })
          }
        })

        batchUnsubscribeRef.current = unsubscribe
      } catch (error) {
        console.error("Error setting up batch info listener:", error)
      }
    }
  }, []) // Removed user and userProfile dependencies

  // Helper function to format date to YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance</h1>
            <p className="text-muted-foreground">Track your attendance status and history for your primary course</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-md overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-primary"></div>
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Attendance Summary</CardTitle>
              <CardDescription className="text-muted-foreground">Your attendance from {attendanceData.startDate} to {attendanceData.currentDate}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-2 text-muted-foreground">Loading attendance data...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-muted stroke-current dark:text-muted/30"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-emerald-500 dark:text-emerald-400 stroke-current"
                          strokeWidth="10"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={`${(attendanceData.percentage * 2.51327).toFixed(2)} 251.327`}
                          strokeDashoffset="0"
                          transform="rotate(-90 50 50)"
                        />
                        <text
                          x="50"
                          y="50"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          className="text-2xl font-bold fill-foreground"
                        >
                          {attendanceData.percentage}%
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Days</p>
                      <p className="text-lg font-bold text-foreground">{attendanceData.totalDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Present</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{attendanceData.presentDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Absent</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{attendanceData.absentDays}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Primary Course</p>
                      <p className="font-medium text-foreground">{attendanceData.primaryCourse.courseName}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Course ID</p>
                      <p className="font-medium text-foreground">{attendanceData.primaryCourse.courseID}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="font-medium text-foreground">{attendanceData.totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Average Hours/Day</p>
                      <p className="font-medium text-foreground">{attendanceData.averageHoursPerDay.toFixed(1)}h</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-none shadow-md overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-primary"></div>
            <CardHeader>
              <CardTitle className="text-foreground font-semibold">Attendance Records</CardTitle>
              <CardDescription className="text-muted-foreground">Daily attendance history from start date to present</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="list">
                <TabsList className="mb-4 bg-muted/50">
                  <TabsTrigger
                    value="list"
                    className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    List View
                  </TabsTrigger>
                  <TabsTrigger
                    value="calendar"
                    className="data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    Calendar View
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="space-y-4">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                      <p className="mt-2 text-muted-foreground">Loading attendance records...</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                      {attendanceData.dailyRecords.length > 0 ? (
                        attendanceData.dailyRecords.map((record, index) => (
                          <div
                            key={`record-${record.date}-${index}`}
                            className="flex items-center justify-between py-3 border-b last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  record.status === "present"
                                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                                    : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                                }`}
                              >
                                {record.status === "present" ? (
                                  <CheckCircle className="h-5 w-5" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {new Date(record.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })}
                                </p>
                                {record.status === "present" && (
                                  <p className="text-xs text-muted-foreground">
                                    {record.time && `Marked at ${record.time}`}
                                    {record.hoursSpent > 0 && ` • ${record.hoursSpent}h spent`}
                                  </p>
                                )}
                                {record.status === "absent" && (
                                  <p className="text-xs text-red-500">
                                    Absent from class
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${
                                record.status === "present" 
                                  ? "text-emerald-600 dark:text-emerald-400" 
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {record.status === "present" ? "Present" : "Absent"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-muted/30 rounded-lg">
                          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">No attendance records found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Records will appear here once attendance starts being tracked
                          </p>
                          {/* Debug information */}
                          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-left">
                            <p><strong>Debug Info:</strong></p>
                            <p>Session data available: {getStudentSession() ? 'Yes' : 'No'}</p>
                            <p>Student ID: {getStudentSession()?.id || 'N/A'}</p>
                            <p>Student Name: {getStudentSession()?.name || 'N/A'}</p>
                            <p>Session Course: {getStudentSession()?.courseName || 'N/A'}</p>
                            <p>Primary Course: {attendanceData.primaryCourse.courseName} (ID: {attendanceData.primaryCourse.courseID})</p>
                            <p>Primary Course Index: {getStudentSession()?.primaryCourseIndex ?? 'N/A'}</p>
                            <p>Total Days: {attendanceData.totalDays}</p>
                            <p>Present Days: {attendanceData.presentDays}</p>
                            <p>Attendance %: {attendanceData.percentage}%</p>
                            <p>Start Date: {attendanceData.startDate}</p>
                            <p>Current Date: {attendanceData.currentDate}</p>
                            <p>Records Generated: {attendanceData.dailyRecords.length}</p>
                            <p className="text-xs mt-2 text-muted-foreground">
                              ✅ Now fetching real attendance data from student's attendanceByCourse field
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Check browser console for detailed logs and data fetching info
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="calendar">
                  <div className="border rounded-md p-4">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="text-xs font-medium text-muted-foreground py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(() => {
                        const today = new Date()
                        const year = today.getFullYear()
                        const month = today.getMonth()

                        const firstDayOfMonth = new Date(year, month, 1)
                        const dayOffset = firstDayOfMonth.getDay()

                        const lastDayOfMonth = new Date(year, month + 1, 0)
                        const daysInMonth = lastDayOfMonth.getDate()

                        const totalDays = dayOffset + daysInMonth
                        const totalCells = Math.ceil(totalDays / 7) * 7

                        return Array.from({ length: totalCells }).map((_, index) => {
                          const day = index - dayOffset + 1
                          const isCurrentMonth = day > 0 && day <= daysInMonth

                          const currentDate = new Date(year, month, day)
                          const dateString = isCurrentMonth ? formatDateToString(currentDate) : ""

                          const record = attendanceData.dailyRecords.find((r) => r.date === dateString)
                          const isToday = isCurrentMonth && day === today.getDate()

                          return (
                            <div
                              key={`calendar-day-${index}`}
                              className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm ${
                                isCurrentMonth
                                  ? isToday
                                    ? "border-2 border-primary text-primary font-bold"
                                    : record
                                      ? record.status === "present"
                                        ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                        : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                                      : "bg-background hover:bg-muted/50"
                                  : "text-muted-foreground bg-muted/30"
                              }`}
                            >
                              {isCurrentMonth && day}
                              {record && (
                                <div
                                  className={`w-2 h-2 rounded-full mt-1 ${
                                    record.status === "present" ? "bg-emerald-600 dark:bg-emerald-400" : "bg-red-600 dark:bg-red-400"
                                  }`}
                                ></div>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                      <p>Showing attendance for your primary course: <span className="font-semibold text-foreground">{attendanceData.primaryCourse.courseName}</span></p>
                      <p>Course ID: {attendanceData.primaryCourse.courseID}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-md overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-primary"></div>
          <CardHeader>
            <CardTitle className="text-foreground font-semibold">Batch Information</CardTitle>
            <CardDescription className="text-muted-foreground">Your current batch details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Batch ID</p>
                    <p className="font-medium text-foreground">{batchInfo.batchId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium text-foreground">{batchInfo.startDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium text-foreground">{batchInfo.endDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{batchInfo.duration}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instructors</p>
                  <p className="font-medium text-foreground">{batchInfo.instructors.join(", ") || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Class Schedule</p>
                <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between py-2 border-b border-border">
                    <p className="font-medium text-foreground">Monday - Friday</p>
                    <p className="text-muted-foreground">{batchInfo.schedule.weekdays}</p>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <p className="font-medium text-foreground">Lab Sessions</p>
                    <p className="text-muted-foreground">{batchInfo.schedule.labSessions}</p>
                  </div>
                  <div className="flex justify-between py-2">
                    <p className="font-medium text-foreground">Weekend Sessions</p>
                    <p className="text-muted-foreground">{batchInfo.schedule.weekend}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50">
            <p className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
              Attendance is marked daily at 10:00 AM by your instructor.
            </p>
          </CardFooter>
        </Card>
      </div>
    </StudentLayout>
  )
}