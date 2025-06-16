"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import KPICards from "./components/KPICards"
import RecentActivity from "./components/RecentActivity"
import CoursePerformance from "./components/CoursePerformance"
import UpcomingEvents from "./components/UpcomingEvents"
import SystemNotifications from "./components/SystemNotifications"
import QuickActions from "./components/QuickActions"
import StudentCreationForm from "./components/StudentCreationForm"

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="createStudent">Create Student</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <KPICards />

          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions Card */}
            <QuickActions />

            {/* Upcoming Events */}
            <UpcomingEvents />

            {/* System Notifications */}
            <SystemNotifications />

            {/* Recent Activity */}
            <div className="md:col-span-2 lg:col-span-1">
              <RecentActivity />
            </div>
          </div>

          {/* Course Performance - Full Width */}
          <CoursePerformance />
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
