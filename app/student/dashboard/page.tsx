"use client"

import StudentLayout from "@/components/student-layout"
import { StudentQRCode } from "@/components/student-qr-code"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateAttendanceQRCode } from "@/lib/attendance-utils"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import { collection, getDocs, onSnapshot, query, Timestamp, where } from "firebase/firestore"
import { Book, CheckCircle, Clock, FileText, QrCode, Trophy } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

interface Video {
  id: string
  link: string
  title: string
  completedBy?: string[]
  serialNo: number
}

interface Student {
  id: string
  name: string
  username: string
  password: string
  phoneNumber: string
  coursesEnrolled: number
  studentId: string
  joinedDate: string
  courseName: string
  status?: "Active" | "Inactive"
}

interface AttendanceRecord {
  date: string
  status: "present" | "absent" | "holiday"
  time: string | null
  dayName: string
  dayNumber: number
  hoursSpent?: number
}

interface TimeSpentStats {
  todayHours: number
  weekHours: number
  monthHours: number
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [attendanceCode, setAttendanceCode] = useState("")
  const [weeklyAttendance, setWeeklyAttendance] = useState<AttendanceRecord[]>([])
  const [timeSpent, setTimeSpent] = useState<TimeSpentStats>({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0
  })
  const [quizCounts, setQuizCounts] = useState({
    completed: 0,
    pending: 0,
    total: 0,
  })
  const [completedLessons, setCompletedLessons] = useState(0)
  const [totalLessons, setTotalLessons] = useState(0)
  const { user, userProfile } = useAuth()

  // Helper function to format date to YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  // Fetch attendance data for the week
  const fetchAttendanceData = (studentId: string, customStudentId: string) => {
    try {
      console.log("Setting up real-time listener for student:", { studentId, customStudentId })

      // Get the date range for the current week
      const today = new Date()
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToSubtract)
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      // Initialize weekly records with all weekdays
      const weeklyRecords: AttendanceRecord[] = []
      for (let i = 0; i < 6; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        const dateString = formatDateToString(date)

        weeklyRecords.push({
          date: dateString,
          status: "absent",
          time: null,
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
          dayNumber: date.getDate(),
          hoursSpent: 0
        })
      }

      // Add Sunday
      const sunday = new Date(startOfWeek)
      sunday.setDate(startOfWeek.getDate() + 6)
      weeklyRecords.push({
        date: formatDateToString(sunday),
        status: "holiday",
        time: null,
        dayName: "Sun",
        dayNumber: sunday.getDate(),
        hoursSpent: 0
      })

      // Create query for the week's attendance
      const attendanceQuery = query(
        collection(db, "attendance-dates"),
        where("date", ">=", Timestamp.fromDate(startOfWeek)),
        where("date", "<=", Timestamp.fromDate(endOfWeek))
      )

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        attendanceQuery,
        (querySnapshot) => {
          console.log("Received snapshot with", querySnapshot.size, "documents")

          querySnapshot.forEach((doc) => {
            try {
              const data = doc.data()
              if (!data.date || !data.presentStudents) return

              const attendanceDate = data.date.toDate()
              const dateString = formatDateToString(attendanceDate)
              
              // Find the matching record
              const recordIndex = weeklyRecords.findIndex((r) => r.date === dateString)
              if (recordIndex !== -1 && recordIndex < 6) { // Skip Sunday
                // Check for presence using either ID
                const isPresent = data.presentStudents.some((id: string) => 
                  id === studentId || id === customStudentId
                )

                console.log(`Dashboard attendance check for ${dateString}:`, {
                  presentStudents: data.presentStudents,
                  studentId,
                  customStudentId,
                  isPresent,
                  recordIndex,
                  beforeStatus: weeklyRecords[recordIndex].status
                })

                weeklyRecords[recordIndex].status = isPresent ? "present" : "absent"
                weeklyRecords[recordIndex].hoursSpent = isPresent ? 7 : 0
                if (data.lastUpdated) {
                  weeklyRecords[recordIndex].time = data.lastUpdated.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }

                // Log the updated record
                console.log(`Dashboard: Updated record for ${dateString}:`, weeklyRecords[recordIndex])
              }
            } catch (error) {
              console.error("Error processing attendance document:", error)
            }
          })

          console.log("Updated weekly attendance records:", weeklyRecords)
          setWeeklyAttendance(weeklyRecords)
          calculateTimeSpentStats(weeklyRecords)
        },
        (error) => {
          console.error("Error in real-time listener:", error)
        }
      )

      return unsubscribe
    } catch (error) {
      console.error("Error setting up attendance listener:", error)
      return () => {}
    }
  }

  const calculateTimeSpentStats = (records: AttendanceRecord[]) => {
    const now = new Date()
    const today = formatDateToString(now)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayHours = 0
    let weekHours = 0
    let monthHours = 0

    records.forEach(record => {
      if (!record.hoursSpent) return

      // Today's hours
      if (record.date === today) {
        todayHours += record.hoursSpent
      }
      
      // This week's hours
      const recordDate = new Date(record.date)
      if (recordDate >= startOfWeek) {
        weekHours += record.hoursSpent
      }
      
      // This month's hours
      if (recordDate >= startOfMonth) {
        monthHours += record.hoursSpent
      }
    })

    setTimeSpent({ todayHours, weekHours, monthHours })
  }

  // Fetch initial data on component mount
  useEffect(() => {
    const studentData = getStudentSession()
    if (!studentData) {
      console.warn("No student data in session, redirecting to login")
      router.push("/login")
      return
    }

    setStudent({
      id: studentData.id,
      name: studentData.name,
      username: studentData.username,
      password: studentData.password || "",
      phoneNumber: studentData.phoneNumber || "",
      coursesEnrolled: studentData.coursesEnrolled || 0,
      studentId: studentData.studentId,
      joinedDate: studentData.joinedDate || new Date().toISOString(),
      courseName: studentData.courseName || "",
      status: studentData.status || "Active"
    })

    setIsLoading(false)
    const unsubscribe = fetchAttendanceData(studentData.id, studentData.studentId)
    return () => unsubscribe && unsubscribe()
  }, [router])
  // Fetch completed lessons and quiz statistics
  useEffect(() => {
    const studentData = getStudentSession()
    if (!studentData) return

    const fetchCompletedLessons = async () => {
      try {
        // Get videos from the student's course
        const videosRef = collection(db, `courses/${encodeURIComponent(studentData.courseName)}/videos`)
        const videosSnapshot = await getDocs(videosRef)
        const videos = videosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Video[]
        
        // Count how many have been completed by the student
        const completed = videos.filter(video => video.completedBy?.includes(studentData.id)).length
        setCompletedLessons(completed)
        setTotalLessons(videos.length)
      } catch (error) {
        console.error("Error fetching completed lessons:", error)
      }
    }

    const fetchQuizStatistics = async () => {
      try {
        // Get quizzes for student's enrolled course only
        const quizzesRef = query(
          collection(db, "quizzes"),
          where("course", "==", studentData.courseName)
        )
        const quizzesSnapshot = await getDocs(quizzesRef)
        const total = quizzesSnapshot.size

        // Get completed quizzes for this student from this course
        const completedQuizzesRef = query(
          collection(db, "quizResults"),
          where("userId", "==", studentData.id),
          where("course", "==", studentData.courseName)
        )
        const completedSnapshot = await getDocs(completedQuizzesRef)
        const completed = completedSnapshot.size

        setQuizCounts({
          total,
          completed,
          pending: total - completed
        })
      } catch (error) {
        console.error("Error fetching quiz statistics:", error)
      }
    }

    fetchCompletedLessons()
    fetchQuizStatistics()
  }, []) // Only run once on mount

  // Generate attendance code when component mounts or student data changes
  useEffect(() => {
    if (student?.studentId) {
      const code = generateAttendanceQRCode(student.studentId)
      setAttendanceCode(code)
    }
  }, [student])

  if (isLoading) return <div className="p-6">Loading...</div>
  if (!student) return <div className="p-6">No student data available. Redirecting to login...</div>

  const presentDays = weeklyAttendance.filter((day) => day.status === "present").length
  const absentDays = weeklyAttendance.filter(
    (day) => new Date(day.date) <= new Date() && day.status === "absent",
  ).length

  return (
    <StudentLayout>
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back,{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{student.name}</span>! Here's your
              learning progress.
            </p>
          </div>          <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
              >
                <QrCode className="h-4 w-4" /> Show Attendance Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Today's Attendance Code</DialogTitle>
                <DialogDescription>Show this code to your instructor to mark your attendance</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <StudentQRCode attendanceCode={attendanceCode} size={200} />
                <p className="text-sm text-center text-muted-foreground mt-4">
                  Your instructor will scan this QR code to mark your attendance
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">Code: {attendanceCode}</p>
              </div>              <DialogFooter className="sm:justify-center">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowQRDialog(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>        
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 text-amber-500 mr-2" /> Top Performers
                </CardTitle>
                <CardDescription>Students with the highest scores in your batch</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p >No top performers data available</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="p-0">
              <CardTitle className="flex items-center">
                <Book className="h-5 w-5 text-emerald-500 mr-2" /> Enrolled Courses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{student.coursesEnrolled}</p>
              <p className="text-muted-foreground">Active courses</p>
            </CardContent>
          </Card>
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="p-0">
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-cyan-500 mr-2" /> Completed Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completedLessons}</p>
              <p className="text-muted-foreground">across all courses</p>
            </CardContent>
          </Card>
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="p-0">
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 text-violet-500 mr-2" /> Hours Spent
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-2">
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {timeSpent.monthHours.toFixed(1)}
                </p>
                <p className="text-muted-foreground">this month</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Today: {timeSpent.todayHours.toFixed(1)}h</span>
                <span className="text-muted-foreground">Week: {timeSpent.weekHours.toFixed(1)}h</span>
              </div>
            </CardContent>
          </Card>
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="p-0">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 text-amber-500 mr-2" /> Assessments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{quizCounts.pending}</p>
              <p className="text-muted-foreground">pending assessments</p>
              <div className="mt-2 text-sm">
                <span className="text-green-600 dark:text-green-400">{quizCounts.completed} completed</span>
                <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-600 dark:text-slate-400">{quizCounts.total} total</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="p-0">
              <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center">
                <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" /> Weekly Attendance
              </CardTitle>
              <CardDescription>Your attendance for this week</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              {weeklyAttendance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {weeklyAttendance.map((record, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="text-xs text-muted-foreground mb-1">{record.dayName}</div>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            record.status === "holiday"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : new Date(record.date) > new Date()
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : record.status === "present"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {record.status === "holiday" ? (
                            "H"
                          ) : new Date(record.date) > new Date() ? (
                            record.dayNumber
                          ) : record.status === "present" ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Present: </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{presentDays} days</span>
                      <span className="text-sm font-medium ml-3 text-slate-700 dark:text-slate-300">Absent: </span>
                      <span className="text-rose-600 dark:text-rose-400 font-medium">{absentDays} days</span>
                    </div>
                    <Link href="/student/attendance">
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        View Full Attendance
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-muted-foreground">No attendance data available for this week</p>
                  <Link href="/student/attendance">
                    <Button variant="link" size="sm" className="px-0 mt-2">
                      View Full Attendance
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="p-0">
              <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center">
                <Book className="h-5 w-5 text-emerald-500 mr-2" /> My Courses
              </CardTitle>
              <CardDescription>Continue where you left off</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Course:{" "}
                <span className="text-emerald-600 dark:text-emerald-400">{student.courseName}</span>
              </p>
              <Link href="/student/courses">
                <Button
                  variant="link"
                  className="px-0 mt-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  View Full Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
