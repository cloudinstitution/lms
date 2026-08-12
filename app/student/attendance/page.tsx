"use client"

import StudentLayout from "@/components/student-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const EMPTY_ATTENDANCE: AttendanceSummary = {
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
}

export default function StudentAttendance() {
  const router = useRouter()

  const [attendanceData, setAttendanceData] = useState<AttendanceSummary>(EMPTY_ATTENDANCE)
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
  const [loadError, setLoadError] = useState<string | null>(null)

  // Use refs to track mounted state and prevent state updates after unmount
  const isMounted = useRef(true)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const batchUnsubscribeRef = useRef<(() => void) | null>(null)

  // Get primary course from student session data
  const getPrimaryCourse = useCallback(() => {
    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("[attendance] No student session available")
      return null
    }

    if (!studentData.courseName) {
      console.warn("[attendance] No course data in student session")
      return null
    }

    const primaryIndex = studentData.primaryCourseIndex || 0

    const courseIDs: string[] = Array.isArray(studentData.courseID)
      ? studentData.courseID.map((id: unknown) => id?.toString() ?? "")
      : [studentData.courseID?.toString() ?? ""]

    const courseNames: string[] = Array.isArray(studentData.courseName)
      ? studentData.courseName
      : [studentData.courseName]

    const courseID = courseIDs[primaryIndex] || courseIDs[0] || ""
    const courseName = courseNames[primaryIndex] || courseNames[0] || ""

    if (!courseID) {
      console.warn("[attendance] Could not resolve a primary course ID from session data")
      return null
    }

    return { courseID, courseName }
  }, [])

  // Look up the student's Firestore document using every identifier we have,
  // stopping as soon as one succeeds. Each lookup is isolated so a bad/undefined
  // field on one attempt never throws and aborts the whole chain.
  const findStudentDocument = useCallback(async (studentData: any) => {
    // 1) Try the session id as the actual Firestore document id
    if (studentData?.id) {
      try {
        const snap = await getDoc(doc(db, "students", studentData.id))
        if (snap.exists()) {
          console.log("[attendance] Student doc found by session id")
          return snap.data()
        }
      } catch (err) {
        console.warn("[attendance] Lookup by session id failed:", err)
      }
    }

    // 2) Try matching on a custom student ID field, whichever variant exists
    const customId = studentData?.studentId ?? studentData?.customStudentId ?? null
    if (customId) {
      try {
        const q = query(collection(db, "students"), where("studentId", "==", customId))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          console.log("[attendance] Student doc found by studentId field")
          return snapshot.docs[0].data()
        }
      } catch (err) {
        console.warn("[attendance] Lookup by studentId field failed:", err)
      }
    }

    // 3) Try matching by email as a last resort
    if (studentData?.email) {
      try {
        const q = query(collection(db, "students"), where("email", "==", studentData.email))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          console.log("[attendance] Student doc found by email")
          return snapshot.docs[0].data()
        }
      } catch (err) {
        console.warn("[attendance] Lookup by email failed:", err)
      }
    }

    return null
  }, [])

  // Look up a course's start date. Course docs may be keyed by an internal
  // Firestore doc id that differs from the courseID field, and courseID may be
  // stored as either a string or a number - so we try every reasonable path.
  const findCourseStartDate = useCallback(async (courseID: string): Promise<{ date: Date | null; source: string }> => {
    // 1) Direct document id lookup (works only if courseID happens to be the doc id)
    try {
      const directDoc = await getDoc(doc(db, "courses", courseID))
      if (directDoc.exists()) {
        const data = directDoc.data()
        if (data.startDate) {
          const date = data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate)
          return { date, source: "course-direct" }
        }
      }
    } catch (err) {
      console.warn("[attendance] Direct course doc lookup failed:", err)
    }

    // 2) Query by courseID field as a string
    try {
      const stringQuery = query(collection(db, "courses"), where("courseID", "==", courseID))
      const stringSnapshot = await getDocs(stringQuery)
      if (!stringSnapshot.empty) {
        const data = stringSnapshot.docs[0].data()
        if (data.startDate) {
          const date = data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate)
          return { date, source: "course-query-string" }
        }
      }
    } catch (err) {
      console.warn("[attendance] Course query (string courseID) failed:", err)
    }

    // 3) Query by courseID field as a number, only if it actually parses
    const numericID = Number(courseID)
    if (!Number.isNaN(numericID)) {
      try {
        const numericQuery = query(collection(db, "courses"), where("courseID", "==", numericID))
        const numericSnapshot = await getDocs(numericQuery)
        if (!numericSnapshot.empty) {
          const data = numericSnapshot.docs[0].data()
          if (data.startDate) {
            const date = data.startDate.toDate ? data.startDate.toDate() : new Date(data.startDate)
            return { date, source: "course-query-number" }
          }
        }
      } catch (err) {
        console.warn("[attendance] Course query (numeric courseID) failed:", err)
      }
    }

    return { date: null, source: "not-found" }
  }, [])

  // Fetch attendance data for the primary course from start date to current date
  const fetchAttendanceData = useCallback(async () => {
    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("[attendance] No student data in session")
      if (isMounted.current) {
        setLoadError("You're not signed in. Please log in again.")
        setLoading(false)
      }
      return
    }

    const primaryCourse = getPrimaryCourse()
    if (!primaryCourse) {
      console.warn("[attendance] No primary course available")
      if (isMounted.current) {
        setLoadError("We couldn't find a course on your profile. Contact your admin if this looks wrong.")
        setLoading(false)
      }
      return
    }

    if (isMounted.current) setLoadError(null)

    try {
      const studentDocData = await findStudentDocument(studentData)

      if (!studentDocData) {
        console.warn("[attendance] Student document not found in Firestore")
        if (isMounted.current) {
          setAttendanceData({ ...EMPTY_ATTENDANCE, primaryCourse })
          setLoadError("We couldn't find your student record. Contact your admin.")
          setLoading(false)
        }
        return
      }

      // Get attendance data from the student's attendanceByCourse field
      const attendanceByCourse = studentDocData.attendanceByCourse || {}

      const idVariants = [
        primaryCourse.courseID,
        primaryCourse.courseID.toString(),
        Number(primaryCourse.courseID)
      ].filter((id, index, arr) => arr.indexOf(id) === index)

      let courseAttendance = null
      for (const idVariant of idVariants) {
        if (attendanceByCourse[idVariant as any]) {
          courseAttendance = attendanceByCourse[idVariant as any]
          break
        }
      }

      if (!courseAttendance) {
        console.log("[attendance] No attendance record yet for course:", primaryCourse.courseID, "available keys:", Object.keys(attendanceByCourse))
        courseAttendance = {
          datesPresent: [],
          summary: { totalClasses: 0, attended: 0, percentage: 0 }
        }
      }

      // Resolve the course start date: course doc -> batch doc -> joinedDate -> 30-day fallback
      let startDate: Date | null = null
      let dateSource = "default"

      const courseStart = await findCourseStartDate(primaryCourse.courseID)
      if (courseStart.date) {
        startDate = courseStart.date
        dateSource = courseStart.source
      }

      if (!startDate && studentData.batch) {
        try {
          const batchQuery = query(collection(db, "batches"), where("batchId", "==", studentData.batch))
          const batchSnapshot = await getDocs(batchQuery)
          if (!batchSnapshot.empty) {
            const batchData = batchSnapshot.docs[0].data()
            if (batchData.startDate) {
              startDate = batchData.startDate.toDate ? batchData.startDate.toDate() : new Date(batchData.startDate)
              dateSource = "batch"
            }
          }
        } catch (err) {
          console.warn("[attendance] Batch start date lookup failed:", err)
        }
      }

      if (!startDate) {
        if (studentDocData.joinedDate) {
          startDate = new Date(studentDocData.joinedDate)
          dateSource = "joinedDate"
        } else {
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 30)
          dateSource = "default30days"
        }
      }

      console.log("[attendance] Using start date source:", dateSource, startDate.toISOString().split("T")[0])

      // Generate daily records from start date to current date
      const currentDate = new Date()
      currentDate.setHours(23, 59, 59, 999)

      const timeDiff = currentDate.getTime() - startDate.getTime()
      const totalDaysCalculated = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1)

      const dailyRecords: AttendanceRecord[] = []
      const dateIterator = new Date(startDate)
      dateIterator.setHours(0, 0, 0, 0)

      while (dateIterator <= currentDate) {
        const dateString = dateIterator.toISOString().split("T")[0]
        const isPresent = courseAttendance.datesPresent?.includes(dateString) || false

        dailyRecords.push({
          date: dateString,
          status: isPresent ? "present" : "absent",
          time: isPresent ? "10:00 AM" : undefined,
          hoursSpent: isPresent ? 8 : 0
        })

        dateIterator.setDate(dateIterator.getDate() + 1)
      }

      dailyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const presentDays = courseAttendance.summary?.attended ?? courseAttendance.datesPresent?.length ?? 0
      const totalClasses = courseAttendance.summary?.totalClasses || totalDaysCalculated
      const absentDays = Math.max(0, totalClasses - presentDays)

      let percentage = 0
      if (courseAttendance.summary?.percentage !== undefined) {
        percentage = Math.round(courseAttendance.summary.percentage)
      } else if (totalClasses > 0) {
        percentage = Math.round((presentDays / totalClasses) * 100)
      }

      const totalHours = presentDays * 8
      const averageHoursPerDay = totalClasses > 0 ? totalHours / totalClasses : 0

      const summaryData: AttendanceSummary = {
        startDate: startDate.toISOString().split("T")[0],
        currentDate: currentDate.toISOString().split("T")[0],
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
      console.error("[attendance] Error fetching attendance data:", error)
      if (isMounted.current) {
        setAttendanceData({ ...EMPTY_ATTENDANCE, primaryCourse })
        setLoadError("Something went wrong loading your attendance. Please try refreshing.")
        setLoading(false)
      }
    }
  }, [getPrimaryCourse, findStudentDocument, findCourseStartDate])

  // Initialize attendance data and set up real-time listener
  useEffect(() => {
    isMounted.current = true

    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("[attendance] No student data in session, redirecting to login")
      router.push("/login")
      return
    }

    fetchAttendanceData()

    // Real-time listener on the student's own document, so admin-side changes
    // (e.g. marking today's attendance) show up without a manual refresh.
    if (studentData.id) {
      try {
        const studentDocRef = doc(db, "students", studentData.id)
        const unsubscribe = onSnapshot(
          studentDocRef,
          (snap) => {
            if (snap.exists() && isMounted.current) {
              fetchAttendanceData()
            }
          },
          (error) => {
            console.warn("[attendance] Student document listener error:", error)
          }
        )
        unsubscribeRef.current = unsubscribe
      } catch (error) {
        console.warn("[attendance] Failed to set up student document listener:", error)
      }
    }

    return () => {
      isMounted.current = false
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (batchUnsubscribeRef.current) {
        batchUnsubscribeRef.current()
      }
    }
  }, [router, fetchAttendanceData])

  // Fetch batch info
  useEffect(() => {
    const studentData = getStudentSession()
    const emptyBatch: BatchInfo = {
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
    }

    if (!studentData?.batch) {
      setBatchInfo(emptyBatch)
      return
    }

    try {
      const batchQuery = query(collection(db, "batches"), where("batchId", "==", studentData.batch))

      const unsubscribe = onSnapshot(
        batchQuery,
        (snapshot) => {
          if (!isMounted.current) return

          if (!snapshot.empty) {
            const batchDoc = snapshot.docs[0].data()

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
          } else {
            setBatchInfo(emptyBatch)
          }
        },
        (error) => {
          console.error("[attendance] Batch info listener error:", error)
          setBatchInfo(emptyBatch)
        }
      )

      batchUnsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error("[attendance] Error setting up batch info listener:", error)
      setBatchInfo(emptyBatch)
    }
  }, [])

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

        {loadError && !loading && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </div>
        )}

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
