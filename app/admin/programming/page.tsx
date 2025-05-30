"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, FileCode, Plus, Trash } from "lucide-react"
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format } from "date-fns"
import MonacoEditor from "@/components/monaco-editor" // You'll need to create this component

interface ProgrammingTask {
  id: string
  title: string
  description: string
  language: string
  testCases: { input: string; expectedOutput: string }[]
  submissions: any[]
  difficulty: string
  dueDate: string
  starterCode: string
  createdAt: string
}

export default function AdminProgrammingPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [difficulty, setDifficulty] = useState("easy")
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"))
  const [starterCode, setStarterCode] = useState("")
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "" }])
  const [tasks, setTasks] = useState<ProgrammingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("create")

  // Fetch tasks when component mounts
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)

      // Check if user is authenticated (you should replace this with your actual auth check)
      // const user = auth.currentUser;
      // if (!user) {
      //   setError("You must be logged in to access this page");
      //   setLoading(false);
      //   return;
      // }

      const tasksCollection = collection(db, "programmingTasks")
      const tasksSnapshot = await getDocs(tasksCollection)
      const tasksList = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProgrammingTask[]
      setTasks(tasksList)
      setError("")
    } catch (err) {
      console.error("Error fetching tasks:", err)
      // Provide more specific error message for permission issues
      if (err instanceof Error && err.message.includes("permission")) {
        setError(
          "Firebase permission error: You need to update your Firestore security rules to allow access to the 'programmingTasks' collection.",
        )
      } else {
        setError("Failed to load programming tasks. Please check your Firebase configuration.")
      }
    } finally {
      setLoading(false)
    }
  }

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "" }])
  }

  const removeTestCase = (index: number) => {
    const updatedTestCases = [...testCases]
    updatedTestCases.splice(index, 1)
    setTestCases(updatedTestCases)
  }

  const updateTestCase = (index: number, field: "input" | "expectedOutput", value: string) => {
    const updatedTestCases = [...testCases]
    updatedTestCases[index][field] = value
    setTestCases(updatedTestCases)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      // Validate form
      if (
        !title.trim() ||
        !description.trim() ||
        !language.trim() ||
        testCases.some((tc) => !tc.input.trim() || !tc.expectedOutput.trim())
      ) {
        setError("Please fill in all required fields")
        return
      }

      const newTask = {
        title,
        description,
        language,
        testCases,
        submissions: [],
        difficulty,
        dueDate,
        starterCode,
        createdAt: new Date().toISOString(),
      }

      // Add to Firestore
      await addDoc(collection(db, "programmingTasks"), newTask)

      // Reset form
      setTitle("")
      setDescription("")
      setLanguage("javascript")
      setDifficulty("easy")
      setDueDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"))
      setStarterCode("")
      setTestCases([{ input: "", expectedOutput: "" }])

      // Refresh task list
      fetchTasks()

      // Switch to list tab
      setActiveTab("list")
    } catch (err) {
      console.error("Error creating task:", err)
      setError("Failed to create programming task")
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return
    }

    try {
      setLoading(true)
      await deleteDoc(doc(db, "programmingTasks", taskId))
      fetchTasks()
    } catch (err) {
      console.error("Error deleting task:", err)
      setError("Failed to delete task")
    } finally {
      setLoading(false)
    }
  }

  const viewSubmissions = (taskId: string) => {
    router.push(`/admin/programming/submissions/${taskId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Programming Tasks</h1>
        <p className="text-muted-foreground mt-1">Create and manage programming tasks for students</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Task</TabsTrigger>
          <TabsTrigger value="list">Task List</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Create New Programming Task</CardTitle>
                <CardDescription>Create a new programming challenge for students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Programming Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="csharp">C#</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the programming task in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="starterCode">Starter Code (Optional)</Label>
                  <div className="border rounded-md">
                    <MonacoEditor value={starterCode} onChange={setStarterCode} language={language} height="200px" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Test Cases</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                      <Plus className="h-4 w-4 mr-1" /> Add Test Case
                    </Button>
                  </div>

                  {testCases.map((testCase, index) => (
                    <div key={index} className="grid gap-4 p-4 border rounded-md">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Test Case {index + 1}</h4>
                        {testCases.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(index)}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`input-${index}`}>Input</Label>
                        <Textarea
                          id={`input-${index}`}
                          placeholder="Test case input"
                          value={testCase.input}
                          onChange={(e) => updateTestCase(index, "input", e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`output-${index}`}>Expected Output</Label>
                        <Textarea
                          id={`output-${index}`}
                          placeholder="Expected output"
                          value={testCase.expectedOutput}
                          onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab("list")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Create Task
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Programming Tasks</CardTitle>
              <CardDescription>Manage existing programming tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <FileCode className="h-12 w-12 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No programming tasks available</h3>
                  <p className="text-sm text-muted-foreground mt-1">Create your first programming task</p>
                  <Button className="mt-4" onClick={() => setActiveTab("create")}>
                    Create Task
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
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
                        <TableCell>{task.submissions?.length || 0} submissions</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => viewSubmissions(task.id)}>
                              View Submissions
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteTask(task.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
