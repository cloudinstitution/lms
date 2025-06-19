"use client"

import React, { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import KPICards from "./components/KPICards"
import RecentActivity from "./components/RecentActivity"
import CoursePerformance from "./components/CoursePerformance"
import UpcomingEvents from "./components/UpcomingEvents"
import SystemNotifications from "./components/SystemNotifications"
import QuickActions from "./components/QuickActions"
import StudentCreationForm from "./components/StudentCreationForm"
import { getAdminSession } from "@/lib/session-storage"

export default function AdminDashboard() {
  const [adminData, setAdminData] = useState<any>(null)
  
  useEffect(() => {
    const data = getAdminSession()
    if (data) {
      setAdminData(data)
    }
  }, [])

  // Determine dashboard title based on role
  const dashboardTitle = adminData?.role === 'teacher' ? 'Teacher Dashboard' : 'Admin Dashboard'
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{dashboardTitle}</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {/* Only show Create Student tab for admins */}
          {adminData?.role === 'admin' && (
            <TabsTrigger value="createStudent">Create Student</TabsTrigger>
          )}
        </TabsList>        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs - Show for all roles but with filtered data */}
          <KPICards userRole={adminData?.role} userId={adminData?.id} />

          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions Card - role specific actions */}
            <QuickActions userRole={adminData?.role} />

            {/* Upcoming Events - filtered by role */}
            <UpcomingEvents userRole={adminData?.role} userId={adminData?.id} />

            {/* System Notifications */}
            <SystemNotifications userRole={adminData?.role} />

            {/* Recent Activity - filtered by role */}
            <div className="md:col-span-2 lg:col-span-1">
              <RecentActivity userRole={adminData?.role} userId={adminData?.id} />
            </div>
          </div>

          {/* Course Performance - Full Width - filtered by role */}
          <CoursePerformance userRole={adminData?.role} userId={adminData?.id} />
        </TabsContent>

        {/* Create Student Tab - we'll use the existing functionality */}
        <TabsContent value="createStudent" className="space-y-6">
          {/* Use the separated student creation form component */}
          <div className="max-w-3xl mx-auto">
            <StudentCreationForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
