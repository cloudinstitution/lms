"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, BookOpen, Clock, Calendar, ArrowRight, CheckCircle, PlayCircle } from "lucide-react"

export default function StudentDashboard() {
  const [progress, setProgress] = useState({
    "Full Stack Web Development": 45,
    "Data Science Fundamentals": 20,
  })

  const enrolledCourses = [
    {
      id: 1,
      title: "Full Stack Web Development",
      progress: progress["Full Stack Web Development"],
      nextLesson: "React Component Lifecycle",
      instructor: "Rahul Sharma",
      nextSession: "Tomorrow, 10:00 AM",
    },
    {
      id: 2,
      title: "Data Science Fundamentals",
      progress: progress["Data Science Fundamentals"],
      nextLesson: "Introduction to Pandas",
      instructor: "Priya Patel",
      nextSession: "Thursday, 2:00 PM",
    },
  ]

  const upcomingAssignments = [
    {
      id: 1,
      title: "Build a React Todo App",
      course: "Full Stack Web Development",
      dueDate: "May 15, 2023",
      status: "Pending",
    },
    {
      id: 2,
      title: "Data Visualization Project",
      course: "Data Science Fundamentals",
      dueDate: "May 20, 2023",
      status: "Pending",
    },
    {
      id: 3,
      title: "API Integration Exercise",
      course: "Full Stack Web Development",
      dueDate: "May 10, 2023",
      status: "Completed",
    },
  ]

  const recommendedCourses = [
    {
      id: 3,
      title: "Cloud Computing & DevOps",
      description: "Deploy and manage applications in cloud environments with CI/CD pipelines",
      duration: "14 weeks",
      level: "Advanced",
    },
    {
      id: 4,
      title: "React Native Mobile Development",
      description: "Build cross-platform mobile applications using React Native",
      duration: "10 weeks",
      level: "Intermediate",
    },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Learning Academy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-primary">
              Dashboard
            </Link>
            <Link href="/courses" className="text-sm font-medium hover:text-primary">
              Courses
            </Link>
            <Link href="/assignments" className="text-sm font-medium hover:text-primary">
              Assignments
            </Link>
            <Link href="/schedule" className="text-sm font-medium hover:text-primary">
              Schedule
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                S
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">Student</p>
                <p className="text-xs text-muted-foreground">student@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Student!</h1>
            <p className="text-muted-foreground">Track your progress and continue learning</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link href="/courses">
              <Button>Browse All Courses</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrolledCourses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active courses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hours Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">48</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground mt-1">Pending submissions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>Continue where you left off</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="space-y-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{course.title}</h3>
                    <span className="text-sm text-muted-foreground">{course.progress}% complete</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <PlayCircle className="h-4 w-4" />
                      <span>Next: {course.nextLesson}</span>
                    </div>
                    <Link href={`/courses/${course.id}`} className="text-primary hover:underline">
                      Continue
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Link href="/courses" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Courses
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
              <CardDescription>Your next learning sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{course.title}</h4>
                      <p className="text-sm text-muted-foreground">{course.nextSession}</p>
                      <p className="text-xs text-muted-foreground">Instructor: {course.instructor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/schedule" className="w-full">
                <Button variant="outline" className="w-full">
                  View Full Schedule
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Track your pending assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full mt-1 flex items-center justify-center ${
                          assignment.status === "Completed"
                            ? "bg-green-100 text-green-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {assignment.status === "Completed" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{assignment.title}</h4>
                        <p className="text-sm text-muted-foreground">{assignment.course}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm ${assignment.status === "Completed" ? "text-green-600" : "text-amber-600"}`}
                      >
                        {assignment.status}
                      </div>
                      <p className="text-xs text-muted-foreground">Due: {assignment.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/assignments" className="w-full">
                <Button variant="outline" className="w-full">
                  View All Assignments
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Stats</CardTitle>
              <CardDescription>Your learning activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Weekly Goal</span>
                  <span className="text-sm text-muted-foreground">8/10 hours</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-lg font-bold">8 hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Last Week</p>
                  <p className="text-lg font-bold">6 hrs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avg. Session</p>
                  <p className="text-lg font-bold">45 min</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Completion</p>
                  <p className="text-lg font-bold">32%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Courses</CardTitle>
              <CardDescription>Based on your interests and current courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {recommendedCourses.map((course) => (
                  <Card key={course.id} className="overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="pb-4">
                      <div className="mb-2">
                        <BookOpen className="h-10 w-10 text-primary" />
                      </div>
                      <CardTitle>{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Level:</span>
                          <span className="font-medium">{course.level}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/50 pt-4">
                      <Link href={`/courses/${course.id}`} className="w-full">
                        <Button variant="outline" className="w-full">
                          View Course
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/courses" className="w-full">
                <Button variant="outline" className="w-full flex items-center justify-center gap-1">
                  Explore More Courses
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
