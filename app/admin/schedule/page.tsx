"use client"

import { CalendarView } from "@/components/schedule/CalendarView"
import { CourseSchedules } from "@/components/schedule/CourseSchedules"
import { HolidaysEvents } from "@/components/schedule/HolidaysEvents"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { getAllScheduleEvents } from "@/lib/schedule-service"
import { getAdminSession } from "@/lib/session-storage"
import { CourseSchedule, HolidayEvent } from "@/types/schedule"
import { Calendar, CalendarDays, Clock, Users } from "lucide-react"
import { useEffect, useState } from "react"

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<CourseSchedule[]>([])
  const [holidays, setHolidays] = useState<HolidayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("calendar")

  // Get user authentication data and claims
  const { user, userClaims } = useAuth()
  const adminData = getAdminSession()
  
  // Determine if user is teacher
  const isTeacher = userClaims?.role === 'teacher' || adminData?.role === 'teacher'
  useEffect(() => {
    fetchAllEvents()
  }, [user, userClaims])
  
  const fetchAllEvents = async () => {
    setLoading(true)
    try {
      const events = await getAllScheduleEvents(userClaims?.role, user?.uid)
      
      // Separate schedules and holidays
      const courseSchedules = events.filter((event): event is CourseSchedule => 'courseId' in event)
      const holidayEvents = events.filter((event): event is HolidayEvent => 'type' in event)
      
      setSchedules(courseSchedules)
      setHolidays(holidayEvents)
    } catch (error) {
      console.error("Error fetching schedules and events:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const totalEvents = schedules.length + holidays.length
  const recurringSchedules = schedules.filter(s => s.isRecurring).length
  const upcomingEvents = holidays.filter(h => new Date(h.startDate) > new Date()).length

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading schedule data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isTeacher ? "My Schedule Management" : "Schedule Management"}
        </h1>
        <p className="text-muted-foreground">
          {isTeacher 
            ? "Manage your course schedules and view institutional events" 
            : "Manage course schedules, holidays, and institutional events"
          }
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Schedules and events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Schedules</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
            <p className="text-xs text-muted-foreground">
              {recurringSchedules} recurring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events & Holidays</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidays.length}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingEvents} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">Active</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Global Calendar View
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Course Schedules
            {schedules.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {schedules.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Holidays & Events
            {holidays.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {holidays.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <CalendarView 
            schedules={schedules}
            holidays={holidays}
          />
        </TabsContent>
        
        <TabsContent value="courses" className="mt-6">
          {isTeacher ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Teacher Access</CardTitle>
                <CardDescription>
                  As a teacher, you can add course-specific events and milestones for your assigned courses.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          <CourseSchedules />
        </TabsContent>
        
        <TabsContent value="holidays" className="mt-6">
          {isTeacher ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">View Only</CardTitle>
                <CardDescription>
                  Holidays and institutional events are managed by administrators. Contact admin to add new events.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          <HolidaysEvents />
        </TabsContent>
      </Tabs>
    </div>
  )
}
