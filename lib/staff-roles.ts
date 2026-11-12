/** Staff roles stored in the `admin` collection as `roleId`. Shared by the server (API guards) and the client (menus). */
export type StaffRole = "admin" | "teacher" | "hr" | "placement" | "accounts"

/** Admin-portal sections, named by the path segment after /admin/. */
export interface StaffRoleDef {
  role: StaffRole
  roleId: number
  label: string
  description: string
  /** null = everything. Otherwise the default sections for this role (the dashboard is always allowed). */
  sections: string[] | null
}

export const STAFF_ROLES: StaffRoleDef[] = [
  { role: "admin", roleId: 1, label: "Administrator", description: "Full access, including creating users and roles.", sections: null },
  { role: "teacher", roleId: 2, label: "Teacher", description: "Students, courses, schedule, assessments, attendance, projects.", sections: ["students", "courses", "schedule", "assessments", "programming", "company-questions", "attendance", "projects", "notifications", "settings"] },
  { role: "hr", roleId: 3, label: "HR Manager", description: "HR & Employees: employees, attendance, leaves, payslips, offer and internship letters.", sections: ["hr", "notifications"] },
  { role: "placement", roleId: 4, label: "Placement Officer", description: "Jobs (incl. automatic job search), company questions, students, certificates.", sections: ["job", "company-questions", "students", "certificates", "notifications"] },
  { role: "accounts", roleId: 5, label: "Accounts / Counsellor", description: "Enrollments, payment requests, course fees, students.", sections: ["enrollments", "students", "notifications"] },
]

/** Every admin page that can be granted individually (the dashboard is always open; Users & Roles is administrators only). */
export const ADMIN_SECTIONS: { key: string; label: string }[] = [
  { key: "students", label: "Students" }, { key: "enrollments", label: "Enrollments" }, { key: "hr", label: "HR & Employees" },
  { key: "course-quizzes", label: "Course Quizzes" }, { key: "courses", label: "Courses" }, { key: "schedule", label: "Schedule" },
  { key: "assessments", label: "Assessments" }, { key: "programming", label: "Programming" }, { key: "company-questions", label: "Company Questions" },
  { key: "attendance", label: "Attendance" }, { key: "job", label: "Jobs" }, { key: "projects", label: "Projects" },
  { key: "certificates", label: "Certificates" }, { key: "notifications", label: "Notifications" }, { key: "settings", label: "Settings" },
]
const SECTION_KEYS = new Set(ADMIN_SECTIONS.map((x) => x.key))

/** Keep only known page keys, no duplicates. Returns null when the value isn't a list. */
export function cleanSections(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  return Array.from(new Set(v.filter((x): x is string => typeof x === "string" && SECTION_KEYS.has(x))))
}

/** The pages a user may open: administrators everything (null); others their own list if one was set, else the role's default. */
export function effectiveSections(role: string, custom?: unknown): string[] | null {
  if (role === "admin") return null
  return cleanSections(custom) ?? roleDef(role)?.sections ?? []
}

export const roleFromRoleId = (roleId: unknown): StaffRole | null => STAFF_ROLES.find((r) => r.roleId === roleId)?.role ?? null
export const roleDef = (role: string): StaffRoleDef | undefined => STAFF_ROLES.find((r) => r.role === role)
export const isStaffRole = (role: unknown): role is StaffRole => STAFF_ROLES.some((r) => r.role === role)

/** Can this user open the admin-portal section (e.g. "hr")? `custom` is their own page list, if one was set. */
export function roleHasSection(role: string, section: string, custom?: unknown): boolean {
  const list = effectiveSections(role, custom)
  return list === null || list.includes(section)
}
