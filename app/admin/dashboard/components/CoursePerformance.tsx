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

export default function CoursePerformance() {
  const [courses, setCourses] = useState<CoursePerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true)
        
        // In a real implementation, you would calculate metrics based on actual student data
        // For now, we're using sample data
        const sampleCourses: CoursePerformance[] = [
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
          {
            id: "course3",
            name: "Mobile App Development",
            enrollments: 32,
            completionRate: 80,
            satisfactionScore: 4.8
          },
          {
            id: "course4",
            name: "DevOps Engineering",
            enrollments: 26,
            completionRate: 58,
            satisfactionScore: 3.9
          },
          {
            id: "course5",
            name: "UI/UX Design",
            enrollments: 30,
            completionRate: 75,
            satisfactionScore: 4.6
          }
        ]
        
        setCourses(sampleCourses)
      } catch (error) {
        console.error("Error fetching course performance data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCourseData()
  }, [])

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Course Performance</CardTitle>
        <CardDescription>Enrollment and completion metrics for top courses</CardDescription>
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
