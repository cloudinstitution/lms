"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNewAttendance } from "@/hooks/use-new-attendance";
import { CalendarDays, Clock, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface StudentAttendanceViewProps {
  studentId: string;
  studentName?: string;
}

interface CourseAttendanceData {
  datesPresent: string[];
  summary: {
    totalClasses: number;
    attended: number;
    percentage: number;
  };
}

export function StudentAttendanceView({ 
  studentId, 
  studentName = "Student" 
}: StudentAttendanceViewProps) {
  const [attendanceData, setAttendanceData] = useState<Record<string, CourseAttendanceData>>({});
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const { getStudentFromDocument, loading, error } = useNewAttendance();

  // Load student attendance data
  const loadAttendanceData = async () => {
    setIsLoading(true);
    try {
      const result = await getStudentFromDocument({ studentId });
      
      if (result.success && result.data) {
        setAttendanceData(result.data.attendanceByCourse || {});
        
        // Set first course as selected if none selected
        const courses = Object.keys(result.data.attendanceByCourse || {});
        if (courses.length > 0 && !selectedCourse) {
          setSelectedCourse(courses[0]);
        }
      } else {
        toast.error("Failed to load attendance data");
      }
    } catch (err) {
      toast.error("Error loading attendance data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [studentId]);

  // Calculate overall stats
  const overallStats = Object.values(attendanceData).reduce(
    (acc, course) => ({
      totalClasses: acc.totalClasses + course.summary.totalClasses,
      attended: acc.attended + course.summary.attended,
    }),
    { totalClasses: 0, attended: 0 }
  );

  const overallPercentage = overallStats.totalClasses > 0 
    ? Math.round((overallStats.attended / overallStats.totalClasses) * 100)
    : 0;

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 85) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getPercentageBadgeVariant = (percentage: number) => {
    if (percentage >= 85) return "default";
    if (percentage >= 75) return "secondary";
    return "destructive";
  };

  if (isLoading || loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading attendance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const courseIds = Object.keys(attendanceData);

  if (courseIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Record - {studentName}</CardTitle>
          <CardDescription>No attendance data found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This student has not been marked for attendance in any courses yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Record - {studentName}
          </CardTitle>
          <CardDescription>
            Student ID: {studentId}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">{overallStats.totalClasses}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attended</p>
                <p className="text-2xl font-bold text-green-600">{overallStats.attended}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missed</p>
                <p className="text-2xl font-bold text-red-600">
                  {overallStats.totalClasses - overallStats.attended}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall %</p>
                <p className={`text-2xl font-bold ${getPercentageColor(overallPercentage)}`}>
                  {overallPercentage}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course-wise Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Course-wise Attendance</CardTitle>
          <CardDescription>
            Detailed attendance breakdown by course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCourse} onValueChange={setSelectedCourse}>
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {courseIds.map((courseId) => (
                <TabsTrigger key={courseId} value={courseId} className="text-sm">
                  {courseId}
                  <Badge 
                    variant={getPercentageBadgeVariant(attendanceData[courseId].summary.percentage)}
                    className="ml-2"
                  >
                    {attendanceData[courseId].summary.percentage.toFixed(1)}%
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {courseIds.map((courseId) => {
              const courseData = attendanceData[courseId];
              return (
                <TabsContent key={courseId} value={courseId} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                          <p className="text-3xl font-bold">{courseData.summary.totalClasses}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Classes Attended</p>
                          <p className="text-3xl font-bold text-green-600">
                            {courseData.summary.attended}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                          <p className={`text-3xl font-bold ${getPercentageColor(courseData.summary.percentage)}`}>
                            {courseData.summary.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Progress Bar */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{courseData.summary.percentage.toFixed(1)}%</span>
                        </div>
                        <Progress 
                          value={courseData.summary.percentage} 
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dates Present */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dates Present</CardTitle>
                      <CardDescription>
                        All dates when student was marked present
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {courseData.datesPresent.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {courseData.datesPresent.map((date) => (
                            <Badge key={date} variant="outline">
                              {new Date(date).toLocaleDateString()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No attendance records found</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={loadAttendanceData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>
    </div>
  );
}
