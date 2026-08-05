import { collection, doc, getDoc, getDocs, query, Timestamp, where, writeBatch } from "firebase/firestore"
import { db } from "./firebase"

interface QRCodeData {
  studentId: string
  date: string
}

interface AttendanceResponse {
  success: boolean
  message: string
  studentName?: string
}

interface StudentData {
  name: string
  studentId: string
  customStudentId?: string
  [key: string]: any
}

/**
 * Parse the QR code data string
 * Expected format: studentId-YYYY-MM-DD or just studentId
 */
export const parseQRCodeData = (qrData: string): QRCodeData | null => {
  try {
    if (!qrData || typeof qrData !== "string") {
      console.error("Invalid QR code input: must be a non-empty string", qrData)
      return null
    }

    // If the QR code contains a date (format: studentId-YYYY-MM-DD)
    const match = qrData.match(/^([A-Za-z0-9]+)(?:-(\d{4}-\d{2}-\d{2}))?$/)
    if (!match) {
      console.error("Invalid QR code format: expected studentId or studentId-YYYY-MM-DD", qrData)
      return null
    }

    const [, studentId, date = new Date().toISOString().split('T')[0]] = match
    return { studentId, date }
  } catch (error) {
    console.error("Error parsing QR code data:", error, "Input:", qrData)
    return null
  }
}

/**
 * Process the scanned QR code data and mark attendance
 */
export const processAttendanceQRCode = async (qrData: string): Promise<AttendanceResponse> => {
  console.log("Starting QR code processing:", qrData)
  try {
    const parsedData = parseQRCodeData(qrData)

    if (!parsedData) {
      console.error("Failed to parse QR code data:", qrData)
      return {
        success: false,
        message: "Invalid QR code format. Please try again.",
      }
    }

    const { studentId, date } = parsedData

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) {
      console.error("Invalid date format in QR code:", date)
      return {
        success: false,
        message: "Invalid date in QR code. Please try again.",
      }
    }

    // Query students collection by studentId field
    const studentsQuery = query(collection(db, "students"), where("studentId", "==", studentId))
    const studentSnap = await getDocs(studentsQuery)

    if (studentSnap.empty) {
      console.error("No student found with ID:", studentId)
      return {
        success: false,
        message: `Student with ID ${studentId} not found.`,
      }
    }

    const studentDoc = studentSnap.docs[0]
    const studentDocId = studentDoc.id
    const studentData = studentDoc.data() as StudentData
    const studentName = studentData.name || "Unknown Student"

    // Check for existing individual attendance record
    const attendanceId = `${studentId}-${date}`
    const attendanceRef = doc(db, "attendance", attendanceId)

    const attendanceSnap = await getDoc(attendanceRef)
    if (attendanceSnap.exists()) {
      console.warn("Attendance already marked for:", { studentId, date, name: studentName })
      return {
        success: false,
        message: `Attendance already marked for ${studentName} on ${date}.`,
        studentName,
      }
    }

    const attendanceDate = new Date(date)
    const startTime = new Date(date)
    startTime.setHours(10, 0, 0, 0) // Class starts at 10 AM
    
    const endTime = new Date(date)
    endTime.setHours(17, 0, 0, 0) // Class ends at 5 PM    // Create a batch for atomic operations
    const batch = writeBatch(db)

    // Create the attendance record in the main attendance collection
    const attendanceData = {
      studentId: studentDocId,
      customStudentId: studentId,
      date: Timestamp.fromDate(attendanceDate),
      present: true,
      markedAt: Timestamp.now(),
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      hoursSpent: 7, // 7 hours for full day
      markedBy: "admin",
      markedByName: "Administrator",
      status: "present",
      courseId: "", // Will be populated when course tracking is added
      courseName: "", // Will be populated when course tracking is added
    }
    batch.set(attendanceRef, attendanceData)

    // Create a detailed record in the student's attendance subcollection
    const studentAttendanceRef = doc(db, `students/${studentDocId}/attendance/${date}`)
    batch.set(studentAttendanceRef, {
      ...attendanceData,
      timeIn: attendanceData.startTime,
      timeOut: attendanceData.endTime,
      notes: "",
    })

    // Update attendance-dates collection with both IDs
    const attendanceDateRef = doc(db, "attendance-dates", date)
    const attendanceDateSnap = await getDoc(attendanceDateRef)
    const currentData = attendanceDateSnap.exists() ? attendanceDateSnap.data() : { presentStudents: [] }
    
    // Add both IDs to presentStudents if not already present
    const newPresentStudents = [...new Set([...currentData.presentStudents, studentDocId, studentId])]
    
    batch.set(attendanceDateRef, {
      date: Timestamp.fromDate(attendanceDate),
      presentStudents: newPresentStudents,
      lastUpdated: Timestamp.now(),
      updatedBy: "admin",
      updatedByName: "Administrator"
    }, { merge: true })

    // Commit all operations atomically
    try {
      await batch.commit()
      console.log("Successfully committed attendance batch operations")
    } catch (error) {
      console.error("Error committing attendance batch:", error)
      throw error
    }

    console.log("Attendance marked successfully:", {
      studentId,
      studentDocId,
      date,
      name: studentName,
      presentStudents: newPresentStudents
    })

    return {
      success: true,
      message: `Attendance marked successfully for ${studentName}`,
      studentName,
    }
  } catch (error) {
    console.error("Error marking attendance:", error, "Input QR:", qrData)
    return {
      success: false,
      message: `Error marking attendance: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Generate a QR code data string for a student
 */
export const generateAttendanceQRCode = (studentId: string): string => {
  try {
    if (!studentId || typeof studentId !== "string") {
      console.error("Invalid studentId for QR code generation:", studentId)
      return ""
    }
    // Just use the student ID as the QR code value - the date will be determined when scanned
    return studentId
  } catch (error) {
    console.error("Error generating QR code:", error, "studentId:", studentId)
    return ""
  }
}

/**
 * Check if a student was present on a specific date
 */
export function isStudentPresentOnDate(attendanceRecords: any[], date: string): boolean {
  try {
    return attendanceRecords.some((record) => record.date === date && record.status === "present")
  } catch (error) {
    console.error("Error checking presence on date:", error, "date:", date)
    return false
  }
}