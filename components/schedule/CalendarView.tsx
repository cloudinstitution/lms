import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CourseSchedule, HolidayEvent, ScheduleViewFilters } from "@/types/schedule";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

interface CalendarViewProps {
  schedules?: CourseSchedule[];
  holidays?: HolidayEvent[];
}

export function CalendarView({ schedules = [], holidays = [] }: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [filters, setFilters] = useState<ScheduleViewFilters>({});

  // Filter events based on selected filters
  const filteredEvents = [...schedules, ...holidays].filter((event): event is CourseSchedule | HolidayEvent => {
    if (filters.courses && 'courseId' in event) {
      if (!filters.courses.includes(event.courseId)) return false;
    }
    if (filters.eventTypes && 'type' in event) {
      if (!filters.eventTypes.includes(event.type)) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={filters.eventTypes?.[0]}
                onValueChange={(value: any) => 
                  setFilters(prev => ({ ...prev, eventTypes: [value] }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Event Type" />
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
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="mt-6">
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {/* Calendar header - days of week */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="bg-background px-3 py-2 text-sm font-medium text-center"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: 35 }).map((_, i) => {
              const currentDate = addDays(new Date(), i - new Date().getDay());
              const dayEvents = filteredEvents.filter(event => {
                // Add date matching logic here
                return true;
              });

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[120px] p-2 bg-background",
                    "hover:bg-muted/50 relative"
                  )}
                >
                  <time
                    dateTime={format(currentDate, "yyyy-MM-dd")}
                    className="text-sm"
                  >
                    {format(currentDate, "d")}
                  </time>
                  
                  {/* Events for this day */}
                  <div className="space-y-1 mt-1">
                    {dayEvents.map((event) => {
                      const isSchedule = 'courseId' in event;
                      return (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded"
                          style={{
                            backgroundColor: event.color || '#e2e8f0',
                            color: '#1a202c'
                          }}
                        >
                          {isSchedule ? (event as CourseSchedule).courseName : (event as HolidayEvent).title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
