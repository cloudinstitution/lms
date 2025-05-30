"use client"

import StudentLayout from "@/components/student-layout"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, FileCode } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getTaskStatus } from "@/lib/task-status-service"
import { getStudentSession } from "@/lib/session-storage"

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

  useEffect(() => {
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
    
    init()
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
                      <TableCell>{getStatusBadge(task.id)}</TableCell>
                      <TableCell>
                        <Button variant="default" size="sm" onClick={() => startTask(task.id)}>
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
      </div>
    </StudentLayout>
  )
}
