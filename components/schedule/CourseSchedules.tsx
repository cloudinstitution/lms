"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { createCourseSchedule, deleteCourseSchedule, updateCourseSchedule, getCourseSchedules } from "@/lib/schedule-service";
import { CourseSchedule, DayOfWeek, DeliveryMode } from "@/types/schedule";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { CalendarIcon, Plus, Edit, Trash2, Calendar as CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const deliveryModes: DeliveryMode[] = ['online', 'offline'];

export function CourseSchedules() {
  const { user, userClaims } = useAuth();
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Partial<CourseSchedule>>({
    isRecurring: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, [user, userClaims]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await getCourseSchedules(userClaims?.role, user?.uid);
      setSchedules(data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validation
      if (!currentSchedule.courseName || !currentSchedule.startTime || !currentSchedule.endTime || !currentSchedule.mode) {
        toast.error("Please fill in all required fields");
        return;
      }

      if (currentSchedule.isRecurring && !currentSchedule.dayOfWeek) {
        toast.error("Please select a day of week for recurring schedules");
        return;
      }

      if (!currentSchedule.isRecurring && !currentSchedule.specificDate) {
        toast.error("Please select a specific date for one-time events");
        return;
      }

      // Prepare the data for Firebase, removing undefined fields
      const scheduleData: any = {
        courseName: currentSchedule.courseName,
        startTime: currentSchedule.startTime,
        endTime: currentSchedule.endTime,
        mode: currentSchedule.mode,
        isRecurring: currentSchedule.isRecurring || false,
        courseId: currentSchedule.courseId || `course_${Date.now()}`,
      };

      // Add optional fields only if they have values
      if (currentSchedule.title) {
        scheduleData.title = currentSchedule.title;
      }
      
      if (currentSchedule.location) {
        scheduleData.location = currentSchedule.location;
      }
      
      if (currentSchedule.instructorName) {
        scheduleData.instructorName = currentSchedule.instructorName;
      }
      
      if (currentSchedule.color) {
        scheduleData.color = currentSchedule.color;
      }

      // Add fields based on schedule type
      if (currentSchedule.isRecurring) {
        // For recurring schedules
        if (currentSchedule.dayOfWeek) {
          scheduleData.dayOfWeek = currentSchedule.dayOfWeek;
        }
        if (currentSchedule.startDate) {
          scheduleData.startDate = currentSchedule.startDate;
        }
        if (currentSchedule.endDate) {
          scheduleData.endDate = currentSchedule.endDate;
        }
      } else {
        // For one-time events
        if (currentSchedule.specificDate) {
          scheduleData.specificDate = currentSchedule.specificDate;
        }
      }      if (currentSchedule.id) {
        await updateCourseSchedule(currentSchedule.id, scheduleData);
        toast.success("Schedule updated successfully");
      } else {
        await createCourseSchedule(
          scheduleData as Omit<CourseSchedule, 'id'>, 
          userClaims?.role, 
          user?.uid
        );
        toast.success("Schedule created successfully");
      }
      
      setIsEditing(false);
      setCurrentSchedule({ isRecurring: true });
      fetchSchedules();
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    }
  };

  const handleDelete = async (schedule: CourseSchedule) => {
    if (confirm(`Are you sure you want to delete the schedule for ${schedule.courseName}?`)) {
      try {
        await deleteCourseSchedule(schedule.id);
        toast.success("Schedule deleted successfully");
        fetchSchedules();
      } catch (error) {
        console.error("Error deleting schedule:", error);
        toast.error("Failed to delete schedule");
      }
    }
  };

  const resetForm = () => {
    setCurrentSchedule({ isRecurring: true });
    setIsEditing(false);  };

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
      <Card>        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Course Schedules</CardTitle>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="courseName">Course Name*</Label>
                    <Input
                      id="courseName"
                      value={currentSchedule.courseName || ""}
                      onChange={(e) => 
                        setCurrentSchedule(prev => ({ ...prev, courseName: e.target.value }))
                      }
                      placeholder="Enter course name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title (Optional)</Label>
                    <Input
                      id="title"
                      value={currentSchedule.title || ""}
                      onChange={(e) => 
                        setCurrentSchedule(prev => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Custom title for calendar"
                    />
                  </div>
                </div>

                {/* Schedule Type Toggle */}
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Switch
                    checked={currentSchedule.isRecurring || false}
                    onCheckedChange={(checked) => 
                      setCurrentSchedule(prev => ({ 
                        ...prev, 
                        isRecurring: checked,
                        specificDate: checked ? undefined : prev.specificDate,
                        dayOfWeek: checked ? prev.dayOfWeek : undefined
                      }))
                    }
                  />
                  <Label>Recurring Schedule</Label>
                  <span className="text-sm text-muted-foreground">
                    {currentSchedule.isRecurring ? "Repeats weekly" : "One-time event"}
                  </span>
                </div>

                {/* Date Selection */}
                {currentSchedule.isRecurring ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Day of Week*</Label>
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
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !currentSchedule.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {currentSchedule.startDate ? format(new Date(currentSchedule.startDate), "PPP") : "Start Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">                          <Calendar
                            mode="single"
                            selected={currentSchedule.startDate ? new Date(currentSchedule.startDate) : undefined}
                            onSelect={(date) => 
                              setCurrentSchedule(prev => ({ 
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
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !currentSchedule.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {currentSchedule.endDate ? format(new Date(currentSchedule.endDate), "PPP") : "End Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">                          <Calendar
                            mode="single"
                            selected={currentSchedule.endDate ? new Date(currentSchedule.endDate) : undefined}
                            onSelect={(date) => 
                              setCurrentSchedule(prev => ({ 
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
                ) : (
                  <div className="space-y-2">
                    <Label>Specific Date*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !currentSchedule.specificDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentSchedule.specificDate ? format(new Date(currentSchedule.specificDate), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">                        <Calendar
                          mode="single"
                          selected={currentSchedule.specificDate ? new Date(currentSchedule.specificDate) : undefined}
                          onSelect={(date) => 
                            setCurrentSchedule(prev => ({ 
                              ...prev, 
                              specificDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                            }))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Time and Mode */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time*</Label>
                    <Input
                      type="time"
                      value={currentSchedule.startTime || ""}
                      onChange={(e) => 
                        setCurrentSchedule(prev => ({ ...prev, startTime: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time*</Label>
                    <Input
                      type="time"
                      value={currentSchedule.endTime || ""}
                      onChange={(e) => 
                        setCurrentSchedule(prev => ({ ...prev, endTime: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mode*</Label>
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
                </div>

                {/* Optional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location (Optional)</Label>
                    <Input
                      value={currentSchedule.location || ""}
                      onChange={(e) => 
                        setCurrentSchedule(prev => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Room number or meeting link"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instructor (Optional)</Label>
                    <Input
                      value={currentSchedule.instructorName || ""}
                      onChange={(e) => 
                        setCurrentSchedule(prev => ({ ...prev, instructorName: e.target.value }))
                      }
                      placeholder="Instructor name"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {currentSchedule.id ? 'Update' : 'Create'} Schedule
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No schedules created yet.</p>
                  <p className="text-sm">Click "Add Schedule" to create your first schedule.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="py-4 flex justify-between items-start"
                    >
                      <div className="flex-1">                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{schedule.title || schedule.courseName}</h3>
                          <Badge variant={schedule.isRecurring ? "default" : "secondary"}>
                            {schedule.isRecurring ? "Recurring" : "One-time"}
                          </Badge>
                          <Badge variant="outline">
                            {schedule.mode.charAt(0).toUpperCase() + schedule.mode.slice(1)}
                          </Badge>
                          {schedule.isGlobal && (
                            <Badge variant="destructive" className="text-xs">
                              Global
                            </Badge>
                          )}
                          {schedule.createdByRole === 'teacher' && (
                            <Badge variant="secondary" className="text-xs">
                              Teacher
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          {schedule.isRecurring ? (
                            <p>
                              Every {schedule.dayOfWeek?.charAt(0).toUpperCase() + schedule.dayOfWeek?.slice(1)} • {schedule.startTime} - {schedule.endTime}
                            </p>
                          ) : (
                            <p>
                              {schedule.specificDate ? format(new Date(schedule.specificDate), "PPP") : "Date not set"} • {schedule.startTime} - {schedule.endTime}
                            </p>
                          )}
                          
                          {schedule.isRecurring && schedule.startDate && schedule.endDate && (
                            <p>
                              Duration: {format(new Date(schedule.startDate), "MMM dd, yyyy")} - {format(new Date(schedule.endDate), "MMM dd, yyyy")}
                            </p>
                          )}
                          
                          {schedule.location && (
                            <p>Location: {schedule.location}</p>
                          )}
                          
                          {schedule.instructorName && (
                            <p>Instructor: {schedule.instructorName}</p>
                          )}
                        </div>
                      </div>
                        <div className="flex space-x-2">
                        {/* Only allow editing if user is admin or created the schedule */}
                        {(userClaims?.role === 'admin' || schedule.createdBy === user?.uid) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCurrentSchedule(schedule);
                                setIsEditing(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(schedule)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
