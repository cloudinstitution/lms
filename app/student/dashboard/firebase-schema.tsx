// This file is for reference only - it shows the Firestore schema structure
// You don't need to create this file in your project

import type { DocumentReference, Timestamp } from "firebase/firestore"

// Collection: students
interface Student {
  id: string // Document ID
  name: string
  email: string
  batch: string
  image?: string
  score?: number // For top performers
}

// Collection: courses
interface Course {
  id: string // Document ID
  title: string
  description: string
  instructor: string
  duration: number
}

// Collection: enrollments
interface Enrollment {
  id: string // Document ID
  studentId: string
  courseRef: DocumentReference // Reference to course
  progress: number
  nextLesson: string
  nextSession: string
}

// Collection: assignments
interface Assignment {
  id: string // Document ID
  title: string
  course: string
  dueDate: string
  status: string // "Pending", "Submitted", "Graded"
  assignedTo: string[] // Array of student IDs
}

// Collection: attendance
interface Attendance {
  id: string // Document ID
  studentId: string
  date: Timestamp
  present: boolean
}

// Collection: learningStats (document ID is studentId)
interface LearningStats {
  weeklyGoalHours: number
  weeklyGoalCompleted: number
  thisWeekHours: number
  lastWeekHours: number
  thisMonthHours: number
  avgSessionMinutes: number
  completedLessons: number
  overallCompletion: number
}
