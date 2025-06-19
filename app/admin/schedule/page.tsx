"use client"

import { useEffect, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getAdminSession } from "@/lib/session-storage"

export default function SchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [adminData, setAdminData] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const data = getAdminSession()
    if (!data) return

    setAdminData(data)
    fetchSchedules(data)
  }, [])

  const fetchSchedules = async (userData: any) => {
    setLoading(true)
    try {
      let scheduleQuery;

      // Different query based on role
      if (userData.role === 'admin') {
        // Admin can see all schedules
        scheduleQuery = query(collection(db, "schedules"))
      } else {
        // Teacher can see only their assigned schedules
        scheduleQuery = query(
          collection(db, "schedules"), 
          where("teacherId", "==", userData.id)
        )
      }

      const schedulesSnapshot = await getDocs(scheduleQuery)
      const schedulesData = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setSchedules(schedulesData)
    } catch (error) {
      console.error("Error fetching schedules:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">
          View and manage your teaching schedule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view scheduled classes</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {date ? date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'No Date Selected'}
            </CardTitle>
            <CardDescription>Classes scheduled for this day</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-6">Loading schedules...</div>
            ) : schedules.length > 0 ? (
              <div className="space-y-4">
                {schedules
                  .filter(schedule => {
                    // Filter schedules for selected date if we implement date filtering
                    return true;
                  })
                  .map(schedule => (
                    <div key={schedule.id} className="p-4 border rounded-md">
                      <h3 className="font-semibold">{schedule.courseName || 'Untitled Class'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                      <p className="text-sm">{schedule.location || 'No location specified'}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No classes scheduled for this day
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
