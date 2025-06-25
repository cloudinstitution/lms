"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNewAttendance } from "@/hooks/use-new-attendance";
import NewAttendanceService from "@/lib/new-attendance-service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, TrendingUp, UserCheck, Users, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  email?: string;
}

interface NewAttendanceManagerProps {
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName?: string;
  students: Student[];
}

export function NewAttendanceManager({
  courseId,
  courseName,
  teacherId,
  teacherName,
  students = []
}: NewAttendanceManagerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [presentStudents, setPresentStudents] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"mark" | "view" | "stats">("mark");
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    loading,
    error,
    markAttendance,
    updateAttendance,
    getCourseAttendance,
    getStudentSummary,
    clearError
  } = useNewAttendance();

  // Format date for API calls
  const formatDateForAPI = (date: Date) => {
    return NewAttendanceService.formatDate(date);
  };

  // Load attendance data for selected date
  const loadAttendanceData = async () => {
    if (!selectedDate) return;

    const dateString = formatDateForAPI(selectedDate);
    const result = await getCourseAttendance({
      courseId,
      date: dateString
    });

    if (result.success && result.data?.attendance) {
      setAttendanceData(result.data);
      setPresentStudents(result.data.attendance.presentStudents || []);
    } else {
      setAttendanceData(null);
      setPresentStudents([]);
    }
  };

  // Load attendance data when date changes
  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate, courseId]);

  // Handle student selection
  const handleStudentToggle = (studentId: string) => {
    setPresentStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Mark or update attendance
  const handleSubmitAttendance = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);
    const dateString = formatDateForAPI(selectedDate);
    
    try {
      let result;
      
      if (attendanceData?.attendance) {
        // Update existing attendance
        result = await updateAttendance({
          courseId,
          date: dateString,
          presentStudents,
          teacherId,
          teacherName
        });
      } else {
        // Mark new attendance
        result = await markAttendance({
          courseId,
          date: dateString,
          presentStudents,
          teacherId,
          teacherName
        });
      }

      if (result.success) {
        toast.success(result.message);
        await loadAttendanceData(); // Reload data
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error("Failed to save attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark all students as present
  const markAllPresent = () => {
    setPresentStudents(students.map(student => student.id));
  };

  // Mark all students as absent
  const markAllAbsent = () => {
    setPresentStudents([]);
  };

  const presentCount = presentStudents.length;
  const absentCount = students.length - presentCount;
  const attendancePercentage = students.length > 0 ? (presentCount / students.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Manager - {courseName}
          </CardTitle>
          <CardDescription>
            Manage attendance for course {courseId}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {attendancePercentage.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Marking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>
                {selectedDate && format(selectedDate, "PPPP")}
                {attendanceData?.attendance && (
                  <Badge variant="secondary" className="ml-2">
                    Already Marked
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllPresent}
                disabled={loading || isSubmitting}
              >
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAbsent}
                disabled={loading || isSubmitting}
              >
                Mark All Absent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Student List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border",
                    presentStudents.includes(student.id)
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  )}
                >
                  <Checkbox
                    id={student.id}
                    checked={presentStudents.includes(student.id)}
                    onCheckedChange={() => handleStudentToggle(student.id)}
                    disabled={loading || isSubmitting}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={student.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {student.name}
                    </Label>
                    {student.email && (
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    )}
                  </div>
                  <Badge
                    variant={presentStudents.includes(student.id) ? "default" : "secondary"}
                    className={cn(
                      presentStudents.includes(student.id)
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    )}
                  >
                    {presentStudents.includes(student.id) ? "Present" : "Absent"}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSubmitAttendance}
                disabled={loading || isSubmitting}
                size="lg"
                className="min-w-[200px]"
              >
                {isSubmitting ? "Saving..." : 
                 attendanceData?.attendance ? "Update Attendance" : "Mark Attendance"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Data Display */}
      {attendanceData && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Marked By</Label>
                <p className="text-sm text-muted-foreground">
                  {attendanceData.attendance.createdByName || 'Unknown'}
                  {attendanceData.attendance.createdBy && (
                    <span className="text-xs opacity-70 ml-1">
                      (ID: {attendanceData.attendance.createdBy})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Timestamp</Label>
                <p className="text-sm text-muted-foreground">
                  {attendanceData.attendance.timestamp && 
                   format(attendanceData.attendance.timestamp.toDate(), "PPpp")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
