"use client"

import { CalendarView } from "@/components/schedule/CalendarView"
import { CourseSchedules } from "@/components/schedule/CourseSchedules"
import { HolidaysEvents } from "@/components/schedule/HolidaysEvents"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllScheduleEvents } from "@/lib/schedule-service"
import { getAdminSession } from "@/lib/session-storage"
import { CourseSchedule, HolidayEvent } from "@/types/schedule"
import { useEffect, useState } from "react"

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<(CourseSchedule | HolidayEvent)[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = getAdminSession()
    if (!data) return

    const fetchAllEvents = async () => {
      setLoading(true)
      try {
        const events = await getAllScheduleEvents()
        setSchedules(events)
      } catch (error) {
        console.error("Error fetching schedules and events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllEvents()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading schedules...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Schedule Management</h1>
      
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Global Calendar View</TabsTrigger>
          <TabsTrigger value="courses">Course Schedules</TabsTrigger>
          <TabsTrigger value="holidays">Holidays & Events</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <CalendarView 
            schedules={schedules.filter((event): event is CourseSchedule => 'courseId' in event)}
            holidays={schedules.filter((event): event is HolidayEvent => 'type' in event)}
          />
        </TabsContent>
        
        <TabsContent value="courses">
          <CourseSchedules />
        </TabsContent>
        
        <TabsContent value="holidays">
          <HolidaysEvents />
        </TabsContent>
      </Tabs>
    </div>
  )
}
