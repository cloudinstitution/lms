"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatDistanceToNow } from 'date-fns'
import { User, BookOpen, FileText, AlertTriangle } from 'lucide-react'

interface Activity {
  id: string
  type: 'student_joined' | 'course_updated' | 'assessment_submitted' | 'attendance_marked' | 'other'
  description: string
  timestamp: Date
  relatedEntity?: {
    id: string
    name: string
    type: string
  }
}

interface RecentActivityProps {
  userRole?: string;
  userId?: string;
}

export default function RecentActivity({ userRole = 'admin', userId }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true)
        
        // For now, we'll provide sample data
        // In a real implementation, you would fetch this from a Firestore collection
        const sampleActivities: Activity[] = [
          {
            id: "1",
            type: "student_joined",
            description: "John Doe enrolled in Web Development Bootcamp",
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            relatedEntity: {
              id: "std1",
              name: "John Doe",
              type: "student"
            }
          },
          {
            id: "2",
            type: "course_updated",
            description: "React Fundamentals course content updated",
            timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
            relatedEntity: {
              id: "course1",
              name: "React Fundamentals",
              type: "course"
            }
          },
          {
            id: "3",
            type: "assessment_submitted",
            description: "5 students submitted JavaScript Assessment",
            timestamp: new Date(Date.now() - 1000 * 60 * 360), // 6 hours ago
            relatedEntity: {
              id: "assessment1",
              name: "JavaScript Assessment",
              type: "assessment"
            }
          },
          {
            id: "4",
            type: "attendance_marked",
            description: "Attendance recorded for Python Programming class",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            relatedEntity: {
              id: "course2",
              name: "Python Programming",
              type: "course"
            }
          },
          {
            id: "5",
            type: "other",
            description: "System maintenance scheduled for tonight",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
          }
        ]
        
        setActivities(sampleActivities)
      } catch (error) {
        console.error("Error fetching recent activity:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRecentActivity()
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'student_joined':
        return <User className="h-4 w-4 text-blue-500" />
      case 'course_updated':
        return <BookOpen className="h-4 w-4 text-green-500" />
      case 'assessment_submitted':
        return <FileText className="h-4 w-4 text-amber-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading recent activity...</div>
        ) : (
          <div className="space-y-5">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="mt-1">{getActivityIcon(activity.type)}</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
