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
  const { user, userProfile } = useAuth()
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
    console.log("🔍 Debug - User profile:", userProfile)
    
    // Try to get from userProfile first (most reliable source)
    if (userProfile?.courseID && userProfile?.courseName) {
      const primaryIndex = userProfile.primaryCourseIndex || 0
      
      const courseIDs = Array.isArray(userProfile.courseID) 
        ? userProfile.courseID 
        : [userProfile.courseID]
      
      const courseNames = Array.isArray(userProfile.courseName) 
        ? userProfile.courseName 
        : [userProfile.courseName]
      
      const courseID = courseIDs[primaryIndex]?.toString() || courseIDs[0]?.toString() || ""
      const courseName = courseNames[primaryIndex] || courseNames[0] || ""
      
      const primaryCourse = { 
        courseID: courseID, 
        courseName: courseName 
      }
      console.log("🔍 Debug - Primary course from userProfile:", primaryCourse)
      console.log("🔍 Debug - Raw courseIDs:", courseIDs)
      console.log("🔍 Debug - Raw courseNames:", courseNames)
      console.log("🔍 Debug - Primary index:", primaryIndex)
      return primaryCourse
    }

    // Fallback to session data if userProfile is not available
    const studentData = getStudentSession()
    console.log("🔍 Debug - Fallback to studentData:", studentData)
    
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
    
    console.warn("🔍 Debug - No course data available in userProfile or studentData")
    return null
  }, [userProfile])

  // Fetch attendance data for primary course from start date to current date
  const fetchAttendanceData = useCallback(async () => {
    console.log("🔍 Debug - Starting fetchAttendanceData")
    console.log("🔍 Debug - User:", user)
    console.log("🔍 Debug - User Profile:", userProfile)
    
    if (!user) {
      console.warn("No authenticated user")
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
      let studentDocData = null
      
      // First, try to get student document using the authenticated user's UID
      console.log("🔍 Debug - Trying to fetch student by UID:", user.uid)
      const studentDoc = await getDoc(doc(db, "students", user.uid))
      
      if (studentDoc.exists()) {
        studentDocData = studentDoc.data()
        console.log("🔍 Debug - Found student document by UID")
      } else {
        console.log("🔍 Debug - Student document not found by UID, trying email search")
        
        // Try to find student by email
        const emailQuery = query(collection(db, "students"), where("email", "==", user.email))
        const emailSnapshot = await getDocs(emailQuery)
        
        if (!emailSnapshot.empty) {
          studentDocData = emailSnapshot.docs[0].data()
          console.log("🔍 Debug - Found student document by email")
        } else {
          console.log("🔍 Debug - Trying username search")
          // Try to find student by username
          const usernameQuery = query(collection(db, "students"), where("username", "==", user.email))
          const usernameSnapshot = await getDocs(usernameQuery)
          
          if (!usernameSnapshot.empty) {
            studentDocData = usernameSnapshot.docs[0].data()
            console.log("🔍 Debug - Found student document by username")
          }
        }
      }
      
      if (!studentDocData) {
        console.warn("🔍 Debug - Student document not found in any location for user:", user.uid, user.email)
        // Create a fallback with basic info
        if (isMounted.current) {
          setAttendanceData({
            startDate: new Date().toISOString().split('T')[0],
            currentDate: new Date().toISOString().split('T')[0],
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            percentage: 0,
            totalHours: 0,
            averageHoursPerDay: 0,
            dailyRecords: [],
            primaryCourse: primaryCourse || { courseID: "unknown", courseName: "Unknown Course" }
          })
          setLoading(false)
        }
        return
      }

      console.log("🔍 Debug - Full Student Document:", studentDocData)
      
      const attendanceByCourse = studentDocData.attendanceByCourse || {}
      console.log("🔍 Debug - Attendance By Course:", attendanceByCourse)
      
      // Try multiple possible course ID formats for attendance lookup
      let courseAttendance = null
      const possibleCourseIds = [
        primaryCourse.courseID, // Primary course ID (e.g., "2000")
        primaryCourse.courseID.toString(), // Ensure string format
        parseInt(primaryCourse.courseID), // Try as number if it's a numeric string
        primaryCourse.courseName, // Course name (e.g., "AWS")
        primaryCourse.courseName.toUpperCase(), // Uppercase (e.g., "AWS")
        primaryCourse.courseName.toLowerCase(), // Lowercase (e.g., "aws")
      ].filter(id => {
        // Filter out null, undefined, empty strings, and NaN
        if (id === null || id === undefined || id === "") return false
        if (typeof id === "number" && isNaN(id)) return false
        return true
      })
      
      console.log("🔍 Debug - Trying course ID variants:", possibleCourseIds)
      console.log("🔍 Debug - Available attendance keys:", Object.keys(attendanceByCourse))
      
      for (const courseId of possibleCourseIds) {
        if (attendanceByCourse[courseId]) {
          courseAttendance = attendanceByCourse[courseId]
          console.log("🔍 Debug - Found attendance data with courseId:", courseId, typeof courseId)
          break
        }
      }
      
      if (!courseAttendance) {
        console.log("🔍 Debug - No attendance data found for any course ID variant")
        console.log("🔍 Debug - Primary course:", primaryCourse)
        console.log("🔍 Debug - Available keys in attendanceByCourse:", Object.keys(attendanceByCourse))
        courseAttendance = {
          datesPresent: [],
          summary: { totalClasses: 0, attended: 0, percentage: 0 }
        }
      }
      
      console.log("🔍 Debug - Course Attendance data:", courseAttendance)

      // Get course start date from courses collection (highest priority)
      let startDate = new Date()
      let courseStartDate = null
      let courseEndDate = null
      let courseDataSource = "default" // Track the source of start date for debugging
      
      // Try to fetch the course document to get the actual start and end dates
      console.log("🔍 Debug - Fetching course document for courseID:", primaryCourse.courseID)
      try {
        // First try to get course document by the courseID directly
        let courseDoc = await getDoc(doc(db, "courses", primaryCourse.courseID))
        let courseData = null
        
        if (courseDoc.exists()) {
          courseData = courseDoc.data()
          console.log("🔍 Debug - Found course document by direct ID lookup")
        } else {
          console.log("🔍 Debug - Course not found by direct ID, trying courseID field query")
          // Try to find course by courseID field
          const courseQuery = query(collection(db, "courses"), where("courseID", "==", parseInt(primaryCourse.courseID)))
          const courseSnapshot = await getDocs(courseQuery)
          
          if (!courseSnapshot.empty) {
            courseData = courseSnapshot.docs[0].data()
            console.log("🔍 Debug - Found course document by courseID field query")
          } else {
            console.log("🔍 Debug - Trying courseID as string in query")
            // Try again with courseID as string
            const courseQueryStr = query(collection(db, "courses"), where("courseID", "==", primaryCourse.courseID))
            const courseSnapshotStr = await getDocs(courseQueryStr)
            
            if (!courseSnapshotStr.empty) {
              courseData = courseSnapshotStr.docs[0].data()
              console.log("🔍 Debug - Found course document by courseID string query")
            }
          }
        }
        
        if (courseData) {
          console.log("🔍 Debug - Course Document Data:", courseData)
          
          if (courseData.startDate) {
            // Handle both Firestore Timestamp and string dates
            if (courseData.startDate.toDate) {
              courseStartDate = courseData.startDate.toDate()
            } else if (typeof courseData.startDate === 'string') {
              courseStartDate = new Date(courseData.startDate)
            } else {
              courseStartDate = new Date(courseData.startDate)
            }
            courseDataSource = "course"
            console.log("🔍 Debug - Found course start date:", courseStartDate)
          }
          
          if (courseData.endDate) {
            // Handle both Firestore Timestamp and string dates
            if (courseData.endDate.toDate) {
              courseEndDate = courseData.endDate.toDate()
            } else if (typeof courseData.endDate === 'string') {
              courseEndDate = new Date(courseData.endDate)
            } else {
              courseEndDate = new Date(courseData.endDate)
            }
            console.log("🔍 Debug - Found course end date:", courseEndDate)
          }
          
          // Additional course info for debugging
          console.log("🔍 Debug - Course title:", courseData.title)
          console.log("🔍 Debug - Course name from doc:", courseData.name || courseData.courseName)
          console.log("🔍 Debug - Course instructor:", courseData.instructor)
          console.log("🔍 Debug - Course ID from doc:", courseData.courseID)
        } else {
          console.warn("🔍 Debug - Course document not found anywhere for ID:", primaryCourse.courseID)
          console.warn("🔍 Debug - This might indicate a mismatch between student course ID and courses collection")
          console.warn("🔍 Debug - Student courseID:", primaryCourse.courseID, typeof primaryCourse.courseID)
        }
      } catch (courseError) {
        console.error("🔍 Debug - Error fetching course document:", courseError)
        console.error("🔍 Debug - This might be due to permission issues or network problems")
      }
      
      // Use course start date if available, otherwise fall back to other methods
      if (courseStartDate) {
        startDate = courseStartDate
        console.log("🔍 Debug - Using course start date:", startDate)
      } else {
        // Fallback to batch info
        let batchId = null
        
        // Try to get batch from userProfile first, then from studentData
        if (userProfile?.batch) {
          batchId = userProfile.batch
        } else if (studentDocData.batch) {
          batchId = studentDocData.batch
        }
        
        if (batchId) {
          console.log("🔍 Debug - Looking for batch:", batchId)
          try {
            const batchQuery = query(collection(db, "batches"), where("batchId", "==", batchId))
            const batchSnapshot = await getDocs(batchQuery)
            if (!batchSnapshot.empty) {
              const batchData = batchSnapshot.docs[0].data()
              console.log("🔍 Debug - Batch Data:", batchData)
              startDate = batchData.startDate?.toDate() || new Date()
              courseDataSource = "batch"
              console.log("🔍 Debug - Using batch start date:", startDate)
            } else {
              console.warn("🔍 Debug - No batch found with ID:", batchId)
              // Use joined date if available, otherwise default
              if (studentDocData.joinedDate) {
                startDate = new Date(studentDocData.joinedDate)
                courseDataSource = "joinedDate"
                console.log("🔍 Debug - Using joinedDate as start date:", startDate)
              } else {
                startDate = new Date()
                startDate.setDate(startDate.getDate() - 30)
                courseDataSource = "default30days"
                console.log("🔍 Debug - Using default start date (30 days ago):", startDate)
              }
            }
          } catch (batchError) {
            console.error("🔍 Debug - Error fetching batch:", batchError)
            // Fallback to joined date or default
            if (studentDocData.joinedDate) {
              startDate = new Date(studentDocData.joinedDate)
              courseDataSource = "joinedDate"
            } else {
              startDate = new Date()
              startDate.setDate(startDate.getDate() - 30)
              courseDataSource = "default30days"
            }
          }
        } else {
          console.warn("🔍 Debug - No batch in user profile or student data")
          // Use joined date if available, otherwise default to 30 days ago
          if (studentDocData.joinedDate) {
            startDate = new Date(studentDocData.joinedDate)
            courseDataSource = "joinedDate"
            console.log("🔍 Debug - Using joinedDate as start date:", startDate)
          } else {
            startDate = new Date()
            startDate.setDate(startDate.getDate() - 30)
            courseDataSource = "default30days"
            console.log("🔍 Debug - Using default start date (30 days ago):", startDate)
          }
        }
      }
      
      console.log("🔍 Debug - Final start date source:", courseDataSource)

      // Enhanced debug logging for course attendance data
      console.log("🔍 Debug - Course Attendance data structure:", {
        courseAttendance,
        datesPresent: courseAttendance.datesPresent,
        datesPresent_length: courseAttendance.datesPresent?.length || 0,
        summary: courseAttendance.summary
      })
      
      // Get the current date and ensure we don't generate records beyond today
      const currentDate = new Date()
      currentDate.setHours(23, 59, 59, 999) // Set to end of day for accurate comparison
      console.log("🔍 Debug - Current Date (end of day):", currentDate)
      console.log("🔍 Debug - Start Date:", startDate)
      
      // Calculate total days more accurately - only count days from start to today (inclusive)
      const timeDiff = currentDate.getTime() - startDate.getTime()
      const totalDays = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1)
      console.log("🔍 Debug - Total Days calculated:", totalDays)
      
      // Generate daily records from start date to current date only
      const dailyRecords: AttendanceRecord[] = []
      const currentDateTime = new Date(startDate)
      currentDateTime.setHours(0, 0, 0, 0) // Start at beginning of start date

      let recordCount = 0
      while (currentDateTime <= currentDate && recordCount < totalDays) {
        const dateString = currentDateTime.toISOString().split('T')[0]
        const isPresent = courseAttendance.datesPresent?.includes(dateString) || false
        
        dailyRecords.push({
          date: dateString,
          status: isPresent ? "present" : "absent",
          time: isPresent ? "10:00 AM" : undefined,
          hoursSpent: isPresent ? 8 : 0
        })
        
        currentDateTime.setDate(currentDateTime.getDate() + 1)
        recordCount++
      }

      console.log("🔍 Debug - Generated Daily Records:", dailyRecords.length, "records")
      console.log("🔍 Debug - First 5 records:", dailyRecords.slice(0, 5))
      console.log("🔍 Debug - Last 5 records:", dailyRecords.slice(-5))

      // Sort records by date (newest first for display)
      dailyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Calculate accurate statistics
      const presentDays = courseAttendance.datesPresent?.length || 0
      const absentDays = Math.max(0, totalDays - presentDays)
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      const totalHours = presentDays * 8
      const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

      console.log("🔍 Debug - Final Stats:", {
        courseID: primaryCourse.courseID,
        courseName: primaryCourse.courseName,
        startDate: startDate.toISOString().split('T')[0],
        startDateSource: courseDataSource,
        currentDate: currentDate.toISOString().split('T')[0],
        totalDays,
        presentDays,
        absentDays,
        percentage,
        totalHours,
        averageHoursPerDay,
        actualRecordsGenerated: dailyRecords.length
      })

      const summaryData: AttendanceSummary = {
        startDate: startDate.toISOString().split('T')[0],
        currentDate: currentDate.toISOString().split('T')[0],
        totalDays,
        presentDays,
        absentDays,
        percentage,
        totalHours,
        averageHoursPerDay,
        dailyRecords,
        primaryCourse
      }

      console.log("🔍 Debug - Final Summary Data:", summaryData)

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
  }, [user, userProfile, getPrimaryCourse])

  // Initialize attendance data and set up real-time listener
  useEffect(() => {
    console.log("Attendance page mounting")
    isMounted.current = true

    if (!user) {
      console.warn("No authenticated user, redirecting to login")
      router.push("/login")
      return
    }

    console.log("User authenticated, attempting to fetch attendance data")
    // Fetch immediately when user is available
    fetchAttendanceData()

    // Set up real-time listener for student document changes
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
  }, [user, router, fetchAttendanceData]) // Include user in dependencies

  // Separate effect to re-fetch when userProfile loads
  useEffect(() => {
    if (userProfile) {
      console.log("User profile loaded, re-fetching attendance data with updated profile")
      fetchAttendanceData()
    }
  }, [userProfile, fetchAttendanceData])

  // Fetch batch info
  useEffect(() => {
    if (!user) {
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

    // Try to get batch from userProfile first
    let batchId = userProfile?.batch || null
    
    // If no batch in userProfile, try to get it from the student document
    if (!batchId) {
      getDoc(doc(db, "students", user.uid)).then(studentDoc => {
        if (studentDoc.exists()) {
          const studentData = studentDoc.data()
          batchId = studentData.batch
          if (batchId) {
            setupBatchListener(batchId)
          }
        }
      }).catch(error => {
        console.error("Error fetching student document for batch info:", error)
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
  }, [user, userProfile?.batch]) // Update dependencies

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
                            <p>User authenticated: {user ? 'Yes' : 'No'}</p>
                            <p>User ID: {user?.uid || 'N/A'}</p>
                            <p>User Email: {user?.email || 'N/A'}</p>
                            <p>User Profile loaded: {userProfile ? 'Yes' : 'No'}</p>
                            <p>Primary Course: {attendanceData.primaryCourse.courseName} (ID: {attendanceData.primaryCourse.courseID})</p>
                            <p>Course from Profile: {userProfile?.courseName ? (Array.isArray(userProfile.courseName) ? userProfile.courseName.join(', ') : userProfile.courseName) : 'N/A'}</p>
                            <p>Primary Course Index: {userProfile?.primaryCourseIndex ?? 'N/A'}</p>
                            <p>Total Days: {attendanceData.totalDays}</p>
                            <p>Present Days: {attendanceData.presentDays}</p>
                            <p>Attendance %: {attendanceData.percentage}%</p>
                            <p>Start Date: {attendanceData.startDate}</p>
                            <p>Current Date: {attendanceData.currentDate}</p>
                            <p>Records Generated: {attendanceData.dailyRecords.length}</p>
                            <p className="text-xs mt-2 text-muted-foreground">
                              Check browser console for detailed logs and course fetching info
                            </p>
                            <p className="text-xs text-muted-foreground">
                              If data looks wrong, try running the debug script in browser console
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