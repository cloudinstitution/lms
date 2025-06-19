"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Event {
  id: string
  title: string
  date: Date
  type: 'class' | 'assessment' | 'deadline' | 'other'
  description: string
  course?: string
}

interface UpcomingEventsProps {
  userRole?: string;
  userId?: string;
}

export default function UpcomingEvents({ userRole = 'admin', userId }: UpcomingEventsProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([])

  // Sample events - in a real app, these would come from Firestore
  const events: Event[] = [
    {
      id: "event1",
      title: "JavaScript Fundamentals",
      date: new Date(new Date().setDate(new Date().getDate() + 1)),
      type: 'class',
      description: "Introduction to JavaScript variables, data types, and functions",
      course: "Web Development"
    },
    {
      id: "event2",
      title: "React Components Quiz",
      date: new Date(new Date().setDate(new Date().getDate() + 2)),
      type: 'assessment',
      description: "30-minute assessment covering React component lifecycle and hooks",
      course: "Frontend Development"
    },
    {
      id: "event3",
      title: "Project Submission Deadline",
      date: new Date(new Date().setDate(new Date().getDate() + 3)),
      type: 'deadline',
      description: "Final submission for the e-commerce website project",
      course: "Web Development"
    },
    {
      id: "event4",
      title: "Python Data Structures",
      date: new Date(new Date().setDate(new Date().getDate() + 4)),
      type: 'class',
      description: "Deep dive into Python lists, dictionaries, sets, and tuples",
      course: "Python Programming"
    },
    {
      id: "event5",
      title: "Database Design Workshop",
      date: new Date(new Date().setDate(new Date().getDate() + 5)),
      type: 'other',
      description: "Hands-on workshop for SQL database design and optimization",
      course: "Database Management"
    },
  ]

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    )
  }

  // Check if a date has events
  const hasEvents = (date: Date) => {
    return getEventsForDate(date).length > 0
  }

  // Handle day click to show events
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      const dateEvents = getEventsForDate(date)
      setSelectedDateEvents(dateEvents)
      if (dateEvents.length > 0) {
        setIsDialogOpen(true)
      }
    }
  }

  // Render badge color based on event type
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'class':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Class</Badge>
      case 'assessment':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Assessment</Badge>
      case 'deadline':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Deadline</Badge>
      default:
        return <Badge variant="outline">Other</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Classes, assessments, and deadlines</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            modifiers={{
              hasEvents: (date) => hasEvents(date)
            }}
            modifiersStyles={{
              hasEvents: { 
                fontWeight: 'bold', 
                textDecoration: 'underline',
                color: 'var(--primary)' 
              }
            }}
          />
          
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Upcoming</h4>
            <div className="space-y-2">
              {events.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {getEventBadge(event.type)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Events for {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </DialogTitle>
            <DialogDescription>
              All scheduled events for this date
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72 mt-2">
            <div className="space-y-4 pr-4">
              {selectedDateEvents.map(event => (
                <div key={event.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{event.title}</h3>
                    {getEventBadge(event.type)}
                  </div>
                  {event.course && (
                    <p className="text-sm text-muted-foreground mb-1">Course: {event.course}</p>
                  )}
                  <p className="text-sm mt-2">{event.description}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
