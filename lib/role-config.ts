"use client"

import {
    Bell,
    BookOpen,
    Briefcase,
    Calendar,
    FileText,
    LayoutDashboard,
    QrCode,
    Settings,
    Users
} from "lucide-react"
import type React from "react"

export interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
}

export interface RoleConfig {
  roleName: string
  navigation: NavigationItem[]
  pageTitle: string
}

// Define navigation items for different roles
export const roleConfigs: Record<string, RoleConfig> = {
  admin: {
    roleName: "Administrator",
    pageTitle: "Admin Portal",
    navigation: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Students", href: "/admin/students", icon: Users },
      { name: "Courses", href: "/admin/courses", icon: BookOpen },
      { name: "Schedule", href: "/admin/schedule", icon: Calendar },
      { name: "Assessments", href: "/admin/assessments", icon: FileText },
      { name: "Programming", href: "/admin/programming", icon: FileText },
      { name: "Company Questions", href: "/admin/company-questions", icon: Briefcase },
      { name: "Attendance", href: "/admin/attendance", icon: QrCode },
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },  teacher: {
    roleName: "Teacher",
    pageTitle: "Teacher Portal",
    navigation: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Students", href: "/admin/students", icon: Users },
      { name: "Courses", href: "/admin/courses", icon: BookOpen },
      { name: "Schedule", href: "/admin/schedule", icon: Calendar },
      { name: "Assessments", href: "/admin/assessments", icon: FileText },
      { name: "Programming", href: "/admin/programming", icon: FileText },
      { name: "Company Questions", href: "/admin/company-questions", icon: Briefcase },
      { name: "Attendance", href: "/admin/attendance", icon: QrCode },
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
}

/**
 * Get the navigation configuration for a specific role
 */
export function getNavigationForRole(role: 'admin' | 'teacher' | string): NavigationItem[] {
  // Enforce type safety by only allowing valid roles
  const safeRole = (role === 'admin' || role === 'teacher') ? role : 'teacher';
  return roleConfigs[safeRole].navigation;
}

/**
 * Get the page title for a specific role
 */
export function getPageTitleForRole(role: 'admin' | 'teacher' | string): string {
  // Enforce type safety by only allowing valid roles
  const safeRole = (role === 'admin' || role === 'teacher') ? role : 'teacher';
  return roleConfigs[safeRole].pageTitle;
}

/**
 * Check if a user with a given role can access a specific path
 */
export function canAccessPath(role: 'admin' | 'teacher' | string, path: string): boolean {
  const navigation = getNavigationForRole(role)
  
  // Allow access to base admin dashboard path
  if (path === "/admin" || path === "/admin/dashboard") {
    return true
  }
  
  // Check if the path is in the role's navigation
  return navigation.some(item => {
    // Check exact path match or path starts with navigation href
    // This allows for paths like /admin/students/[id] to be accessible
    return path === item.href || path.startsWith(`${item.href}/`)
  })
}
