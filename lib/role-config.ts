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
import { effectiveSections, roleDef } from "./staff-roles"

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

/** Menu for a user: administrators everything; others the dashboard plus the pages they were given (their own list, or the role's default). */
export function getNavigationForRole(role: string, sections?: unknown): NavigationItem[] {
  const list = effectiveSections(role === "admin" || roleDef(role) ? role : "teacher", sections)
  if (list === null) return roleConfigs.admin.navigation
  return roleConfigs.admin.navigation.filter((i) => i.href === "/admin/dashboard" || list.includes(i.href.split("/")[2]))
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
export function canAccessPath(role: string, path: string, sections?: unknown): boolean {
  const navigation = getNavigationForRole(role, sections)
  if (path === "/admin" || path === "/admin/dashboard") return true
  return navigation.some((item) => path === item.href || path.startsWith(`${item.href}/`))
}
