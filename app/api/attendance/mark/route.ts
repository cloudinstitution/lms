import { db } from "@/lib/firebase"
import { doc, setDoc, Timestamp } from "firebase/firestore"
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
    }

    await setDoc(attendanceRef, attendanceData)

    return NextResponse.json({ success: true, message: "Attendance marked successfully" })
  } catch (error) {
    console.error("Error marking attendance:", error)
    return NextResponse.json({ success: false, error: "Failed to mark attendance" }, { status: 500 })
  }
}
