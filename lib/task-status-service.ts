import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

export enum TaskStatus {
  COMPLETED = "completed",
  ATTEMPTED = "attempted",
}

interface TaskStatusData {
  status: TaskStatus
  code: string
  submittedAt: string
  passed: boolean
  passedTests?: number
  totalTests?: number
}

/**
 * Stores a task status under a student's taskStatus collection
 * Creates the taskStatus collection and document if they don't exist
 */
export const storeTaskStatus = async (
  studentId: string,
  taskId: string,
  codeSubmitted: string,
  passed: boolean,
  testResults?: { passedTests: number; totalTests: number },
): Promise<void> => {
  try {
    // Check if student exists first
    const studentRef = doc(db, "students", studentId)
    const studentDoc = await getDoc(studentRef)

    if (!studentDoc.exists()) {
      throw new Error(`Student with ID ${studentId} not found`)
    }

    // Reference to the taskStatus document
    const taskStatusRef = doc(db, `students/${studentId}/taskStatus/${taskId}`)

    // Create the taskStatus data
    const taskStatusData: TaskStatusData = {
      status: passed ? TaskStatus.COMPLETED : TaskStatus.ATTEMPTED,
      code: codeSubmitted,
      submittedAt: new Date().toISOString(),
      passed,
      ...(testResults && {
        passedTests: testResults.passedTests,
        totalTests: testResults.totalTests,
      }),
    }

    // setDoc will create both the collection and document if they don't exist
    await setDoc(taskStatusRef, taskStatusData)
  } catch (error) {
    console.error("Error storing task status:", error)
    throw error
  }
}

/**
 * Gets a task status from a student's taskStatus collection
 */
export const getTaskStatus = async (studentId: string, taskId: string): Promise<TaskStatusData | null> => {
  try {
    const taskStatusRef = doc(db, `students/${studentId}/taskStatus/${taskId}`)
    const taskStatusDoc = await getDoc(taskStatusRef)

    if (!taskStatusDoc.exists()) {
      return null
    }

    return taskStatusDoc.data() as TaskStatusData
  } catch (error) {
    console.error("Error getting task status:", error)
    throw error
  }
}
