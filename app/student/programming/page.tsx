"use client"

import StudentLayout from "@/components/student-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/firebase"
import { getStudentSession } from "@/lib/session-storage"
import { isStudentInAWSCourse, getStudentAWSCourses } from "@/lib/course-utils"
import { getTaskStatus } from "@/lib/task-status-service"
import { collection, getDocs } from "firebase/firestore"
import { AlertCircle, Clock, FileCode, GraduationCap, BookOpen, Cloud } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Define types
interface Submission {
  studentId: string
  status: "pending" | "approved" | "rejected"
}

interface ProgrammingTask {
  id: string
  title: string
  language: string
  difficulty: "easy" | "medium" | "hard"
  dueDate?: string
  submissions?: Submission[]
}

interface TaskStatus {
  passed: boolean
}

export default function StudentProgrammingPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<ProgrammingTask[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown")
  const [isAWSStudent, setIsAWSStudent] = useState<boolean>(false)
  const [awsCourses, setAWSCourses] = useState<string[]>([])

  useEffect(() => {
    // Check if student is in AWS course
    const awsStudent = isStudentInAWSCourse()
    setIsAWSStudent(awsStudent)
    
    if (awsStudent) {
      setAWSCourses(getStudentAWSCourses())
      setLoading(false)
      return
    }
    
    const init = async () => {
      try {
        // Get student ID from session storage
        const id = getStudentSession()?.id || getStudentSession()?.studentId
        
        if (!id) {
          console.log("No student ID found in session")
          router.push('/login')
          return
        }

        // Initialize data fetching
        await Promise.all([
          fetchTasks(id),
          checkApiStatus()
        ])
      } catch (err) {
        console.error("Error initializing page:", err)
        setError("Failed to initialize page")
      }
    }
    
    // Only initialize for non-AWS students
    if (!awsStudent) {
      init()
    }
  }, [router])

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/test-judge0")
      const data = await response.json()

      if (data.status === "ok") {
        setApiStatus("ok")
      } else {
        setApiStatus("error")
        console.error("Judge0 API status check failed:", data.error)
      }
    } catch (error) {
      setApiStatus("error")
      console.error("Error checking Judge0 API status:", error)
    }
  }

  const fetchTasks = async (studentId: string) => {
    if (!studentId) return;
    
    try {
      setLoading(true)
      const tasksCollection = collection(db, "programmingTasks")
      const tasksSnapshot = await getDocs(tasksCollection)
      const tasksList: ProgrammingTask[] = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProgrammingTask[]
      setTasks(tasksList)

      // Fetch task statuses for each task
      const statuses: Record<string, TaskStatus> = {}
      await Promise.all(
        tasksList.map(async (task) => {
          try {
            const status = await getTaskStatus(studentId, task.id)
            if (status) {
              statuses[task.id] = status
            }
          } catch (err) {
            console.error(`Error fetching status for task ${task.id}:`, err)
          }
        })
      )
      setTaskStatuses(statuses)
      setError("")
    } catch (err) {
      console.error("Error fetching tasks:", err)
      setError("Failed to load programming tasks")
    } finally {
      setLoading(false)
    }
  }

  const startTask = (taskId: string) => {
    const studentId = getStudentSession()?.id || getStudentSession()?.studentId;
    if (!studentId) {
      router.push('/login');
      return;
    }
    router.push(`/student/programming/${taskId}`);
  }

  const getTaskButtonText = (taskId: string) => {
    const taskStatus = taskStatuses[taskId]
    if (!taskStatus) return "Start Task"
    
    if (taskStatus.passed) return "Completed"
    return "Try Again"
  }

  const getStatusBadge = (taskId: string) => {
    const taskStatus = taskStatuses[taskId]
    if (!taskStatus) return <Badge variant="outline">Not started</Badge>

    return (
      <Badge
        variant={taskStatus.passed ? "success" : "secondary"}
      >
        {taskStatus.passed ? "Completed" : "In Progress"}
      </Badge>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programming Tasks</h1>
          <p className="text-muted-foreground mt-1">Complete programming challenges to improve your coding skills</p>
        </div>

        {/* AWS Student Message */}
        {isAWSStudent ? (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-200">Programming Not Available for AWS Students</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                As a student enrolled in AWS courses, programming tasks are not required for your curriculum. 
                Your learning path focuses on cloud computing concepts, AWS services, and cloud architecture.
              </AlertDescription>
            </Alert>
            
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <GraduationCap className="h-5 w-5" />
                  Your AWS Learning Path
                </CardTitle>
                <CardDescription>
                  You are enrolled in the following AWS courses:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {awsCourses.map((course, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-blue-100 dark:bg-blue-900 rounded">
                      <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">{course}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Focus on these areas instead:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <BookOpen className="h-4 w-4" />
                      Course Materials & Labs
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <FileCode className="h-4 w-4" />
                      AWS Hands-on Projects
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <GraduationCap className="h-4 w-4" />
                      Certification Preparation
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <Cloud className="h-4 w-4" />
                      Cloud Architecture Design
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={() => router.push('/student/courses')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Go to Courses
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {apiStatus === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Judge0 API Error</AlertTitle>
                <AlertDescription>
                  The code execution API is not available. Please check your environment variables and configuration.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Available Tasks</CardTitle>
                <CardDescription>Programming tasks assigned to you</CardDescription>
              </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FileCode className="h-12 w-12 text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">No programming tasks available</h3>
                <p className="text-sm text-muted-foreground mt-1">Check back later for new programming assignments</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.language}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.difficulty === "easy"
                              ? "outline"
                              : task.difficulty === "medium"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {task.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        ) : (
                          "No deadline"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(task.id)}</TableCell>                      <TableCell>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => startTask(task.id)}
                          className={taskStatuses[task.id]?.passed 
                            ? "bg-teal-500 hover:bg-teal-600 text-white dark:bg-teal-600 dark:hover:bg-teal-700"
                            : "bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                          }
                        >
                          {getTaskButtonText(task.id)}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </StudentLayout>
  )
}
