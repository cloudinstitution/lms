"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import MonacoEditor from "@/components/monaco-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface SubmissionDetailsPageProps {
  params: {
    taskId: string
    submissionId: string
  }
}

export default function SubmissionDetailsPage({ params }: SubmissionDetailsPageProps) {
  const router = useRouter()
  const { taskId, submissionId } = params

  const [task, setTask] = useState<ProgrammingTask | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark")

  useEffect(() => {
    fetchSubmissionDetails()
  }, [taskId, submissionId])

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true)
      const taskDoc = await getDoc(doc(db, "programmingTasks", taskId))

      if (!taskDoc.exists()) {
        setError("Task not found")
        return
      }

      const taskData = { id: taskDoc.id, ...taskDoc.data() } as ProgrammingTask
      setTask(taskData)

      const sub = taskData.submissions?.find((s: Submission) => s.id === submissionId)
      if (!sub) {
        setError("Submission not found")
        return
      }

      setSubmission(sub)
      setFeedback(sub.feedback || "")
    } catch (err) {
      console.error("Error fetching submission:", err)
      setError("Failed to load submission details")
    } finally {
      setLoading(false)
    }
  }

  const updateSubmissionStatus = async (status: "approved" | "rejected" | "pending") => {
    try {
      setLoading(true)

      if (!task) {
        setError("Task not found")
        return
      }

      // Find the submission and update its status and feedback
      const updatedSubmissions = task.submissions.map((sub: Submission) =>
        sub.id === submissionId ? { ...sub, status, feedback } : sub,
      )

      // Update in Firestore
      await updateDoc(doc(db, "programmingTasks", taskId), {
        submissions: updatedSubmissions,
      })

      // Update local state
      const updatedSub = updatedSubmissions.find((s: Submission) => s.id === submissionId)
      if (updatedSub) {
        setSubmission(updatedSub)
      }

      // Show success message
      alert(`Submission ${status === "approved" ? "approved" : "rejected"} successfully`)
    } catch (err) {
      console.error("Error updating submission:", err)
      setError("Failed to update submission status")
    } finally {
      setLoading(false)
    }
  }

  const saveFeedback = async () => {
    try {
      setLoading(true)

      if (!task) {
        setError("Task not found")
        return
      }

      // Find the submission and update its feedback
      const updatedSubmissions = task.submissions.map((sub: Submission) =>
        sub.id === submissionId ? { ...sub, feedback } : sub,
      )

      // Update in Firestore
      await updateDoc(doc(db, "programmingTasks", taskId), {
        submissions: updatedSubmissions,
      })

      // Update local state
      const updatedSub = updatedSubmissions.find((s: Submission) => s.id === submissionId)
      if (updatedSub) {
        setSubmission(updatedSub)
      }

      // Show success message
      alert("Feedback saved successfully")
    } catch (err) {
      console.error("Error saving feedback:", err)
      setError("Failed to save feedback")
    } finally {
      setLoading(false)
    }
  }

  if (loading && !submission) {
    return <div className="flex justify-center py-12">Loading submission details...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
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
      <Button variant="ghost" onClick={() => router.push(`/admin/programming/submissions/${taskId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Submissions
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submission Details</h1>
          <p className="text-muted-foreground mt-1">
            {submission?.studentName}'s submission for {task?.title}
          </p>
        </div>

        {submission && (
          <Badge
            variant={
              submission.status === "approved"
                ? "success"
                : submission.status === "rejected"
                  ? "destructive"
                  : "outline"
            }
            className="text-base py-1 px-3"
          >
            {submission.status}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Submission Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium">Student</h3>
                <p>{submission?.studentName}</p>
              </div>
              <div>
                <h3 className="font-medium">Submitted At</h3>
                <p>{submission && new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
            </div>

            {submission?.testResults && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Test Results</h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={submission.testResults.passed ? "success" : "destructive"}>
                    {submission.testResults.passedTests}/{submission.testResults.totalTests} Tests Passed
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {submission.testResults.results?.map((result: TestResult, index: number) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Test Case {index + 1}</h4>
                        <Badge variant={result.passed ? "success" : "destructive"}>
                          {result.passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <div className="mb-1">
                          <span className="font-medium">Input:</span> {result.testCase}
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">Expected:</span> {result.expectedOutput}
                        </div>
                        <div className="mb-1">
                          <span className="font-medium">Actual:</span> {result.actualOutput}
                        </div>
                        {result.error && (
                          <div className="text-red-500">
                            <span className="font-medium">Error:</span> {result.error}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Student's Code</CardTitle>
              <Select value={editorTheme} onValueChange={(value: "vs-dark" | "light") => setEditorTheme(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vs-dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>The code submitted by the student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <MonacoEditor
                value={submission?.code || ""}
                onChange={() => {}} // Read-only
                language={task?.language || "javascript"}
                height="400px"
                theme={editorTheme}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>Provide feedback on the student's submission</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your feedback here..."
              rows={6}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={saveFeedback} disabled={loading}>
              Save Feedback
            </Button>

            <div className="flex space-x-2">
              {submission?.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    className="text-green-600"
                    onClick={() => updateSubmissionStatus("approved")}
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Submission
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={() => updateSubmissionStatus("rejected")}
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Submission
                  </Button>
                </>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
