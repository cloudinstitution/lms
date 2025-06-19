"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { 
  UserPlus, 
  FolderPlus, 
  FileText, 
  Upload,
  Download,
  RefreshCw,
  QrCode,
  ClipboardList,
  BookOpen,
  Calendar
} from "lucide-react"

interface QuickActionsProps {
  userRole?: string;
}

export default function QuickActions({ userRole = 'admin' }: QuickActionsProps) {
  const router = useRouter()
    // Define role-specific actions
  const adminActions = [
    {
      name: "Add Student",
      icon: UserPlus,
      action: () => router.push("/admin/students?action=new"),
      color: "text-blue-600"
    },
    {
      name: "Create Course",
      icon: FolderPlus,
      action: () => router.push("/admin/courses?action=new"),
      color: "text-green-600"
    },
    {
      name: "Add Assessment",
      icon: FileText,
      action: () => router.push("/admin/assessments?action=new"),
      color: "text-amber-600"
    },
    {
      name: "Mark Attendance",
      icon: QrCode,
      action: () => router.push("/admin/attendance"),
      color: "text-purple-600"
    },
    {
      name: "Export Reports",
      icon: Download,
      action: () => router.push("/admin/settings?tab=reports"),
      color: "text-indigo-600"
    },
  ]
  
  const teacherActions = [
    {
      name: "View My Courses",
      icon: BookOpen,
      action: () => router.push("/admin/courses"),
      color: "text-green-600"
    },
    {
      name: "View My Students",
      icon: UserPlus,
      action: () => router.push("/admin/students"),
      color: "text-blue-600"
    },
    {
      name: "Mark Attendance",
      icon: QrCode,
      action: () => router.push("/admin/attendance"),
      color: "text-purple-600"
    },
    {
      name: "View Schedule",
      icon: Calendar,
      action: () => router.push("/admin/schedule"),
      color: "text-amber-600"
    },
    {
      name: "Grade Assessments",
      icon: ClipboardList,
      action: () => router.push("/admin/assessments"),
      color: "text-indigo-600"
    },
  ]
    // Select the appropriate actions based on role
  const actions = userRole === 'admin' ? adminActions : teacherActions

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Frequently used admin functions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto flex-col py-4 gap-2 justify-start items-center"
              onClick={action.action}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-xs font-medium">{action.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
