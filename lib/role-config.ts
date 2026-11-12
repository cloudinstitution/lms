"use client"

import {
    Award,
    Bell,
    BookOpen,
    Briefcase,
    Building2,
    ShoppingCart,
    Calendar,
    FileText,
    FolderCheck,
    LayoutDashboard,
    QrCode,
    Settings,
    ShieldCheck,
    Users
} from "lucide-react"
import type React from "react"
import { roleDef } from "./staff-roles"

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
      { name: "Enrollments", href: "/admin/enrollments", icon: ShoppingCart },
      { name: "HR & Employees", href: "/admin/hr", icon: Briefcase },
      { name: "Course Quizzes", href: "/admin/course-quizzes", icon: FileText },
      { name: "Courses", href: "/admin/courses", icon: BookOpen },
      { name: "Schedule", href: "/admin/schedule", icon: Calendar },
      { name: "Assessments", href: "/admin/assessments", icon: FileText },
      { name: "Programming", href: "/admin/programming", icon: FileText },
      { name: "Company Questions", href: "/admin/company-questions", icon: Briefcase },
      { name: "Attendance", href: "/admin/attendance", icon: QrCode },
      { name: "Jobs", href: "/admin/job", icon: Building2 },
      { name: "Projects", href: "/admin/projects", icon: FolderCheck },
      { name: "Certificates", href: "/admin/certificates", icon: Award },
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
      { name: "Users & Roles", href: "/admin/users", icon: ShieldCheck },
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
      { name: "Projects", href: "/admin/projects", icon: FolderCheck },
      { name: "Notifications", href: "/admin/notifications", icon: Bell },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
}

/** Admin menu items a limited role may see: the dashboard plus the sections the role was given. */
function limitedNavigation(role: string): NavigationItem[] | null {
  const def = roleDef(role)
  if (!def?.sections) return null
  return roleConfigs.admin.navigation.filter((i) => i.href === "/admin/dashboard" || def.sections!.includes(i.href.split("/")[2]))
}

/**
 * Get the navigation configuration for a specific role
 */
export function getNavigationForRole(role: string): NavigationItem[] {
  if (role === "admin" || role === "teacher") return roleConfigs[role].navigation
  return limitedNavigation(role) ?? roleConfigs.teacher.navigation
}

/**
 * Get the page title for a specific role
 */
export function getPageTitleForRole(role: string): string {
  if (role === "admin" || role === "teacher") return roleConfigs[role].pageTitle
  return roleDef(role) ? `${roleDef(role)!.label} Portal` : roleConfigs.teacher.pageTitle
}

/**
 * Check if a user with a given role can access a specific path
 */
export function canAccessPath(role: string, path: string): boolean {
  const navigation = getNavigationForRole(role)
  if (path === "/admin" || path === "/admin/dashboard") return true
  return navigation.some((item) => path === item.href || path.startsWith(`${item.href}/`))
}
