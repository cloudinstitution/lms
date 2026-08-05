"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Progress } from "@/components/ui/progress"

interface CoursePerformance {
  id: string
  name: string
  enrollments: number
  completionRate: number
  satisfactionScore: number
}

interface CoursePerformanceProps {
  userRole?: string;
  userId?: string;
}

export default function CoursePerformance({ userRole = 'admin', userId }: CoursePerformanceProps) {
  const [courses, setCourses] = useState<CoursePerformance[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true)
        
        let coursesToShow: CoursePerformance[] = [];
        
        if (userRole === 'admin') {
          // Admins see all courses
          const coursesRef = collection(db, "courses");
          try {
            const coursesSnapshot = await getDocs(coursesRef);
            // In a real app, we would process actual course data here
            // For now, we'll use sample data
            coursesToShow = [
              {
                id: "course1",
                name: "Web Development Bootcamp",
                enrollments: 45,
                completionRate: 72,
                satisfactionScore: 4.5
              },
              {
                id: "course2",
                name: "Data Science Fundamentals",
                enrollments: 38,
                completionRate: 65,
                satisfactionScore: 4.2
              },
            ];
          } catch (error) {
            console.error("Error fetching courses:", error);
          }
        } else if (userRole === 'teacher' && userId) {            // Teachers only see their assigned courses
          try {
            // In a real app, fetch teacher's courses from Firestore
            // For now, use filtered sample data
            coursesToShow = [
              {
                id: "course2",
                name: "Data Science Fundamentals",
                enrollments: 38,
                completionRate: 65,
                satisfactionScore: 4.2
              },
              {
                id: "course3",
                name: "Mobile App Development",
                enrollments: 32,
                completionRate: 80,
                satisfactionScore: 4.8
              }
            ];
          } catch (error) {
            console.error("Error fetching teacher courses:", error);
          }
        }
        
        setCourses(coursesToShow)
      } catch (error) {
        console.error("Error fetching course performance data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCourseData()
  }, [userRole, userId])

  return (
    <Card className="col-span-full">      
    <CardHeader>
        <CardTitle>
          {userRole === 'teacher' ? 'My Courses Performance' : 'Course Performance'}
        </CardTitle>
        <CardDescription>
          {userRole === 'teacher' 
            ? 'Enrollment and completion metrics for your assigned courses' 
            : 'Enrollment and completion metrics for all courses'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading course data...</div>
        ) : (
          <div className="space-y-6">
            {courses.map(course => (
              <div key={course.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{course.name}</span>
                  <span className="text-sm text-muted-foreground">{course.enrollments} students</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Completion rate</span>
                    <span className="font-medium">{course.completionRate}%</span>
                  </div>
                  <Progress value={course.completionRate} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span>Satisfaction score</span>
                  <div className="flex items-center">
                    <span className="font-medium">{course.satisfactionScore}</span>
                    <span className="text-muted-foreground">/5</span>
                    <div className="ml-2 flex">
                      {[...Array(Math.round(course.satisfactionScore))].map((_, i) => (
                        <svg key={i} className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
