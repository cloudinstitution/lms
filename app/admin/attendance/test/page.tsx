"use client";

import { NewAttendanceManager } from "@/components/attendance/NewAttendanceManager";
import { StudentAttendanceView } from "@/components/attendance/StudentAttendanceView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { getAdminSession } from "@/lib/session-storage";
import { useState } from "react";

// Mock data for testing
const mockStudents = [
  { id: "student-1", name: "John Doe", email: "john@example.com" },
  { id: "student-2", name: "Jane Smith", email: "jane@example.com" },
  { id: "student-3", name: "Bob Johnson", email: "bob@example.com" },
  { id: "student-4", name: "Alice Brown", email: "alice@example.com" },
  { id: "student-5", name: "Charlie Wilson", email: "charlie@example.com" },
];

const mockCourseId = "web-dev-101";
const mockCourseName = "Web Development Fundamentals";

export default function AttendanceTestPage() {
  const { user, userProfile } = useAuth();
  const adminSession = getAdminSession();
  const [selectedStudentId, setSelectedStudentId] = useState(mockStudents[0].id);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">New Attendance System Test</h1>
        <p className="text-muted-foreground">
          Test the new attendance system with mock data
        </p>
      </div>

      <Tabs defaultValue="manager" className="w-full">
        <TabsList>
          <TabsTrigger value="manager">Attendance Manager</TabsTrigger>
          <TabsTrigger value="student">Student View</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Attendance Manager</CardTitle>
              <CardDescription>
                This component allows teachers to mark attendance for a course
              </CardDescription>
            </CardHeader>
          </Card>
          
          <NewAttendanceManager
            courseId={mockCourseId}
            courseName={mockCourseName}
            teacherId={adminSession?.id || userProfile?.firestoreId || user?.uid || "test-teacher"}
            teacherName={adminSession?.role || userProfile?.role || "test-admin"}
            students={mockStudents}
          />
        </TabsContent>

        <TabsContent value="student" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Student Attendance View</CardTitle>
              <CardDescription>
                Select a student to view their attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {mockStudents.map((student) => (
                  <Button
                    key={student.id}
                    variant={selectedStudentId === student.id ? "default" : "outline"}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    {student.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <StudentAttendanceView
            studentId={selectedStudentId}
            studentName={mockStudents.find(s => s.id === selectedStudentId)?.name}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Attendance Collection Structure:</h4>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`attendance (collection)
  └── [courseId] (document)
        └── dates (subcollection)
              └── [dateId: 2025-06-24]
                    └── {
                          presentStudents: [...],
                          createdBy: teacherId,
                          timestamp: ...
                        }`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Student Collection Structure:</h4>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`students (collection)
  └── [studentId] (document)
        └── attendanceByCourse: {
              [courseId]: {
                datesPresent: ["2025-06-21"],
                summary: {
                  totalClasses: 12,
                  attended: 10,
                  percentage: 83.33
                }
              }
            }`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
