"use client"

import StudentLayout from "@/components/student-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Info
} from "lucide-react"
import { useEffect, useState } from "react"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  timestamp: any
  read?: boolean
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  useEffect(() => {
    // Query to get all notifications, explicitly fetch unread ones first
    const q = query(
      collection(db, "notifications"),
      orderBy("read", "asc"),  // This will put unread (false) before read (true)
      orderBy("timestamp", "desc")
    )    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updated = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Make sure read property is always a boolean
        const isRead = data.read === true;
        return {
          id: doc.id,
          ...data,
          read: isRead
        }
      }) as Notification[]
      setNotifications(updated)
    })

    return () => unsubscribe()
  }, [])
  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (!n.read) {
        const notifRef = doc(db, "notifications", n.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit();
    
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    )
  }

  const markAsRead = async (id: string) => {
    const notifRef = doc(db, "notifications", id);
    await updateDoc(notifRef, {
      read: true
    });
    
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <FileText className="h-5 w-5 text-amber-500" />
      case "event":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "assessment":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "course":
        return <BookOpen className="h-5 w-5 text-purple-500" />
      case "announcement":
        return <Info className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }  // Filter notifications where read is explicitly false
  const unread = notifications.filter((n) => n.read === false)
  const unreadCount = unread.length

  const renderList = (list: Notification[]) =>
    list.length > 0 ? (
      list.map((n) => (
        <div
          key={n.id}
          onClick={async () => await markAsRead(n.id)}
          className={`flex gap-4 p-4 rounded-lg border cursor-pointer ${
            !n.read ? "bg-muted/50 border-primary/20" : ""
          }`}
        >
          <div className="mt-1">{getNotificationIcon(n.type)}</div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
              <h3 className="font-medium">{n.title}</h3>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {n.timestamp?.toDate
                  ? n.timestamp.toDate().toLocaleString()
                  : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {n.message}
            </p>
          </div>
          {!n.read && (
            <div className="flex-shrink-0 self-center">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      ))
    ) : (
      <div className="text-center py-12">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">
          No notifications
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You're all caught up! Check back later for updates.
        </p>
      </div>
    )

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Notifications
            </h1>
            <p className="text-muted-foreground">
              Stay updated with your courses and assignments
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={async () => await markAllAsRead()}>
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>
                  You have {unreadCount} unread{" "}
                  {unreadCount === 1
                    ? "notification"
                    : "notifications"}
                </CardDescription>
              </CardHeader>
              <CardContent>{renderList(notifications)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unread">
            <Card>
              <CardHeader>
                <CardTitle>Unread Notifications</CardTitle>
                <CardDescription>
                  {unreadCount > 0
                    ? `You have ${unreadCount} unread ${
                        unreadCount === 1
                          ? "notification"
                          : "notifications"
                      }`
                    : "You're all caught up!"}
                </CardDescription>
              </CardHeader>
              <CardContent>{renderList(unread)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Assignment Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {renderList(
                  notifications.filter((n) => n.type === "assignment")
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Event Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {renderList(
                  notifications.filter((n) => n.type === "event")
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle>Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                {renderList(
                  notifications.filter(
                    (n) => n.type === "announcement"
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}
