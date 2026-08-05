"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { createHolidayEvent, deleteHolidayEvent, updateHolidayEvent, getHolidaysAndEvents } from "@/lib/schedule-service";
import { EVENT_COLORS, EventType, HolidayEvent } from "@/types/schedule";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { CalendarIcon, Plus, Edit, Trash2, Calendar as CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const eventTypes: EventType[] = ['holiday', 'exam', 'event', 'break'];

const eventTypeLabels = {
  holiday: 'Holiday',
  exam: 'Exam',
  event: 'Event',
  break: 'Break'
};

export function HolidaysEvents() {
  const [events, setEvents] = useState<HolidayEvent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<HolidayEvent>>({
    allDay: true,
    type: 'holiday'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getHolidaysAndEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validation
      if (!currentEvent.title || !currentEvent.startDate || !currentEvent.endDate || !currentEvent.type) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Ensure end date is not before start date
      if (new Date(currentEvent.endDate) < new Date(currentEvent.startDate)) {
        toast.error("End date cannot be before start date");
        return;
      }

      const eventData = {
        ...currentEvent,
        color: currentEvent.color || EVENT_COLORS[currentEvent.type] || EVENT_COLORS.default
      };

      if (currentEvent.id) {
        await updateHolidayEvent(currentEvent.id, eventData);
        toast.success("Event updated successfully");
      } else {
        await createHolidayEvent(eventData as Omit<HolidayEvent, 'id'>);
        toast.success("Event created successfully");
      }
      
      setIsEditing(false);
      setCurrentEvent({ allDay: true, type: 'holiday' });
      fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    }
  };

  const handleDelete = async (event: HolidayEvent) => {
    if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
      try {
        await deleteHolidayEvent(event.id);
        toast.success("Event deleted successfully");
        fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event");
      }
    }
  };

  const resetForm = () => {
    setCurrentEvent({ allDay: true, type: 'holiday' });
    setIsEditing(false);
  };

  // Group events by type for better organization
  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = [];
    }
    acc[event.type].push(event);
    return acc;
  }, {} as Record<EventType, HolidayEvent[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Holidays & Events</CardTitle>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title*</Label>
                    <Input
                      id="title"
                      value={currentEvent.title || ""}
                      onChange={(e) => 
                        setCurrentEvent(prev => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Enter event title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Event Type*</Label>
                    <Select
                      value={currentEvent.type}
                      onValueChange={(value: EventType) => 
                        setCurrentEvent(prev => ({
                          ...prev,
                          type: value,
                          color: EVENT_COLORS[value]
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: EVENT_COLORS[type] }}
                              />
                              {eventTypeLabels[type]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !currentEvent.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentEvent.startDate ? format(new Date(currentEvent.startDate), "PPP") : "Start Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">                        <Calendar
                          mode="single"
                          selected={currentEvent.startDate ? new Date(currentEvent.startDate) : undefined}
                          onSelect={(date) => 
                            setCurrentEvent(prev => ({ 
                              ...prev, 
                              startDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                            }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !currentEvent.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentEvent.endDate ? format(new Date(currentEvent.endDate), "PPP") : "End Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">                        <Calendar
                          mode="single"
                          selected={currentEvent.endDate ? new Date(currentEvent.endDate) : undefined}
                          onSelect={(date) => 
                            setCurrentEvent(prev => ({ 
                              ...prev, 
                              endDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                            }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* All Day Toggle */}
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Switch
                    checked={currentEvent.allDay !== false}
                    onCheckedChange={(checked) => 
                      setCurrentEvent(prev => ({ ...prev, allDay: checked }))
                    }
                  />
                  <Label>All Day Event</Label>
                  <span className="text-sm text-muted-foreground">
                    {currentEvent.allDay !== false ? "Event spans entire day(s)" : "Event has specific times"}
                  </span>
                </div>

                {/* Optional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location (Optional)</Label>
                    <Input
                      value={currentEvent.location || ""}
                      onChange={(e) => 
                        setCurrentEvent(prev => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Event location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Color (Optional)</Label>
                    <Input
                      type="color"
                      value={currentEvent.color || EVENT_COLORS[currentEvent.type || 'holiday']}
                      onChange={(e) => 
                        setCurrentEvent(prev => ({ ...prev, color: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={currentEvent.description || ""}
                    onChange={(e) => 
                      setCurrentEvent(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Add any additional details about the event"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {currentEvent.id ? 'Update' : 'Create'} Event
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events created yet.</p>
                  <p className="text-sm">Click "Add Event" to create your first event.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {eventTypes.map(type => {
                    const typeEvents = groupedEvents[type] || [];
                    if (typeEvents.length === 0) return null;

                    return (
                      <div key={type}>
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: EVENT_COLORS[type] }}
                          />
                          <h3 className="font-medium text-lg">{eventTypeLabels[type]}s</h3>
                          <Badge variant="secondary">{typeEvents.length}</Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {typeEvents.map((event) => (
                            <div
                              key={event.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{event.title}</h4>
                                    {event.allDay !== false && (
                                      <Badge variant="outline" className="text-xs">All Day</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>
                                      {event.startDate === event.endDate ? 
                                        format(new Date(event.startDate), 'PPP') :
                                        `${format(new Date(event.startDate), 'PPP')} - ${format(new Date(event.endDate), 'PPP')}`
                                      }
                                    </p>
                                    
                                    {event.location && (
                                      <p>Location: {event.location}</p>
                                    )}
                                    
                                    {event.description && (
                                      <p className="mt-2">{event.description}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentEvent(event);
                                      setIsEditing(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(event)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
