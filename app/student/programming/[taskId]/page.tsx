"use client"

import StudentLayout from "@/components/student-layout"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ArrowLeft, Clock, Cloud, GraduationCap } from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import MonacoEditor from "@/components/monaco-editor"
import { v4 as uuidv4 } from "uuid"
import { storeTaskStatus, getTaskStatus } from "@/lib/task-status-service"
import { getStudentId, getStudentName } from "@/lib/session-storage"
import { isStudentInAWSCourse, getStudentAWSCourses } from "@/lib/course-utils"

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

interface ProgrammingTask {
  id: string
  title: string
  description: string
  language: string
  testCases: TestCase[]
  submissions: any[]
  difficulty: string
  dueDate: string
  starterCode: string
  createdAt: string
}

export default function StudentProgrammingTaskPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params?.taskId as string

  const [task, setTask] = useState<ProgrammingTask | null>(null)
  const [isAWSStudent, setIsAWSStudent] = useState<boolean>(false)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [testResults, setTestResults] = useState<{
    passed: boolean
    passedTests: number
    totalTests: number
    results: TestResult[]
  } | null>(null)
  const [activeTab, setActiveTab] = useState("description")
  const [executionLoading, setExecutionLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown")
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)

  useEffect(() => {
    // Check if student is in AWS course
    const awsStudent = isStudentInAWSCourse()
    setIsAWSStudent(awsStudent)
    
    // If AWS student, redirect to programming main page
    if (awsStudent) {
      router.push('/student/programming')
      return
    }
    
    // Get student info from localStorage
    const id = getStudentId()
    const name = getStudentName()
    
    setStudentId(id)
    setStudentName(name || 'Student')
    
    if (!id) {
      router.push('/login')
      return
    }
    
    if (taskId) {
      fetchTask()
      checkApiStatus()
    }
  }, [taskId, router])

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

  const fetchTask = async () => {
    try {
      setLoading(true)
      const taskDoc = await getDoc(doc(db, "programmingTasks", taskId))

      if (!taskDoc.exists()) {
        setError("Task not found")
        return
      }

      const taskData = { id: taskDoc.id, ...taskDoc.data() } as ProgrammingTask
      setTask(taskData)

      if (taskData.starterCode) {
        setCode(taskData.starterCode)
      } else {
        const defaultCode = getDefaultStarterCode(taskData.language)
        setCode(defaultCode)
      }

      // Try to get previous submission from task status service
      if (studentId) {
        try {
          const taskStatus = await getTaskStatus(studentId, taskId)
          if (taskStatus?.code) {
            setCode(taskStatus.code)
          }
          
          // Check if we have test results information
          if (taskStatus?.passedTests !== undefined && taskStatus?.totalTests !== undefined) {
            setTestResults({
              passed: taskStatus.passed || false,
              passedTests: taskStatus.passedTests,
              totalTests: taskStatus.totalTests,
              results: [] // Detailed results not stored in task status
            })
          }
        } catch (statusErr) {
          console.error("Error fetching task status:", statusErr)
          // Continue with default code
        }
      }
    } catch (err) {
      console.error("Error fetching task:", err)
      setError("Failed to load programming task")
    } finally {
      setLoading(false)
    }
  }

  const getDefaultStarterCode = (language: string) => {
    switch (language.toLowerCase()) {
      case "javascript":
        return "// Write your JavaScript solution here\n\nfunction solution(input) {\n  // Your code here\n  return input;\n}\n"
      case "typescript":
        return "// Write your TypeScript solution here\n\nfunction solution(input: string): string {\n  // Your code here\n  return input;\n}\n"
      case "python":
        return "# Write your Python solution here\n\ndef solution(input):\n    # Your code here\n    return input\n"
      case "java":
        return "// Write your Java solution here\n\npublic class Solution {\n    public static String solution(String input) {\n        // Your code here\n        return input;\n    }\n}"
      default:
        return "// Write your solution here\n"
    }
  }

  const executeCodeWithJudge0 = async (code: string, language: string, input: string) => {
    try {
      const response = await fetch("/api/execute-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language, stdin: input }),
      })

      if (!response.ok) {
        throw new Error(`Failed to execute code: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error executing code:", error)
      throw error
    }
  }

  const runTests = async () => {
    if (!task) return

    try {
      setExecutionLoading(true)
      if (apiStatus === "unknown") {
        await checkApiStatus()
      }

      const results: TestResult[] = []
      let passedCount = 0

      for (const testCase of task.testCases) {
        try {
          const result = await executeCodeWithJudge0(code, task.language, testCase.input)
          let actualOutput = result.stdout?.trim() || result.processedOutput || ""

          if (result.compile_output) {
            actualOutput = result.compile_output
          } else if (result.stderr) {
            actualOutput = result.stderr
          }

          const passed = actualOutput.toLowerCase() === testCase.expectedOutput.toLowerCase().trim()
          if (passed) passedCount++

          results.push({
            testCase: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput,
            passed,
            error: result.stderr || result.compile_output || "",
          })
        } catch (err) {
          results.push({
            testCase: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: "Error",
            passed: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      const testResults = {
        passed: passedCount === task.testCases.length,
        passedTests: passedCount,
        totalTests: task.testCases.length,
        results,
      }

      setTestResults(testResults)
      setActiveTab("results")
      return testResults
    } catch (err) {
      console.error("Error running tests:", err)
      setError("Failed to run tests: " + (err instanceof Error ? err.message : String(err)))
      return null
    } finally {
      setExecutionLoading(false)
    }
  }

  const submitSolution = async () => {
    if (!task || !studentId) return

    try {
      setSubmitting(true)

      // Run tests first
      const results = await runTests()
      if (!results) {
        throw new Error("Failed to run tests")
      }

      // Create submission object
      const submission = {
        id: uuidv4(),
        taskId,
        studentId,
        studentName,
        code,
        submittedAt: new Date().toISOString(),
        status: "pending",
        testResults: results,
      }

      // Update task with new submission
      const taskRef = doc(db, "programmingTasks", taskId)
      const taskDoc = await getDoc(taskRef)

      if (!taskDoc.exists()) {
        throw new Error("Task not found")
      }

      const taskData = taskDoc.data()
      const submissions = taskData.submissions || []

      // Check if student has already submitted
      const existingSubmissionIndex = submissions.findIndex((sub: { studentId: string }) => sub.studentId === studentId)

      if (existingSubmissionIndex >= 0) {
        submissions[existingSubmissionIndex] = submission
      } else {
        submissions.push(submission)
      }

      // Update Firestore with submission
      await updateDoc(taskRef, { submissions })

      // Store task status with completion info
      await storeTaskStatus(
        studentId,
        taskId,
        code,
        results.passed,
        {
          passedTests: results.passedTests,
          totalTests: results.totalTests
        }      )

      alert("Solution submitted successfully!")
      router.push("/student/programming");
    } catch (err) {
      console.error("Error submitting solution:", err)
      setError("Failed to submit solution: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !task) {
    return <div className="flex justify-center py-12">Loading task...</div>
  }
  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/student/programming")}>
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

  if (!task) {
    return null
  }
  return (
    <StudentLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/student/programming")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{task.language}</Badge>
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
            </div>
          </div>

          {task.dueDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              Due: {new Date(task.dueDate).toLocaleString()}
            </div>
          )}
        </div>

        {apiStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Error</AlertTitle>
            <AlertDescription>
              The code execution API is not available. Please check your environment variables.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="code">Code Editor</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <Card>
              <CardContent className="pt-6">
                <div className="prose max-w-none dark:prose-invert">
                  <div className="whitespace-pre-line">{task.description}</div>

                  <h3 className="text-lg font-medium mt-6">Test Cases</h3>
                  <div className="grid gap-4">
                    {task.testCases.map((testCase, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-muted">
                        <p className="font-medium mb-2">Test Case {index + 1}</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium">Input:</p>
                            <pre className="mt-1 p-2 rounded bg-background">{testCase.input}</pre>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Expected Output:</p>
                            <pre className="mt-1 p-2 rounded bg-background">{testCase.expectedOutput}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code">
            <Card>
              <CardHeader>
                <CardTitle>Write your solution</CardTitle>
                <CardDescription>
                  Implement your solution in {task.language}. You can run tests to check your implementation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <MonacoEditor
                    value={code}
                    onChange={setCode}
                    language={task.language.toLowerCase()}
                    height="500px"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={runTests}
                  disabled={executionLoading}
                >
                  {executionLoading ? "Running Tests..." : "Run Tests"}
                </Button>
                <Button
                  onClick={submitSolution}
                  disabled={submitting || executionLoading || !testResults}
                >
                  {submitting ? "Submitting..." : "Submit Solution"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                {testResults && (
                  <CardDescription>
                    {testResults.passedTests}/{testResults.totalTests} tests passed
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!testResults ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">Run your code to see test results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={testResults.passed ? "success" : "destructive"}
                      >
                        {testResults.passed ? "All Tests Passed" : "Some Tests Failed"}
                      </Badge>
                    </div>

                    <div className="grid gap-4">
                      {testResults.results.map((result, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Test Case {index + 1}</h4>
                            <Badge variant={result.passed ? "success" : "destructive"}>
                              {result.passed ? "Passed" : "Failed"}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Input:</span> {result.testCase}
                            </div>
                            <div>
                              <span className="font-medium">Expected:</span> {result.expectedOutput}
                            </div>
                            <div>
                              <span className="font-medium">Actual:</span> {result.actualOutput}
                            </div>
                            {result.error && (
                              <div className="text-destructive">
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
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}