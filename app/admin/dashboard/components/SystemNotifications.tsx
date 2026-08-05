"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: Date
  read: boolean
}

interface SystemNotificationsProps {
  userRole?: string;
}

export default function SystemNotifications({ userRole = 'admin' }: SystemNotificationsProps) {
  // Sample notifications - in a real app, these would come from a database
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    {
      id: "notif1",
      title: "Backup Completed",
      message: "Database backup successfully completed at 3:00 AM",
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      read: false
    },
    {
      id: "notif2",
      title: "Storage Warning",
      message: "Your cloud storage usage has reached 80% of capacity",
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
      read: false
    },
    {
      id: "notif3",
      title: "New User Registrations",
      message: "10 new students have registered in the past 24 hours",
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
      read: true
    },
    {
      id: "notif4",
      title: "Scheduled Maintenance",
      message: "System maintenance scheduled for tomorrow at 2:00 AM UTC",
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), // 36 hours ago
      read: true
    }
  ])

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>System Notifications</CardTitle>
          <CardDescription>Updates and alerts requiring your attention</CardDescription>
        </div>
        {notifications.some(n => !n.read) && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <span className="text-xs font-medium text-primary-foreground">
              {notifications.filter(n => !n.read).length}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No notifications at this time
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id}
                className={cn(
                  "flex gap-3 p-2 rounded-md cursor-pointer transition-colors",
                  !notification.read 
                    ? "bg-muted/50 hover:bg-muted" 
                    : "hover:bg-muted/30"
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-sm font-medium",
                      !notification.read && "font-semibold"
                    )}>
                      {notification.title}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {notification.timestamp.toLocaleDateString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
