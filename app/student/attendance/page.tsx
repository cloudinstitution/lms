"use client"

import StudentLayout from "@/components/student-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { attendanceService, type AttendanceSummary } from "@/lib/attendance-service"

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
    currentMonth: "",
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    percentage: 0,
    totalHours: 0,
    averageHoursPerDay: 0,
    dailyRecords: [],
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

  // Callback to update attendance data safely
  const updateAttendanceData = useCallback((data: AttendanceSummary) => {
    if (isMounted.current) {
      console.log("Updating attendance data in component:", data.dailyRecords.length)
      setAttendanceData(data)
      setLoading(false)
    }
  }, [])

  // Initialize attendance service and subscribe to updates
  useEffect(() => {
    console.log("Attendance page mounting")
    isMounted.current = true

    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("No student data in session, redirecting to login")
      router.push("/login")
      return
    }

    console.log("Initializing attendance with student ID:", studentData.studentId)
    attendanceService.initialize(studentData.studentId)
    const unsubscribe = attendanceService.subscribeToAttendance(updateAttendanceData)
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
  }, [router, updateAttendanceData])

  // Fetch batch info
  useEffect(() => {
    const studentData = getStudentSession()
    if (!studentData || !userProfile?.batch) {
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

    try {
      // Query the batches collection
      const batchQuery = query(collection(db, "batches"), where("batchId", "==", userProfile.batch))

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
      return () => unsubscribe()
    } catch (error) {
      console.error("Error setting up batch info listener:", error)
    }
  }, [userProfile?.batch])

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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance</h1>
            <p className="text-gray-600">Track your attendance status and history</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-md overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <CardHeader>
              <CardTitle className="text-gray-900">Attendance Summary</CardTitle>
              <CardDescription>Your attendance for {attendanceData.currentMonth || "this month"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent"></div>
                  <p className="mt-2 text-gray-600">Loading attendance data...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-gray-200 stroke-current"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-emerald-500 stroke-current"
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
                          className="text-2xl font-bold fill-gray-900"
                        >
                          {attendanceData.percentage}%
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total Days</p>
                      <p className="text-lg font-bold text-gray-900">{attendanceData.totalDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Present</p>
                      <p className="text-lg font-bold text-emerald-600">{attendanceData.presentDays}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Absent</p>
                      <p className="text-lg font-bold text-red-600">{attendanceData.absentDays}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">Total Hours</p>
                      <p className="font-medium text-gray-900">{attendanceData.totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">Average Hours/Day</p>
                      <p className="font-medium text-gray-900">{attendanceData.averageHoursPerDay.toFixed(1)}h</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-none shadow-md overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <CardHeader>
              <CardTitle className="text-gray-900">Attendance Records</CardTitle>
              <CardDescription>Daily attendance history</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="list">
                <TabsList className="mb-4 bg-gray-100">
                  <TabsTrigger
                    value="list"
                    className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                  >
                    List View
                  </TabsTrigger>
                  <TabsTrigger
                    value="calendar"
                    className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                  >
                    Calendar View
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="space-y-4">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent"></div>
                      <p className="mt-2 text-gray-600">Loading attendance records...</p>
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
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {record.status === "present" ? (
                                  <CheckCircle className="h-5 w-5" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {new Date(record.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                                {record.status === "present" && (
                                  <p className="text-xs text-gray-500">
                                    {record.time && `Marked at ${record.time}`}
                                    {record.hoursSpent > 0 && ` • ${record.hoursSpent}h spent`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-medium ${
                                  record.status === "present" ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                {record.status === "present" ? "Present" : "Absent"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No attendance records found for this month</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="calendar">
                  <div className="border rounded-md p-4">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="text-xs font-medium text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(() => {
                        const today = new Date()
                        const year = today.getFullYear()
                        const month = today.getMonth()

                        // Get first day of month and how many days to show before it
                        const firstDayOfMonth = new Date(year, month, 1)
                        const dayOffset = firstDayOfMonth.getDay()

                        // Get last day of month
                        const lastDayOfMonth = new Date(year, month + 1, 0)
                        const daysInMonth = lastDayOfMonth.getDate()

                        // Calculate total days to display (including padding)
                        const totalDays = dayOffset + daysInMonth
                        const totalCells = Math.ceil(totalDays / 7) * 7

                        return Array.from({ length: totalCells }).map((_, index) => {
                          // Calculate the day number
                          const day = index - dayOffset + 1
                          const isCurrentMonth = day > 0 && day <= daysInMonth

                          // Create date string for comparison with records
                          const currentDate = new Date(year, month, day)
                          const dateString = isCurrentMonth ? formatDateToString(currentDate) : ""

                          // Find if we have a record for this day
                          const record = attendanceData.dailyRecords.find((r) => r.date === dateString)
                          const isToday = isCurrentMonth && day === today.getDate()

                          return (
                            <div
                              key={`calendar-day-${index}`}
                              className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm ${
                                isCurrentMonth
                                  ? isToday
                                    ? "border-2 border-emerald-500 font-bold"
                                    : record
                                      ? record.status === "present"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                      : "bg-white hover:bg-gray-50"
                                  : "text-gray-400 bg-gray-50"
                              }`}
                            >
                              {isCurrentMonth && day}
                              {record && (
                                <div
                                  className={`w-2 h-2 rounded-full mt-1 ${
                                    record.status === "present" ? "bg-emerald-600" : "bg-red-600"
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
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <CardHeader>
            <CardTitle className="text-gray-900">Batch Information</CardTitle>
            <CardDescription>Your current batch details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">{batchInfo.startDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">{batchInfo.endDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium text-gray-900">{batchInfo.duration}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Instructors</p>
                  <p className="font-medium text-gray-900">{batchInfo.instructors.join(", ") || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Class Schedule</p>
                <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <p className="font-medium text-gray-900">Monday - Friday</p>
                    <p className="text-gray-700">{batchInfo.schedule.weekdays}</p>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <p className="font-medium text-gray-900">Lab Sessions</p>
                    <p className="text-gray-700">{batchInfo.schedule.labSessions}</p>
                  </div>
                  <div className="flex justify-between py-2">
                    <p className="font-medium text-gray-900">Weekend Sessions</p>
                    <p className="text-gray-700">{batchInfo.schedule.weekend}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50">
            <p className="text-sm text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-emerald-600" />
              Attendance is marked daily at 10:00 AM by your instructor.
            </p>
          </CardFooter>
        </Card>
      </div>
    </StudentLayout>
  )
}