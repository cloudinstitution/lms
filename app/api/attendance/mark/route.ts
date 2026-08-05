import { db } from "@/lib/firebase"
import { doc, Timestamp, writeBatch } from "firebase/firestore"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { studentId, date, present } = data

    if (!studentId || !date) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const now = new Date()
    const startTime = new Date(now)
    startTime.setHours(10, 0, 0, 0) // Class starts at 10 AM
    
    const endTime = new Date(now)
    endTime.setHours(17, 0, 0, 0) // Class ends at 5 PM (includes lab sessions)

    // Create attendance records with both ID formats
    const attendanceId = `${studentId}-${date}`
    const attendanceRef = doc(db, "attendance", attendanceId)

    const attendanceData = {
      studentId: studentId,
      customStudentId: studentId,
      date: Timestamp.fromDate(new Date(date)),
      present: present,
      markedAt: Timestamp.now(),
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      hoursSpent: present ? 7 : 0, // 7 hours for a full day (3 hours morning + 1 hour break + 3 hours lab)
      markedBy: "admin",
      markedByName: "Administrator",
    }    // Create a batch for atomic operations
    const batch = writeBatch(db)

    // Set the main attendance record
    batch.set(attendanceRef, attendanceData)

    // Create student-specific attendance record
    const studentAttendanceRef = doc(db, `students/${studentId}/attendance/${date}`)
    batch.set(studentAttendanceRef, {
      ...attendanceData,
      timeIn: attendanceData.startTime,
      timeOut: attendanceData.endTime,
      status: present ? "present" : "absent",
      notes: "",
      courseId: "", // Will be populated when course tracking is added
      courseName: "", // Will be populated when course tracking is added
    })

    try {
      // Commit all operations atomically
      await batch.commit()
      return NextResponse.json({ 
        success: true, 
        message: "Attendance marked successfully",
        details: {
          mainRecord: attendanceRef.path,
          studentRecord: studentAttendanceRef.path
        }
      })
    } catch (error) {
      console.error("Error in batch commit:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to mark attendance",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error preparing attendance data:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to prepare attendance data",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
