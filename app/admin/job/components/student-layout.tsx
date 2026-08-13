"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { db } from "@/lib/firebase"
import { clearSession, getStudentName } from "@/lib/session-storage"
import { isStudentInAWSCourse } from "@/lib/course-utils"
import { collection, DocumentData, onSnapshot, query } from "firebase/firestore"
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Code,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  QrCode,
  Sun,
  User,
} from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: any;
  read?: boolean;
  studentId?: string;
}

interface JobListing {
  id: string;
  title: string;
  company: string;
  deadline: string; // yyyy-mm-dd
  status: string;
}

interface StudentLayoutProps {
  children: React.ReactNode
}

// A job is "expired" once its deadline date has passed, compared at the
// day level (a deadline of today still counts as active). Jobs without a
// deadline are never considered expired.
const isJobExpired = (deadline: string): boolean => {
  if (!deadline) return false
  const deadlineDate = new Date(deadline)
  if (Number.isNaN(deadlineDate.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)

  return deadlineDate < today
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [notificationCount, setNotificationCount] = useState<number>(0)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [isAWSStudent, setIsAWSStudent] = useState<boolean>(false)
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [expiryTick, setExpiryTick] = useState(0)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setIsMounted(true);
    // Get student name from localStorage
    const name = getStudentName();
    setStudentName(name || 'Student');
    
    // Check if student is in AWS course
    setIsAWSStudent(isStudentInAWSCourse());

    // Subscribe to unread notifications count
    const notificationsCollection = collection(db, "notifications");
    const q = query(notificationsCollection);
    
    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type || '',
          timestamp: data.timestamp,
          read: data.read === true
        } as Notification;
      });
      
      // Consider a notification unread unless it's explicitly marked as read=true
      const unreadCount = notifications.filter(n => !n.read).length;
      console.log('Notifications:', notifications);
      console.log('Unread count:', unreadCount);
      setNotificationCount(unreadCount);
    });

    // Subscribe to jobs so we can flag any whose deadline has passed
    const jobsCollection = collection(db, "jobs");
    const unsubscribeJobs = onSnapshot(query(jobsCollection), (snapshot) => {
      const jobsData = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title || '',
          company: data.company || '',
          deadline: data.deadline || '',
          status: data.status || 'Open',
        } as JobListing;
      });
      setJobs(jobsData);
    });

    // Re-check deadlines periodically in case the tab stays open across midnight
    const intervalId = setInterval(() => setExpiryTick((t) => t + 1), 60 * 60 * 1000);

    return () => {
      unsubscribeNotifications();
      unsubscribeJobs();
      clearInterval(intervalId);
    }
  }, [])

  // Jobs that are still marked Open but whose deadline has already passed
  const expiredJobs = useMemo(
    () => jobs.filter((job) => job.status === "Open" && isJobExpired(job.deadline)),
    // expiryTick is intentionally in the deps so this recomputes on the
    // hourly interval even if the underlying jobs list hasn't changed
    [jobs, expiryTick]
  )

  const totalAlertCount = notificationCount + expiredJobs.length

  if (!isMounted) {
    return null
  }

  const handleLogout = () => {
    clearSession()
  }

  const navigation = [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Courses", href: "/student/courses", icon: BookOpen },
    { name: "Assessments", href: "/student/assessments", icon: FileText },
    { name: "Programming", href: "/student/programming", icon: Code },
    { name: "Company Questions", href: "/student/company-questions", icon: Briefcase },
    { name: "Jobs", href: "/student/jobs", icon: Building2 },
    { name: "Attendance", href: "/student/attendance", icon: QrCode },
    { name: "Profile", href: "/student/profile", icon: User },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 z-50"></div>
      <div className="flex h-screen bg-background">
        <aside className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r bg-card">
            <div className="flex items-center flex-shrink-0 px-4 mb-5">
              <Link href="/student/dashboard" className="flex items-center gap-2">
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="font-bold text-xl">Cloud Institution</span>
              </Link>
            </div>
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="flex-shrink-0 flex border-t p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium mr-2">
                        {studentName?.charAt(0) || 'S'}
                      </div>
                      <span>{studentName || 'Student'}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/student/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? (
                      <>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="cursor-pointer text-destructive focus:text-destructive" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden absolute left-4 top-3 z-50">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center flex-shrink-0 px-4 h-14 border-b">
                <Link href="/student/dashboard" className="flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">Cloud Institution</span>
                </Link>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon
                        className={`mr-3 flex-shrink-0 h-5 w-5 ${
                          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="flex-shrink-0 flex border-t p-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium mr-2">
                          {studentName?.charAt(0) || 'S'}
                        </div>
                        <span>{studentName || 'Student'}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/student/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                      {theme === "dark" ? (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="cursor-pointer text-destructive focus:text-destructive" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="w-full h-14 flex items-center justify-end px-4 border-b bg-card md:px-6">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalAlertCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {totalAlertCount}
                      </span>
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {expiredJobs.length > 0 && (
                    <>
                      <DropdownMenuLabel className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        Job {expiredJobs.length === 1 ? "listing has" : "listings have"} expired
                      </DropdownMenuLabel>
                      {expiredJobs.slice(0, 5).map((job) => (
                        <DropdownMenuItem key={job.id} asChild>
                          <Link href="/student/jobs" className="cursor-pointer flex flex-col items-start gap-0.5 py-2">
                            <span className="text-sm font-medium">{job.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {job.company} · Application deadline has passed
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      {expiredJobs.length > 5 && (
                        <DropdownMenuItem asChild>
                          <Link href="/student/jobs" className="cursor-pointer text-xs text-muted-foreground justify-center">
                            +{expiredJobs.length - 5} more expired listing{expiredJobs.length - 5 !== 1 ? "s" : ""}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {notificationCount > 0 ? (
                    <DropdownMenuItem asChild>
                      <Link href="/student/notifications" className="cursor-pointer">
                        <Bell className="mr-2 h-4 w-4" />
                        <span>{notificationCount} unread notification{notificationCount !== 1 ? "s" : ""}</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    expiredJobs.length === 0 && (
                      <DropdownMenuItem disabled className="text-muted-foreground justify-center">
                        No new notifications
                      </DropdownMenuItem>
                    )
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/student/notifications" className="cursor-pointer justify-center text-xs text-muted-foreground">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {studentName?.charAt(0) || 'S'}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">{children}</main>
        </div>
      </div>
    </div>
  )
}
