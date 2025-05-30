"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StudentLayout from "@/components/student-layout"
import { User, Calendar, Phone, Mail, BookOpen, CheckCircle, XCircle } from "lucide-react"
import { useStudentSession } from "@/lib/use-student-session"

interface Student {
  id: string
  name: string
  username: string
  password: string
  phoneNumber: string
  coursesEnrolled: number
  studentId: string
  joinedDate: string
  courseName: string
  status?: "Active" | "Inactive"
}

export default function ProfilePage() {  const [student, setStudent] = useState<Student | null>(null)
  
  // Use the custom hook to manage session
  const { router, isLoading } = useStudentSession((studentData) => {
    setStudent(studentData as Student)
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch (error) {
      return dateString
    }
  }

  if (isLoading) return <div className="p-6">Loading...</div>
  if (!student) return <div className="p-6">No student data available. Redirecting to login...</div>

  return (
    <StudentLayout>
      <div className="space-y-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center">
              <User className="h-8 w-8 mr-3 text-purple-500" /> Welcome, {student.name}!
            </h1>
            <p className="text-muted-foreground mt-1">Your Profile Details</p>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/40 dark:to-slate-900 rounded-t-lg">
            <CardTitle className="flex items-center text-slate-800 dark:text-slate-100">
              <User className="h-5 w-5 text-purple-500 mr-2" /> Profile
            </CardTitle>
            <CardDescription>Personal information and enrollment details</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Full Name</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{student.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Email Address</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{student.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Phone Number</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {student.phoneNumber || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Enrollment Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Student ID</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{student.studentId}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Joined Date</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{formatDate(student.joinedDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {student.status === "Active" ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 mr-3" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Account Status</p>
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.status === "Active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {student.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
                <BookOpen className="h-5 w-5 text-purple-500 mr-2" /> Course Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Current Course</p>
                  <p className="font-medium text-purple-700 dark:text-purple-400">{student.courseName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Courses Enrolled</p>
                  <p className="font-medium text-purple-700 dark:text-purple-400">{student.coursesEnrolled}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
