import { collection, onSnapshot, query, Timestamp, where, type DocumentData } from "firebase/firestore"
import { db } from "./firebase"

export interface AttendanceRecord {
  id?: string
  date: string
  status: "present" | "absent" | "holiday" | "late" | "excused"
  time: string | null
  dayName?: string
  dayNumber?: number
  hoursSpent: number
  courseId?: string
  courseName?: string
  timeIn?: string
  timeOut?: string
  notes?: string
}

export interface AttendanceSummary {
  currentMonth: string
  totalDays: number
  presentDays: number
  absentDays: number
  percentage: number
  totalHours: number
  averageHoursPerDay: number
  dailyRecords: AttendanceRecord[]
}

class AttendanceService {
  private static instance: AttendanceService
  private listeners: Array<(data: AttendanceSummary) => void> = []
  private weeklyListeners: Array<(data: AttendanceRecord[]) => void> = []
  private currentAttendanceData: AttendanceSummary | null = null
  private weeklyAttendanceData: AttendanceRecord[] | null = null
  private unsubscribe: (() => void) | null = null
  private studentId: string | null = null
  private customStudentId: string | null = null
  private isInitialized = false
  private isProcessing = false
  private lastProcessedRecords: string = ""
  private updateTimeout: NodeJS.Timeout | null = null
  private updateQueue: DocumentData[][] = []

  private constructor() {}

  public static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService()
    }
    return AttendanceService.instance
  }

  private formatDateToString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  public initialize(studentId: string): void {
    if (!studentId) {
      console.error("Cannot initialize AttendanceService with null or empty studentId")
      return
    }

    if (this.studentId === studentId && this.isInitialized) {
      console.log("AttendanceService already initialized for student:", studentId)
      this.notifyListenersWithCachedData()
      return
    }

    console.log("Initializing AttendanceService for student:", studentId)

    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }
    this.updateQueue = []

    this.studentId = studentId
    
    // Wait for userProfile to be available in sessionStorage
    const waitForUserProfile = () => {
      const userProfile = sessionStorage.getItem('userProfile')
      if (userProfile) {
        try {
          this.customStudentId = JSON.parse(userProfile).customStudentId || null
          console.log("Setting up attendance service with IDs:", {
            firebaseId: this.studentId,
            customStudentId: this.customStudentId
          })
          this.setupAttendanceListener()
        } catch (error) {
          console.error("Error parsing userProfile:", error)
          this.customStudentId = null
        }
      } else {
        // Retry after a short delay
        setTimeout(waitForUserProfile, 100)
      }
    }
    waitForUserProfile()

    this.setupAttendanceListener()
    this.isInitialized = true
  }

  private notifyListenersWithCachedData(): void {
    if (this.currentAttendanceData) {
      console.log("Immediately notifying monthly listeners with cached data")
      this.listeners.forEach((listener) => listener(this.currentAttendanceData!))
    }

    if (this.weeklyAttendanceData) {
      console.log("Immediately notifying weekly listeners with cached data")
      this.weeklyListeners.forEach((listener) => listener(this.weeklyAttendanceData!))
    }
  }

  private setupAttendanceListener(): void {
    if (!this.studentId) return

    try {
      console.log("Setting up attendance listener for student:", this.studentId)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Query using an array-contains operation to find records where the student is present
      // Use a simpler query while waiting for the index to be created
      const attendanceQuery = query(
        collection(db, "attendance-dates"),
        where("date", ">=", Timestamp.fromDate(startOfMonth)),
        where("date", "<=", Timestamp.fromDate(endOfMonth))
      )

      console.log(`Setting up query for dates between ${startOfMonth.toISOString()} and ${endOfMonth.toISOString()}`)
      
      this.unsubscribe = onSnapshot(
        attendanceQuery,
        (querySnapshot) => {
          console.log(`Received ${querySnapshot.size} attendance records`)
          const records = querySnapshot.docs.map((doc) => doc.data())
          
          this.updateQueue.push(records)
          
          if (this.updateTimeout) {
            clearTimeout(this.updateTimeout)
          }
          
          this.updateTimeout = setTimeout(() => {
            while (this.updateQueue.length > 0) {
              const nextRecords = this.updateQueue.shift()
              if (nextRecords) {
                this.processAttendanceData(nextRecords)
              }
            }
          }, 500)
        },
        (error) => {
          console.error("Error in attendance listener:", error)
        }
      )
    } catch (error) {
      console.error("Error setting up attendance listener:", error)
    }
  }

  private processAttendanceData(records: DocumentData[]): void {
    if (!this.studentId) {
      console.error("Cannot process attendance data: no student ID set")
      return
    }

    if (this.isProcessing) {
      console.log("Already processing data, queuing update")
      return
    }

    const recordsHash = JSON.stringify(records)
    if (recordsHash === this.lastProcessedRecords) {
      console.log("Records unchanged, skipping processing")
      return
    }

    console.log(`Processing ${records.length} attendance records for student ${this.studentId}`)

    this.isProcessing = true
    this.lastProcessedRecords = recordsHash

    try {
      const today = new Date()
      const currentMonth = today.toLocaleString("default", { month: "long", year: "numeric" })
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      const dailyRecords: AttendanceRecord[] = []
      const daysInMonth = endOfMonth.getDate()

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(today.getFullYear(), today.getMonth(), day)
        if (date <= today && date.getDay() !== 0) {
          const dateString = this.formatDateToString(date)
          dailyRecords.push({
            date: dateString,
            status: "absent",
            time: null,
            hoursSpent: 0,
          })
        }
      }

      const currentDay = today.getDay()
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToSubtract)

      const weeklyRecords: AttendanceRecord[] = []

      for (let i = 0; i < 6; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        const dateString = this.formatDateToString(date)

        weeklyRecords.push({
          date: dateString,
          status: "absent",
          time: null,
          dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
          dayNumber: date.getDate(),
          hoursSpent: 0,
        })
      }

      const sunday = new Date(startOfWeek)
      sunday.setDate(startOfWeek.getDate() + 6)
      weeklyRecords.push({
        date: this.formatDateToString(sunday),
        status: "holiday",
        time: null,
        dayName: "Sun",
        dayNumber: sunday.getDate(),
        hoursSpent: 0,
      })

      console.log("Processing attendance records with IDs:", {
        firebaseId: this.studentId,
        customStudentId: this.customStudentId
      })

      records.forEach((data) => {
        if (!data.date || !data.presentStudents || !this.studentId) {
          console.warn("Record missing required fields:", data)
          return
        }

        console.log("Processing attendance record:", {
          date: data.date,
          presentStudents: data.presentStudents
        })

        const attendanceDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
        const dateString = this.formatDateToString(attendanceDate)
        const timeString = data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : data.updatedAt
            ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : null

        // Check for presence using either Firebase ID or custom student ID
        const isPresent = data.presentStudents.some((id: string) => 
          id === this.studentId || (this.customStudentId && id === this.customStudentId)
        )
        
        if (isPresent) {
          console.log(`Found attendance match for date ${dateString}:`, {
            presentStudents: data.presentStudents,
            firebaseId: this.studentId,
            customStudentId: this.customStudentId
          })
        }
        
        const monthlyRecordIndex = dailyRecords.findIndex((r) => r.date === dateString)
        if (monthlyRecordIndex !== -1) {
          dailyRecords[monthlyRecordIndex] = {
            ...dailyRecords[monthlyRecordIndex],
            status: isPresent ? "present" : "absent",
            time: timeString,
            hoursSpent: isPresent ? (data.hoursSpent || 7) : 0, // Default to 7 hours if not specified
          }
        }

        const weeklyRecordIndex = weeklyRecords.findIndex((r) => r.date === dateString)
        if (weeklyRecordIndex !== -1 && weeklyRecords[weeklyRecordIndex].status !== "holiday") {
          weeklyRecords[weeklyRecordIndex] = {
            ...weeklyRecords[weeklyRecordIndex],
            status: isPresent ? "present" : "absent",
            time: timeString,
            hoursSpent: isPresent ? (data.hoursSpent || 7) : 0, // Default to 7 hours if not specified
          }
        }

        console.log(`Processed attendance for ${dateString}: ${isPresent ? "present" : "absent"}`)
      })

      dailyRecords.sort((a, b) => a.date.localeCompare(b.date))

      // Filter out holidays and future dates when calculating attendance
      const validRecords = dailyRecords.filter(r => {
        const recordDate = new Date(r.date)
        return recordDate <= new Date() && r.status !== "holiday"
      })

      const presentDays = validRecords.filter((r) => r.status === "present").length
      const totalDays = validRecords.length
      const absentDays = totalDays - presentDays
      const totalHours = validRecords.reduce((sum, r) => sum + (r.status === "present" ? r.hoursSpent : 0), 0)
      const averageHoursPerDay = presentDays > 0 ? (totalHours / presentDays) : 0
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

      console.log(`Attendance summary: ${presentDays}/${totalDays} days present (${percentage}%), ${totalHours} total hours`)

      const attendanceSummary: AttendanceSummary = {
        currentMonth,
        totalDays,
        presentDays,
        absentDays,
        percentage,
        totalHours,
        averageHoursPerDay,
        dailyRecords,
      }

      this.currentAttendanceData = attendanceSummary
      this.weeklyAttendanceData = weeklyRecords

      setTimeout(() => {
        this.notifyListeners()
      }, 100)

    } catch (error) {
      console.error("Error processing attendance data:", error)
    } finally {
      this.isProcessing = false
    }
  }

  public subscribeToAttendance(callback: (data: AttendanceSummary) => void): () => void {
    if (!this.listeners.includes(callback)) {
      this.listeners.push(callback)
    }

    if (this.currentAttendanceData) {
      setTimeout(() => {
        callback(this.currentAttendanceData!)
      }, 100)
    }

    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }

  public subscribeToWeeklyAttendance(callback: (data: AttendanceRecord[]) => void): () => void {
    if (!this.weeklyListeners.includes(callback)) {
      this.weeklyListeners.push(callback)
    }

    if (this.weeklyAttendanceData) {
      setTimeout(() => {
        callback(this.weeklyAttendanceData!)
      }, 100)
    }

    return () => {
      this.weeklyListeners = this.weeklyListeners.filter((listener) => listener !== callback)
    }
  }

  private notifyListeners(): void {
    if (this.currentAttendanceData) {
      this.listeners.forEach((listener) => {
        try {
          listener(this.currentAttendanceData!)
        } catch (error) {
          console.error("Error notifying monthly listener:", error)
        }
      })
    }

    if (this.weeklyAttendanceData) {
      this.weeklyListeners.forEach((listener) => {
        try {
          listener(this.weeklyAttendanceData!)
        } catch (error) {
          console.error("Error notifying weekly listener:", error)
        }
      })
    }
  }

  public getCurrentAttendanceData(): AttendanceSummary | null {
    return this.currentAttendanceData
  }

  public getWeeklyAttendanceData(): AttendanceRecord[] | null {
    return this.weeklyAttendanceData
  }

  public refreshData(): void {
    if (!this.studentId) {
      console.error("Cannot refresh data: no student ID set")
      return
    }
    
    console.log("Manually refreshing attendance data for student:", this.studentId)
    this.setupAttendanceListener()
  }

  public cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }
    this.listeners = []
    this.weeklyListeners = []
    this.currentAttendanceData = null
    this.weeklyAttendanceData = null
    this.studentId = null
    this.customStudentId = null
    this.isInitialized = false
    this.isProcessing = false
    this.updateQueue = []
    console.log("AttendanceService cleaned up")
  }
}

export const attendanceService = AttendanceService.getInstance()

// Export these functions to be used by API routes
export const getStudentAttendanceRecords = async (studentId: string, params: any = {}) => {
  // Import from attendance-query-service to avoid circular dependencies
  const { getStudentAttendanceRecords: fetchRecords } = await import('./attendance-query-service');
  return fetchRecords(studentId, params);
};

export const getStudentAttendanceSummary = async (studentId: string, params: any = {}) => {
  // Import from attendance-query-service to avoid circular dependencies
  const { getStudentAttendanceSummary: fetchSummary } = await import('./attendance-query-service');
  return fetchSummary(studentId, params);
};