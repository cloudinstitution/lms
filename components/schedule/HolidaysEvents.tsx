import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createHolidayEvent, deleteHolidayEvent, updateHolidayEvent } from "@/lib/schedule-service";
import { EVENT_COLORS, EventType, HolidayEvent } from "@/types/schedule";
import { format } from "date-fns";
import { useState } from "react";

const eventTypes: EventType[] = ['holiday', 'exam', 'event', 'break'];

export function HolidaysEvents() {
  const [events, setEvents] = useState<HolidayEvent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<HolidayEvent>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentEvent.id) {
        await updateHolidayEvent(currentEvent.id, currentEvent);
        toast({
          title: "Event Updated",
          description: "The event has been updated successfully."
        });
      } else {
        const id = await createHolidayEvent(currentEvent as Omit<HolidayEvent, 'id'>);
        toast({
          title: "Event Created",
          description: "New event has been created successfully."
        });
      }
      setIsEditing(false);
      setCurrentEvent({});
      // Refresh events
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save the event. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Holidays & Events</CardTitle>
            <Button onClick={() => setIsEditing(true)}>Add Event</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={currentEvent.title}
                    onChange={(e) => 
                      setCurrentEvent(prev => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Event title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
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
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={currentEvent.startDate}
                    onChange={(e) => 
                      setCurrentEvent(prev => ({ ...prev, startDate: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={currentEvent.endDate}
                    onChange={(e) => 
                      setCurrentEvent(prev => ({ ...prev, endDate: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={currentEvent.description}
                    onChange={(e) => 
                      setCurrentEvent(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Add any additional details about the event"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setCurrentEvent({});
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {currentEvent.id ? 'Update' : 'Create'} Event
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="py-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.startDate), 'PP')} - {format(new Date(event.endDate), 'PP')}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentEvent(event);
                        setIsEditing(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this event?')) {
                          deleteHolidayEvent(event.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
