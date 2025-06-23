import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { createCourseSchedule, deleteCourseSchedule, updateCourseSchedule } from "@/lib/schedule-service";
import { CourseSchedule, DayOfWeek, DeliveryMode } from "@/types/schedule";
import { useState } from "react";

const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const deliveryModes: DeliveryMode[] = ['online', 'offline'];

export function CourseSchedules() {
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Partial<CourseSchedule>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentSchedule.id) {
        await updateCourseSchedule(currentSchedule.id, currentSchedule);
        toast({
          title: "Schedule Updated",
          description: "The course schedule has been updated successfully."
        });
      } else {
        const id = await createCourseSchedule(currentSchedule as Omit<CourseSchedule, 'id'>);
        toast({
          title: "Schedule Created",
          description: "New course schedule has been created successfully."
        });
      }
      setIsEditing(false);
      setCurrentSchedule({});
      // Refresh schedules
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save the schedule. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Course Schedules</CardTitle>
            <Button onClick={() => setIsEditing(true)}>Add Schedule</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={currentSchedule.courseId}
                    onValueChange={(value) => 
                      setCurrentSchedule(prev => ({ ...prev, courseId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add course options here */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={currentSchedule.dayOfWeek}
                    onValueChange={(value: DayOfWeek) => 
                      setCurrentSchedule(prev => ({ ...prev, dayOfWeek: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={currentSchedule.startTime}
                    onChange={(e) => 
                      setCurrentSchedule(prev => ({ ...prev, startTime: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={currentSchedule.endTime}
                    onChange={(e) => 
                      setCurrentSchedule(prev => ({ ...prev, endTime: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={currentSchedule.mode}
                    onValueChange={(value: DeliveryMode) => 
                      setCurrentSchedule(prev => ({ ...prev, mode: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryModes.map(mode => (
                        <SelectItem key={mode} value={mode}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <Input
                    value={currentSchedule.location}
                    onChange={(e) => 
                      setCurrentSchedule(prev => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="Room number or link"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Instructor (Optional)</Label>
                  <Select
                    value={currentSchedule.instructorId}
                    onValueChange={(value) => 
                      setCurrentSchedule(prev => ({ ...prev, instructorId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add instructor options here */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSchedule.isRecurring}
                    onCheckedChange={(checked) => 
                      setCurrentSchedule(prev => ({ ...prev, isRecurring: checked }))
                    }
                  />
                  <Label>Recurring Schedule</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setCurrentSchedule({});
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {currentSchedule.id ? 'Update' : 'Create'} Schedule
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="py-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{schedule.courseName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {schedule.dayOfWeek.charAt(0).toUpperCase() + schedule.dayOfWeek.slice(1)} •{' '}
                      {schedule.startTime} - {schedule.endTime} • {schedule.mode}
                    </p>
                    {schedule.location && (
                      <p className="text-sm text-muted-foreground">
                        Location: {schedule.location}
                      </p>
                    )}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentSchedule(schedule);
                        setIsEditing(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this schedule?')) {
                          deleteCourseSchedule(schedule.id);
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
