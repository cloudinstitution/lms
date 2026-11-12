/** Staff roles stored in the `admin` collection as `roleId`. Shared by the server (API guards) and the client (menus). */
export type StaffRole = "admin" | "teacher" | "hr" | "placement" | "accounts"

/** Admin-portal sections, named by the path segment after /admin/. */
export interface StaffRoleDef {
  role: StaffRole
  roleId: number
  label: string
  description: string
  /** null = everything. Otherwise the sections this role may open (the dashboard is always allowed). */
  sections: string[] | null
}

export const STAFF_ROLES: StaffRoleDef[] = [
  { role: "admin", roleId: 1, label: "Administrator", description: "Full access, including creating users and roles.", sections: null },
  { role: "teacher", roleId: 2, label: "Teacher", description: "Students, courses, schedule, assessments, attendance, projects.", sections: null },
  { role: "hr", roleId: 3, label: "HR Manager", description: "HR & Employees: employees, attendance, leaves, payslips, offer and internship letters.", sections: ["hr", "notifications"] },
  { role: "placement", roleId: 4, label: "Placement Officer", description: "Jobs (incl. automatic job search), company questions, students, certificates.", sections: ["job", "company-questions", "students", "certificates", "notifications"] },
  { role: "accounts", roleId: 5, label: "Accounts / Counsellor", description: "Enrollments, payment requests, course fees, students.", sections: ["enrollments", "students", "notifications"] },
]

export const roleFromRoleId = (roleId: unknown): StaffRole | null => STAFF_ROLES.find((r) => r.roleId === roleId)?.role ?? null
export const roleDef = (role: string): StaffRoleDef | undefined => STAFF_ROLES.find((r) => r.role === role)
export const isStaffRole = (role: unknown): role is StaffRole => STAFF_ROLES.some((r) => r.role === role)

/** Can this role use the admin-portal section (e.g. "hr")? Teachers keep their own menu in role-config. */
export function roleHasSection(role: string, section: string): boolean {
  if (role === "admin") return true
  const def = roleDef(role)
  return Boolean(def?.sections?.includes(section))
}
