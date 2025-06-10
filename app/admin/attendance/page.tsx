"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import AttendanceScanner from "./attendance-scanner"

interface Student {
  id: string
  customId: string
  name: string
  present: boolean
}

export default function AdminAttendancePage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [scannerRefreshKey, setScannerRefreshKey] = useState(0)

  const fetchStudentsForDate = useCallback(async () => {
    if (!date) return

    setLoading(true)
    try {
      // Format date for query
      const selectedDate = new Date(date)
      const dateString = selectedDate.toISOString().split('T')[0]

      // Get all students
      const studentsQuery = query(collection(db, "students"))
      const studentSnapshot = await getDocs(studentsQuery)

      // Get attendance for the selected date
      const attendanceRef = doc(db, "attendance-dates", dateString)
      const attendanceDoc = await getDoc(attendanceRef)
      const presentStudents: string[] = attendanceDoc.exists() ? attendanceDoc.data().presentStudents || [] : []

      // Create the students list with attendance status
      const studentsList = studentSnapshot.docs.map(studentDoc => {
        const studentData = studentDoc.data()
        const customId = studentData.studentId || "unknown"
        return {
          id: studentDoc.id,
          customId: customId,
          name: studentData.name || "Unknown Student",
          // Check both Firebase ID and custom student ID
          present: presentStudents.includes(studentDoc.id) || presentStudents.includes(customId)
        }
      })

      setStudents(studentsList)
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }, [date])

  // Load students when date changes
  useEffect(() => {
    if (date) {
      fetchStudentsForDate()
    }
  }, [date, fetchStudentsForDate])

  const markAttendance = async (studentId: string, customStudentId: string, studentName: string, present: boolean) => {
    if (!date) return

    try {
      const selectedDate = new Date(date)
      const dateString = selectedDate.toISOString().split('T')[0]

      // Update attendance-dates collection
      const attendanceDateRef = doc(db, "attendance-dates", dateString)
      const attendanceSnap = await getDoc(attendanceDateRef)
      const currentData = attendanceSnap.exists() ? attendanceSnap.data() : { presentStudents: [] }

      // Store both Firebase ID and custom student ID
      const updatedPresentStudents = present
        ? Array.from(new Set([...currentData.presentStudents, studentId, customStudentId]))
        : currentData.presentStudents.filter((id: string) => id !== studentId && id !== customStudentId)

      await setDoc(attendanceDateRef, {
        date: Timestamp.fromDate(selectedDate),
        presentStudents: updatedPresentStudents,
        lastUpdated: Timestamp.now(),
        updatedBy: "admin",
        updatedByName: "Administrator",
        hoursSpent: present ? 7 : 0 // 7 hours for full day
      }, { merge: true })

      // Update local state
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === studentId ? { ...student, present } : student
        )
      )

    } catch (error) {
      console.error("Error marking attendance:", error)
    }
  }

  // Callback for when attendance is marked via scanner
  const handleAttendanceMarked = useCallback(() => {
    fetchStudentsForDate() // Refresh the student list
    setScannerRefreshKey(prev => prev + 1) // Reset scanner
  }, [fetchStudentsForDate])

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
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Select Date</CardTitle>
                <CardDescription className="text-muted-foreground">Choose a date to view or mark attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
                <Button onClick={fetchStudentsForDate} className="w-full mt-4" disabled={!date || loading}>
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
                <CardTitle className="text-foreground">Student Attendance</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {date ? `Attendance for ${date.toLocaleDateString()}` : "Select a date to view attendance"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading students...</span>
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium text-foreground">{student.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {student.customId}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={student.present ? "default" : "outline"}
                            onClick={() => markAttendance(student.id, student.customId, student.name, true)}
                            className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={!student.present ? "destructive" : "outline"}
                            onClick={() => markAttendance(student.id, student.customId, student.name, false)}
                          >
                            Absent
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">No students found for this date</p>
                    <p className="text-sm text-muted-foreground mt-1">Try selecting a different date</p>
                  </div>
                )}
              </CardContent>
            </Card>
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