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
  QrCode
} from "lucide-react"

export default function QuickActions() {
  const router = useRouter()
  
  const actions = [
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
    {
      name: "Sync Data",
      icon: RefreshCw,
      action: () => {
        // Here we would implement data synchronization logic
        console.log("Syncing data...")
      },
      color: "text-cyan-600"
    }
  ]

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
