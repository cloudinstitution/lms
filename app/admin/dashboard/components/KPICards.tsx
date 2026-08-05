"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Users, BookOpen, GraduationCap, Calendar } from "lucide-react"

interface KPICardsProps {
  userRole?: string;
  userId?: string;
}

export default function KPICards({ userRole = 'admin', userId }: KPICardsProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    completionRate: 0,
    attendanceRate: 0,
  })
  
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        
        let studentsSnapshot, coursesSnapshot;
        
        if (userRole === 'admin') {
          // Admin can see all students and courses
          studentsSnapshot = await getDocs(collection(db, "students"));
          coursesSnapshot = await getDocs(
            query(collection(db, "courses"), where("status", "==", "Active"))
          );
        } else {
          // Teacher can only see assigned students and courses
          if (userId) {
            // Get teacher's assigned courses
            const teacherData = await getDocs(
              query(collection(db, "admin"), where("id", "==", userId))
            );
            
            const assignedCourses = teacherData.docs[0]?.data()?.assignedCourses || [];
            
            // Get students enrolled in teacher's courses
            studentsSnapshot = await getDocs(
              query(collection(db, "students"), where("coursesEnrolled", "array-contains-any", assignedCourses))
            );
            
            // Get teacher's active courses
            coursesSnapshot = await getDocs(
              query(
                collection(db, "courses"), 
                where("status", "==", "Active"),
                where("teacherId", "==", userId)
              )
            );
          } else {
            // Fallback if no userId provided
            studentsSnapshot = { size: 0 };
            coursesSnapshot = { size: 0 };
          }
        }
        
        const totalStudents = studentsSnapshot.size;
        const activeCourses = coursesSnapshot.size;
        
        // For demonstration purposes, we're using placeholder data for these metrics
        // In a real implementation, you would calculate these from actual data
        const completionRate = 78 // placeholder - would calculate from assessments
        const attendanceRate = 85 // placeholder - would calculate from attendance records
        
        setStats({
          totalStudents,
          activeCourses,
          completionRate,
          attendanceRate
        })
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.totalStudents}</div>
          <p className="text-xs text-muted-foreground">Enrolled in all courses</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : stats.activeCourses}</div>
          <p className="text-xs text-muted-foreground">Currently running</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : `${stats.completionRate}%`}</div>
          <p className="text-xs text-muted-foreground">Across all assessments</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : `${stats.attendanceRate}%`}</div>
          <p className="text-xs text-muted-foreground">Average class attendance</p>
        </CardContent>
      </Card>
    </div>
  )
}
