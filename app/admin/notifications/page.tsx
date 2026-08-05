"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { db } from "@/lib/firebase"
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore"
import { Bell, CheckCircle, Send, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

const AdminNotifications = () => {
  const [notificationTitle, setNotificationTitle] = useState("")
  const [notificationMessage, setNotificationMessage] = useState("")
  const [notificationType, setNotificationType] = useState("assignment")
  const [isSending, setIsSending] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)
  const [sentNotifications, setSentNotifications] = useState<any[]>([])

  const handleSendNotification = async () => {
    if (!notificationTitle || !notificationMessage) return

    setIsSending(true)
    try {
      await addDoc(collection(db, "notifications"), {
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        timestamp: serverTimestamp(),
        recipients: 0,
        read: 0,
      })
      setSentSuccess(true)
      setNotificationTitle("")
      setNotificationMessage("")
    } catch (error) {
      console.error("Error sending notification:", error)
    } finally {
      setIsSending(false)
      setTimeout(() => setSentSuccess(false), 3000)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setSentNotifications(data)
    })

    return () => unsubscribe()
  }, [])

  const getNotificationTypeStyles = (type: string) => {
    switch (type) {
      case "assignment":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "announcement":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200"
      case "event":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }
  return (
    <div className="p-6 space-y-8 bg-gradient-to-b from-slate-950 to-slate-900">
      <Card className="border border-slate-800 shadow-lg overflow-hidden bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <div>
              <CardTitle className="text-xl text-blue-400">Send Notification</CardTitle>
              <CardDescription className="text-slate-400">Send important updates to all students.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Notification Title"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-400/30"
            />
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400/30 focus:outline-none transition-colors"
            >
              <option value="assignment">Assignment</option>
              <option value="announcement">Announcement</option>
              <option value="event">Event</option>
            </select>
          </div>            <Textarea
              placeholder="Write your notification message here..."
              rows={4}
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-400/30 min-h-[120px] resize-none"
            />
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Button
              onClick={handleSendNotification}
              disabled={isSending || !notificationTitle || !notificationMessage}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all shadow-md"
            >
              {isSending ? (
                <div className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                  Sending...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </div>
              )}
            </Button>
            {sentSuccess && (
              <div className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-2 rounded-md border border-green-100 animate-in fade-in-50 slide-in-from-bottom-5">
                <CheckCircle className="h-4 w-4 mr-2" />
                Notification sent successfully!
              </div>
            )}
          </div>
        </CardContent>
      </Card>      <div>
        <h2 className="text-2xl font-bold mb-6 text-purple-400">Sent Notifications</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sentNotifications.length > 0 ? (
            sentNotifications.map((notification) => (
              <Card
                key={notification.id}
                className="border border-slate-800 hover:shadow-md transition-all overflow-hidden group bg-slate-900/50 backdrop-blur-sm"
              >
                <CardHeader className="pb-2 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-purple-400 truncate">{notification.title}</CardTitle>
                    <Badge className={`capitalize ${getNotificationTypeStyles(notification.type)}`}>
                      {notification.type}
                    </Badge>
                  </div>
                </CardHeader>                <CardContent className="pt-4">
                  <p className="text-sm text-slate-300 line-clamp-3 mb-3">{notification.message}</p>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="bg-slate-800/50 px-2 py-1 rounded-full">
                      {notification.timestamp?.toDate ? notification.timestamp.toDate().toLocaleString() : "Just now"}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (            <div className="col-span-full text-center py-10 border border-dashed border-slate-700 rounded-lg bg-slate-900/50">
              <p className="text-slate-400">No notifications sent yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminNotifications
