"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface TestCase {
  input: string
  expectedOutput: string
}

interface TestResult {
  testCase: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  error?: string
}

interface Submission {
  id: string
  taskId: string
  studentId: string
  studentName: string
  code: string
  submittedAt: string
  status: "pending" | "approved" | "rejected"
  testResults?: {
    passed: boolean
    passedTests: number
    totalTests: number
    results: TestResult[]
  }
  feedback?: string
}

interface ProgrammingTask {
  id: string
  title: string
  description: string
  language: string
  testCases: TestCase[]
  submissions: Submission[]
  difficulty: string
  dueDate: string
  starterCode: string
  createdAt: string
}

interface TaskSubmissionsPageProps {
  params: {
    taskId: string
  }
}

export default function TaskSubmissionsPage({ params }: TaskSubmissionsPageProps) {
  const router = useRouter()
  const { taskId } = params

  const [task, setTask] = useState<ProgrammingTask | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchTaskAndSubmissions()
  }, [taskId])

  const fetchTaskAndSubmissions = async () => {
    try {
      setLoading(true)
      const taskDoc = await getDoc(doc(db, "programmingTasks", taskId))

      if (!taskDoc.exists()) {
        setError("Task not found")
        return
      }

      const taskData = { id: taskDoc.id, ...taskDoc.data() } as ProgrammingTask
      setTask(taskData)
      setSubmissions(taskData.submissions || [])
    } catch (err) {
      console.error("Error fetching task:", err)
      setError("Failed to load task submissions")
    } finally {
      setLoading(false)
    }
  }

  const updateSubmissionStatus = async (submissionId: string, status: "approved" | "rejected" | "pending") => {
    try {
      setLoading(true)

      if (!task) {
        setError("Task not found")
        return
      }

      // Find the submission and update its status
      const updatedSubmissions = submissions.map((sub) => (sub.id === submissionId ? { ...sub, status } : sub))

      // Update in Firestore
      await updateDoc(doc(db, "programmingTasks", taskId), {
        submissions: updatedSubmissions,
      })

      // Update local state
      setSubmissions(updatedSubmissions)
    } catch (err) {
      console.error("Error updating submission:", err)
      setError("Failed to update submission status")
    } finally {
      setLoading(false)
    }
  }

  const viewSubmissionDetails = (submissionId: string) => {
    router.push(`/admin/programming/submissions/${taskId}/${submissionId}`)
  }

  if (loading && !task) {
    return <div className="flex justify-center py-12">Loading submissions...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/programming")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tasks
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{task?.title} - Submissions</h1>
        <p className="text-muted-foreground mt-1">Review and grade student submissions for this programming task</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Language</h3>
                <p>{task?.language}</p>
              </div>
              <div>
                <h3 className="font-medium">Difficulty</h3>
                {task && (
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
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium">Description</h3>
              <p className="whitespace-pre-line">{task?.description}</p>
            </div>

            {task?.dueDate && (
              <div>
                <h3 className="font-medium">Due Date</h3>
                <p>{new Date(task.dueDate).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>
            {submissions.length} {submissions.length === 1 ? "submission" : "submissions"} received
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No submissions yet</p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>

              {["all", "pending", "approved", "rejected"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Submitted At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions
                        .filter((sub) => tab === "all" || sub.status === tab)
                        .map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell className="font-medium">{submission.studentName}</TableCell>
                            <TableCell>{new Date(submission.submittedAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  submission.status === "approved"
                                    ? "success"
                                    : submission.status === "rejected"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {submission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewSubmissionDetails(submission.id)}
                                >
                                  View Code
                                </Button>

                                {submission.status === "pending" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600"
                                      onClick={() => updateSubmissionStatus(submission.id, "approved")}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600"
                                      onClick={() => updateSubmissionStatus(submission.id, "rejected")}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
