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
  dailyRecords: []
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

  // Fetch and combine attendance data across every course the student has an
  // attendanceByCourse entry for, instead of requiring a single resolved
  // "primary course" to display anything.
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

    if (isMounted.current) setLoadError(null)

    try {
      const studentDocData = await findStudentDocument(studentData)

      if (!studentDocData) {
        console.warn("[attendance] Student document not found in Firestore")
        if (isMounted.current) {
          setAttendanceData(EMPTY_ATTENDANCE)
          setLoadError("We couldn't find your student record. Contact your admin.")
          setLoading(false)
        }
        return
      }

      // Combine attendance across every course in attendanceByCourse
      const attendanceByCourse = studentDocData.attendanceByCourse || {}
      const courseEntries = Object.values(attendanceByCourse) as Array<{
        datesPresent?: string[]
        summary?: { totalClasses?: number; attended?: number; percentage?: number }
      }>

      // Union of all present dates across courses (a student is "present" that
      // day if any of their courses marked them present)
      const allPresentDates = new Set<string>()
      let totalClassesAcrossCourses = 0
      let attendedAcrossCourses = 0

      courseEntries.forEach(entry => {
        (entry.datesPresent || []).forEach(d => allPresentDates.add(d))
        totalClassesAcrossCourses += entry.summary?.totalClasses || 0
        attendedAcrossCourses += entry.summary?.attended ?? (entry.datesPresent?.length ?? 0)
      })

      // Determine the tracking window: earliest present date, or joinedDate,
      // or fall back to the last 30 days if we have nothing else to go on.
      let startDate: Date
      const sortedDates = Array.from(allPresentDates).sort()
      if (sortedDates.length > 0) {
        startDate = new Date(sortedDates[0])
      } else if (studentDocData.joinedDate) {
        startDate = new Date(studentDocData.joinedDate)
      } else {
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
      }
      startDate.setHours(0, 0, 0, 0)

      const currentDate = new Date()
      currentDate.setHours(23, 59, 59, 999)

      const timeDiff = currentDate.getTime() - startDate.getTime()
      const totalDaysCalculated = Math.max(1, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1)

      const dailyRecords: AttendanceRecord[] = []
      const dateIterator = new Date(startDate)

      while (dateIterator <= currentDate) {
        const dateString = dateIterator.toISOString().split("T")[0]
        const isPresent = allPresentDates.has(dateString)

        dailyRecords.push({
          date: dateString,
          status: isPresent ? "present" : "absent",
          time: isPresent ? "10:00 AM" : undefined,
          hoursSpent: isPresent ? 8 : 0
        })

        dateIterator.setDate(dateIterator.getDate() + 1)
      }

      dailyRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const presentDays = attendedAcrossCourses > 0 ? attendedAcrossCourses : allPresentDates.size
      const totalClasses = totalClassesAcrossCourses > 0 ? totalClassesAcrossCourses : totalDaysCalculated
      const absentDays = Math.max(0, totalClasses - presentDays)
      const percentage = totalClasses > 0 ? Math.round((presentDays / totalClasses) * 100) : 0

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
        dailyRecords
      }

      if (isMounted.current) {
        setAttendanceData(summaryData)
        setLoading(false)
      }
    } catch (error) {
      console.error("[attendance] Error fetching attendance data:", error)
      if (isMounted.current) {
        setAttendanceData(EMPTY_ATTENDANCE)
        setLoadError("Something went wrong loading your attendance. Please try refreshing.")
        setLoading(false)
      }
    }
  }, [findStudentDocument])

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
            <p className="text-muted-foreground">Track your overall attendance status and history</p>
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
