"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CourseSchedule, HolidayEvent, ScheduleViewFilters, CalendarEvent, EVENT_COLORS } from "@/types/schedule";
import { Calendar as BigCalendar, momentLocalizer, Views, View } from "react-big-calendar";
import moment from "moment";
import { useState, useMemo, useEffect } from "react";
import { CalendarIcon, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  schedules?: CourseSchedule[];
  holidays?: HolidayEvent[];
}

export function CalendarView({ schedules = [], holidays = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [filters, setFilters] = useState<ScheduleViewFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure theme is applied after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Force theme detection
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  // Helper function to convert day of week string to number
  const getDayOfWeekNumber = (dayOfWeek: string): number => {
    const days = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    return days[dayOfWeek as keyof typeof days] || 0;
  };

  // Debug logging
  console.log('CalendarView props:', { 
    schedulesCount: schedules.length, 
    holidaysCount: holidays.length,
    schedules: schedules,
    holidays: holidays
  });  // Convert schedules and holidays to calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    console.log('Processing schedules:', schedules.length);
    console.log('Processing holidays:', holidays.length);    // Add a test event to verify calendar is working
    if (schedules.length === 0 && holidays.length === 0) {
      const testEvent = {
        id: 'test-event',
        title: 'Test Event - Click Add Schedule to create real schedules',
        start: moment('2025-06-25 10:00', 'YYYY-MM-DD HH:mm').toDate(), // June 25, 2025 at 10:00 AM
        end: moment('2025-06-25 11:00', 'YYYY-MM-DD HH:mm').toDate(),   // June 25, 2025 at 11:00 AM
        resource: undefined,
        color: EVENT_COLORS.default,
        type: 'schedule' as const
      };
      console.log('Added test event:', {
        ...testEvent,
        startFormatted: moment(testEvent.start).format('YYYY-MM-DD HH:mm'),
        endFormatted: moment(testEvent.end).format('YYYY-MM-DD HH:mm')
      });
      events.push(testEvent);
    }

    // Process course schedules
    schedules.forEach((schedule) => {
      console.log('Processing schedule:', schedule);
        if (schedule.specificDate) {
        // One-time event
        const startTime = moment(`${schedule.specificDate} ${schedule.startTime}`, 'YYYY-MM-DD HH:mm').toDate();
        const endTime = moment(`${schedule.specificDate} ${schedule.endTime}`, 'YYYY-MM-DD HH:mm').toDate();
        
        const event = {
          id: schedule.id,
          title: schedule.title || schedule.courseName,
          start: startTime,
          end: endTime,
          resource: schedule,
          color: schedule.color || EVENT_COLORS.default,
          type: 'schedule' as const
        };
        
        console.log('Added one-time event:', {
          ...event,
          startFormatted: moment(event.start).format('YYYY-MM-DD HH:mm'),
          endFormatted: moment(event.end).format('YYYY-MM-DD HH:mm')
        });
        events.push(event);
      } else if (schedule.isRecurring && schedule.startDate && schedule.endDate && schedule.dayOfWeek) {
        // Recurring events - only process if dayOfWeek is defined
        const startDate = moment(schedule.startDate);
        const endDate = moment(schedule.endDate);
        const dayOfWeek = getDayOfWeekNumber(schedule.dayOfWeek);
        
        console.log('Processing recurring schedule:', {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          dayOfWeek: schedule.dayOfWeek,
          dayNumber: dayOfWeek
        });
          // Generate recurring events
        let current = startDate.clone();
        while (current.isSameOrBefore(endDate)) {
          if (current.day() === dayOfWeek) {
            const eventStart = current.clone();
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
            
            eventStart.hour(startHour).minute(startMinute).second(0).millisecond(0);
            const eventEnd = eventStart.clone().hour(endHour).minute(endMinute).second(0).millisecond(0);
            
            // Check for exceptions
            const isExcepted = schedule.exceptions?.some(exc => 
              moment(exc.date).isSame(current, 'day')
            );
            
            if (!isExcepted) {
              const event = {
                id: `${schedule.id}-${current.format('YYYY-MM-DD')}`,
                title: schedule.title || schedule.courseName,
                start: eventStart.toDate(),
                end: eventEnd.toDate(),
                resource: schedule,
                color: schedule.color || EVENT_COLORS.default,
                type: 'schedule' as const
              };
              
              console.log('Added recurring event:', {
                ...event,
                startFormatted: moment(event.start).format('YYYY-MM-DD HH:mm'),
                endFormatted: moment(event.end).format('YYYY-MM-DD HH:mm')
              });
              events.push(event);
            }
          }
          current.add(1, 'day');
        }
      } else {
        console.log('Schedule skipped - missing required fields:', {
          isRecurring: schedule.isRecurring,
          hasStartDate: !!schedule.startDate,
          hasEndDate: !!schedule.endDate,
          hasDayOfWeek: !!schedule.dayOfWeek,
          hasSpecificDate: !!schedule.specificDate
        });
      }
    });// Process holidays and events
    holidays.forEach((holiday) => {
      const start = new Date(holiday.startDate);
      const end = new Date(holiday.endDate);
      
      const event = {
        id: holiday.id,
        title: holiday.title,
        start,
        end,
        allDay: holiday.allDay !== false,
        resource: holiday,
        color: holiday.color || EVENT_COLORS[holiday.type] || EVENT_COLORS.default,
        type: 'holiday' as const
      };
      
      console.log('Added holiday event:', event);
      events.push(event);
    });

    console.log('Total events created:', events.length);
    return events;
  }, [schedules, holidays]);

  // Filter events based on active filters
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      if (filters.courses && event.type === 'schedule') {
        const schedule = event.resource as CourseSchedule;
        if (!filters.courses.includes(schedule.courseId)) return false;
      }
      
      if (filters.eventTypes && event.type === 'holiday') {
        const holiday = event.resource as HolidayEvent;
        if (!filters.eventTypes.includes(holiday.type)) return false;
      }

      if (filters.dateRange) {
        const eventStart = moment(event.start);
        const filterStart = moment(filters.dateRange.start);
        const filterEnd = moment(filters.dateRange.end);
        
        if (!eventStart.isBetween(filterStart, filterEnd, 'day', '[]')) {
          return false;
        }
      }

      return true;
    });
  }, [calendarEvents, filters]);

  // Get unique courses for filter dropdown
  const availableCourses = useMemo(() => {
    const courseMap = new Map();
    schedules.forEach(schedule => {
      courseMap.set(schedule.courseId, schedule.courseName);
    });
    return Array.from(courseMap.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  // Handle event click to switch to agenda view and highlight the event
  const handleEventClick = (event: CalendarEvent) => {
    setCurrentView(Views.AGENDA);
    // Use moment to ensure correct date handling without timezone issues
    const eventDate = moment(event.start).toDate();
    setCurrentDate(eventDate);
    setHighlightedEventId(event.id);
    
    console.log('Event clicked:', {
      eventId: event.id,
      eventStart: event.start,
      eventDate: eventDate,
      formattedDate: moment(eventDate).format('YYYY-MM-DD')
    });
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlightedEventId(null);
    }, 3000);
  };const eventStyleGetter = (event: CalendarEvent) => {
    const isHighlighted = highlightedEventId === event.id;
    
    return {
      style: {
        backgroundColor: event.color || EVENT_COLORS.default,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: isHighlighted ? '2px solid #fff' : '0px',
        display: 'block',
        zIndex: isHighlighted ? 20 : 10,
        position: 'relative' as const,
        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s ease',
        boxShadow: isHighlighted ? '0 4px 12px rgba(0, 0, 0, 0.3)' : undefined
      }
    };
  };// Custom Event Component with tooltip
  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const isHighlighted = highlightedEventId === event.id;
    
    const formatEventDetails = (event: CalendarEvent) => {
      if (event.type === 'schedule' && event.resource) {
        const schedule = event.resource as CourseSchedule;
        return {
          title: event.title,
          time: `${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}`,
          details: [
            schedule.location && `Location: ${schedule.location}`,
            schedule.instructorName && `Instructor: ${schedule.instructorName}`,
            schedule.mode && `Mode: ${schedule.mode.charAt(0).toUpperCase() + schedule.mode.slice(1)}`,
            schedule.isGlobal ? 'Global Schedule' : 'Teacher Schedule'
          ].filter(Boolean)
        };
      } else if (event.type === 'holiday' && event.resource) {
        const holiday = event.resource as HolidayEvent;
        return {
          title: event.title,
          time: event.allDay ? 'All Day' : `${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}`,
          details: [
            holiday.description && `Description: ${holiday.description}`,
            holiday.location && `Location: ${holiday.location}`,
            `Type: ${holiday.type.charAt(0).toUpperCase() + holiday.type.slice(1)}`
          ].filter(Boolean)
        };      } else {
        // Test event or events without resource
        return {
          title: event.title,
          time: `${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}`,
          details: ['Click "Add Schedule" to create real events']
        };
      }
    };

    const eventDetails = formatEventDetails(event);

    return (
      <div 
        className={`rbc-event-content cursor-pointer ${isHighlighted ? 'animate-pulse' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleEventClick(event);
        }}
      >
        <div className="rbc-event-tooltip">
          <div className="font-semibold">{eventDetails.title}</div>
          <div className="text-xs opacity-90 mb-1">{eventDetails.time}</div>
          {eventDetails.details.map((detail, index) => (
            <div key={index} className="text-xs opacity-80">{detail}</div>
          ))}
          <div className="text-xs opacity-60 mt-1 border-t pt-1">
            Click to view in agenda
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-xs truncate">{event.title}</span>
          <span className="text-xs opacity-75">{moment(event.start).format('HH:mm')}</span>
        </div>
      </div>    );
  };

  // Custom Agenda Event Component with highlighting
  const CustomAgendaEvent = ({ event }: { event: CalendarEvent }) => {
    const isHighlighted = highlightedEventId === event.id;
    
    return (
      <div className={`flex items-center p-2 rounded ${isHighlighted ? 'bg-primary/20 border-2 border-primary animate-pulse' : ''}`}>
        <div 
          className="w-3 h-3 rounded-full mr-3" 
          style={{ backgroundColor: event.color || EVENT_COLORS.default }}
        />
        <div className="flex-1">
          <div className="font-medium">{event.title}</div>
          <div className="text-sm text-muted-foreground">
            {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
          </div>
          {event.resource && (
            <div className="text-xs text-muted-foreground mt-1">
              {event.type === 'schedule' && (event.resource as CourseSchedule).location && 
                `Location: ${(event.resource as CourseSchedule).location}`
              }
              {event.type === 'schedule' && (event.resource as CourseSchedule).instructorName && 
                ` • Instructor: ${(event.resource as CourseSchedule).instructorName}`
              }
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const CustomToolbar = ({ date, view, onNavigate, onView }: any) => {
    return (
      <div className="flex items-center justify-between mb-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('PREV')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('TODAY')}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('NEXT')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold text-foreground">
          {moment(date).format('MMMM YYYY')}
        </h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={view === Views.MONTH ? "default" : "outline"}
            size="sm"
            onClick={() => onView(Views.MONTH)}
          >
            Month
          </Button>
          <Button
            variant={view === Views.WEEK ? "default" : "outline"}
            size="sm"
            onClick={() => onView(Views.WEEK)}
          >
            Week
          </Button>
          <Button
            variant={view === Views.DAY ? "default" : "outline"}
            size="sm"
            onClick={() => onView(Views.DAY)}
          >
            Day
          </Button>
          <Button
            variant={view === Views.AGENDA ? "default" : "outline"}
            size="sm"
            onClick={() => onView(Views.AGENDA)}
          >
            Agenda
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Schedule Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(filters.courses?.length || filters.eventTypes?.length) && (
                    <Badge variant="secondary" className="ml-2">
                      {(filters.courses?.length || 0) + (filters.eventTypes?.length || 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Filter by Course</h4>
                    <Select
                      value={filters.courses?.[0] || "all"}
                      onValueChange={(value) => 
                        setFilters(prev => ({ 
                          ...prev, 
                          courses: value === "all" ? undefined : [value] 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {availableCourses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Filter by Event Type</h4>
                    <Select
                      value={filters.eventTypes?.[0] || "all"}
                      onValueChange={(value) => 
                        setFilters(prev => ({ 
                          ...prev, 
                          eventTypes: value === "all" ? undefined : [value as any] 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Events" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="holiday">Holidays</SelectItem>
                        <SelectItem value="exam">Exams</SelectItem>
                        <SelectItem value="event">Events</SelectItem>
                        <SelectItem value="break">Breaks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setFilters({})}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>      <CardContent>
        <div 
          className={cn(
            "calendar-container h-[600px] bg-background text-foreground",
            isDark && "dark"
          )}
          data-theme={isDark ? 'dark' : 'light'}
        >
          <BigCalendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
              event: CustomEvent,
              agenda: {
                event: CustomAgendaEvent
              }
            }}
            popup
            showMultiDayTimes
            step={30}
            timeslots={2}
          />
        </div>        
        {/* Legend */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
          <h4 className="font-medium mb-2 text-foreground">Legend</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border border-border" 
                style={{ backgroundColor: EVENT_COLORS.default }}
              />
              <span className="text-sm text-foreground">Course Schedule</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border border-border" 
                style={{ backgroundColor: EVENT_COLORS.holiday }}
              />
              <span className="text-sm text-foreground">Holidays</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border border-border" 
                style={{ backgroundColor: EVENT_COLORS.exam }}
              />
              <span className="text-sm text-foreground">Exams</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border border-border" 
                style={{ backgroundColor: EVENT_COLORS.event }}
              />
              <span className="text-sm text-foreground">Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border border-border" 
                style={{ backgroundColor: EVENT_COLORS.break }}
              />
              <span className="text-sm text-foreground">Breaks</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
