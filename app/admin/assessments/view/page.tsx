"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { BookOpen, Clock, FileText, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Quiz {
  id: string
  topic: string
  questions: any[]
  courseId: string
  courseName: string
  courseCode?: number
  createdAt: any
  status: string
  totalQuestions: number
}

interface Course {
  id: string
  title: string
  courseID: number
  status: string
}

export default function ViewAssessmentsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [quizzesByCourse, setQuizzesByCourse] = useState<Record<string, Quiz[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCoursesAndQuizzes()
  }, [])

  const fetchCoursesAndQuizzes = async () => {
    try {
      setLoading(true)
      
      // Fetch all courses
      const coursesSnapshot = await getDocs(collection(db, "courses"))
      const coursesList = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Untitled Course",
        courseID: doc.data().courseID || 0,
        status: doc.data().status || "Active",
      })) as Course[]
      
      setCourses(coursesList)

      // Fetch quizzes for each course from the new structure: quizzes/{courseID}/topics/{topic}
      const allQuizzes: Record<string, Quiz[]> = {}
      
      for (const course of coursesList) {
        try {
          // Use the actual courseID (like 1000) instead of Firestore document ID
          const actualCourseID = course.courseID.toString()
          
          // Get all documents in the course's topics subcollection
          const quizzesSnapshot = await getDocs(collection(db, "quizzes", actualCourseID, "topics"))
          const courseQuizzes = quizzesSnapshot.docs.map((doc) => ({
            id: doc.id, // This will be the topic name
            ...doc.data(),
            totalQuestions: doc.data().questions?.length || 0
          })) as Quiz[]
          
          if (courseQuizzes.length > 0) {
            // Use courseID as key for easier mapping
            allQuizzes[course.courseID.toString()] = courseQuizzes
          }
        } catch (error) {
          console.warn(`No quizzes found for course ${course.title} (ID: ${course.courseID}):`, error)
        }
      }
      
      setQuizzesByCourse(allQuizzes)
    } catch (err) {
      console.error("Error fetching courses and quizzes:", err)
      setError("Failed to load assessments")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const getTotalQuizzes = () => {
    return Object.values(quizzesByCourse).reduce((total, quizzes) => total + quizzes.length, 0)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">View Assessments</h1>
          <p className="text-muted-foreground">
            Browse assessments organized by courses ({getTotalQuizzes()} total assessments)
          </p>
        </div>
        <Link href="/admin/assessments">
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Create New Assessment
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalQuizzes()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses with Assessments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(quizzesByCourse).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Courses and their Assessments */}
      <div className="space-y-6">
        {courses.map((course) => {
          const courseQuizzes = quizzesByCourse[course.courseID.toString()] || []
          
          return (
            <Card key={course.id} className="w-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {course.title}
                      <Badge variant="secondary">ID: {course.courseID}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {courseQuizzes.length} assessment{courseQuizzes.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  <Badge variant={course.status === 'Active' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                </div>
              </CardHeader>
              
              {courseQuizzes.length > 0 ? (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courseQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">{quiz.topic}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {quiz.totalQuestions} questions
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(quiz.createdAt)}
                              </span>
                            </div>
                            <Badge 
                              variant={quiz.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {quiz.status || 'active'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No assessments found for this course</p>
                    <Link href="/admin/assessments">
                      <Button variant="outline" size="sm" className="mt-2">
                        Create First Assessment
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {courses.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
            <p className="text-muted-foreground mb-4">
              You need to create courses before you can add assessments.
            </p>
            <Link href="/admin/courses">
              <Button>
                Create Your First Course
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
