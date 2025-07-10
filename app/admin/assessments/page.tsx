"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore"
import { Eye, PlusCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Question {
  question: string
  options: string[]
  correctAnswer: number
}

interface Course {
  id: string
  title: string
  courseID: number
  status: string
}

export default function UploadQuizForm() {
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [topic, setTopic] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 },
  ])

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setCoursesLoading(true)
      const coursesSnapshot = await getDocs(collection(db, "courses"))
      const coursesList = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Untitled Course",
        courseID: doc.data().courseID || 0,
        status: doc.data().status || "Active",
      })) as Course[]
      
      // Filter only active courses
      const activeCourses = coursesList.filter(course => course.status === "Active")
      setCourses(activeCourses)
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setCoursesLoading(false)
    }
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index].question = value
    setQuestions(newQuestions)
  }

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].options[optionIndex] = value
    setQuestions(newQuestions)
  }

  const handleCorrectAnswerChange = (questionIndex: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[questionIndex].correctAnswer = Number.parseInt(value)
    setQuestions(newQuestions)
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }])
  }

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = [...questions]
      newQuestions.splice(index, 1)
      setQuestions(newQuestions)
    }
  }

  const validateForm = () => {
    if (!selectedCourseId) {
      toast({
        title: "Error",
        description: "Please select a course",
        variant: "destructive",
      })
      return false
    }

    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Topic is required",
        variant: "destructive",
      })
      return false
    }

    // Check if all questions and options are filled
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        toast({
          title: "Error",
          description: `Question ${i + 1} is empty`,
          variant: "destructive",
        })
        return false
      }

      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) {
          toast({
            title: "Error",
            description: `Option ${j + 1} for Question ${i + 1} is empty`,
            variant: "destructive",
          })
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Get the selected course details
      const selectedCourse = courses.find(c => c.id === selectedCourseId)
      if (!selectedCourse) {
        throw new Error("Selected course not found")
      }

      // Use the actual courseID (not Firestore document ID) as the path
      const actualCourseID = selectedCourse.courseID.toString()
      
      console.log("🔍 Admin: Creating quiz with data:", {
        selectedCourse,
        actualCourseID,
        topic,
        path: `quizzes/${actualCourseID}/topics/${topic}`
      });
      
      // Check if a quiz with this topic already exists for this course
      const existingQuizRef = doc(db, "quizzes", actualCourseID, "topics", topic)
      const existingQuiz = await getDoc(existingQuizRef)
      
      if (existingQuiz.exists()) {
        toast({
          title: "Error",
          description: `An assessment with the topic "${topic}" already exists for this course. Please choose a different topic name.`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Create the assessment document in the new structure: quizzes/{courseID}/topics/{topic}
      const quizData = {
        courseId: selectedCourseId, // Keep Firestore document ID for reference
        courseID: selectedCourse.courseID, // The actual course ID (1000, etc.)
        courseName: selectedCourse.title,
        courseCode: selectedCourse.courseID, // Same as courseID
        topic,
        questions,
        createdAt: serverTimestamp(),
        status: "active",
        totalQuestions: questions.length,
        // Add metadata for better organization
        metadata: {
          createdBy: "admin", // This could be dynamic based on user
          lastModified: serverTimestamp(),
          version: "1.0"
        }
      }

      console.log("🔍 Admin: Quiz data to be saved:", quizData);

      // Store in the new path structure: quizzes/{actualCourseID}/topics/{topic}
      // Using the actual courseID (like 1000) as the document ID
      const quizDocRef = doc(db, "quizzes", actualCourseID, "topics", topic)
      await setDoc(quizDocRef, quizData)
      
      console.log("✅ Admin: Quiz saved successfully to:", `quizzes/${actualCourseID}/topics/${topic}`);

      toast({
        title: "Success",
        description: `Quiz "${topic}" uploaded successfully to ${selectedCourse.title}!`,
      })

      // Reset form
      setSelectedCourseId("")
      setTopic("")
      setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }])
    } catch (error) {
      console.error("Error uploading quiz:", error)
      toast({
        title: "Error",
        description: "Failed to upload quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Upload Quiz</h1>
          <p className="text-muted-foreground">Create new assessments for your courses</p>
        </div>
        <Link href="/admin/assessments/view">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All Assessments
          </Button>
        </Link>
      </div>
      
      <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Quiz</CardTitle>
        <p className="text-sm text-muted-foreground">
          Create assessments for specific courses. Quizzes will be organized by course and topic.
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              {coursesLoading ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <span className="text-sm text-muted-foreground">Loading courses...</span>
                </div>
              ) : (
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <SelectItem value="" disabled>
                        No active courses available
                      </SelectItem>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title} (ID: {course.courseID})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Assessment Name / Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter assessment name or topic"
                required
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Questions</h3>
            </div>

            {questions.map((question, qIndex) => (
              <div key={qIndex} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Question {qIndex + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    disabled={questions.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`question-${qIndex}`}>Question Text</Label>
                  <Input
                    id={`question-${qIndex}`}
                    value={question.question}
                    onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                    placeholder="Enter question text"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Options</Label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <Input
                        type="radio"
                        className="h-4 w-4"
                        name={`correct-${qIndex}`}
                        checked={question.correctAnswer === oIndex}
                        onChange={() => handleCorrectAnswerChange(qIndex, oIndex.toString())}
                      />
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        required
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <div className="text-xs text-slate-500">Select the radio button next to the correct answer</div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddQuestion} className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isLoading || coursesLoading || !selectedCourseId || courses.length === 0} 
            className="w-full"
          >
            {isLoading ? "Uploading..." : 
             coursesLoading ? "Loading courses..." :
             courses.length === 0 ? "No courses available" :
             !selectedCourseId ? "Select a course first" :
             "Upload Quiz"}
          </Button>
        </CardFooter>
      </form>
    </Card>
    </div>
  )
}
