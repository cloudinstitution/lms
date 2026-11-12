import { cleanSections, effectiveSections, roleDef, roleFromRoleId, STAFF_ROLES, type StaffRole } from "../staff-roles"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"

export interface StaffView { id: string; name: string; email: string; role: StaffRole; role_label: string; sections: string[] | null; created_at: string | null }

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toView(id: string, d: FirebaseFirestore.DocumentData): StaffView | null {
  const role = roleFromRoleId(d.roleId)
  if (!role) return null
  const c = d.createdAt
  const created = c?.toDate ? c.toDate().toISOString() : typeof c === "string" ? c : null
  return { id, name: String(d.name || d.username || ""), email: String(d.username || ""), role, role_label: roleDef(role)!.label, sections: effectiveSections(role, d.sections), created_at: created }
}

function roleIdFor(role: unknown): number {
  const def = STAFF_ROLES.find((r) => r.role === role)
  if (!def) throw new ApiError(400, "Choose a valid role")
  return def.roleId
}

export async function listStaff(): Promise<StaffView[]> {
  const snap = await getDb().collection("admin").get()
  return snap.docs.map((d) => toView(d.id, d.data())).filter((v): v is StaffView => v !== null).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createStaff(input: Record<string, unknown>): Promise<StaffView> {
  const name = str(input.name)
  const email = str(input.email).toLowerCase()
  const password = typeof input.password === "string" ? input.password : ""
  if (!name) throw new ApiError(400, "Name is required")
  if (!EMAIL.test(email)) throw new ApiError(400, "Enter a valid email address")
  if (password.length < 6) throw new ApiError(400, "Password must be at least 6 characters")
  const roleId = roleIdFor(input.role)
  const db = getDb()
  // The login looks users up by username in both collections, so the address must be free in each.
  const [staff, students] = await Promise.all([db.collection("admin").where("username", "==", email).get(), db.collection("students").where("username", "==", email).get()])
  if (!staff.empty || !students.empty) throw new ApiError(409, "A user with this email already exists")
  const custom = input.sections === undefined ? null : cleanSections(input.sections)
  if (input.sections !== undefined && custom === null) throw new ApiError(400, "Pages must be a list")
  const data: Record<string, unknown> = { name, username: email, password, roleId, assignedCourses: [], createdAt: new Date() }
  if (custom && input.role !== "admin") data.sections = custom
  const ref = await db.collection("admin").add(data)
  return toView(ref.id, data)!
}

async function adminCount(): Promise<number> {
  return (await getDb().collection("admin").where("roleId", "==", 1).get()).size
}

export async function updateStaff(id: string, actorId: string, input: Record<string, unknown>): Promise<StaffView> {
  const ref = getDb().collection("admin").doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new ApiError(404, "User not found")
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) { const n = str(input.name); if (!n) throw new ApiError(400, "Name is required"); patch.name = n }
  if (input.password !== undefined && input.password !== "") {
    if (typeof input.password !== "string" || input.password.length < 6) throw new ApiError(400, "Password must be at least 6 characters")
    patch.password = input.password
  }
  if (input.role !== undefined) {
    const roleId = roleIdFor(input.role)
    if (roleId !== snap.data()!.roleId) {
      if (id === actorId) throw new ApiError(400, "You can't change your own role")
      if (snap.data()!.roleId === 1 && (await adminCount()) <= 1) throw new ApiError(400, "There must be at least one administrator")
      patch.roleId = roleId
      patch.sections = null // a new role starts from its own default pages
    }
  }
  if (input.sections !== undefined) {
    const custom = input.sections === null ? null : cleanSections(input.sections)
    if (input.sections !== null && custom === null) throw new ApiError(400, "Pages must be a list")
    const finalRole = roleFromRoleId(patch.roleId ?? snap.data()!.roleId)
    if (finalRole === "admin" && custom) throw new ApiError(400, "Administrators always have access to every page")
    patch.sections = custom
  }
  if (Object.keys(patch).length) await ref.update(patch)
  return toView(id, { ...snap.data()!, ...patch })!
}

export async function deleteStaff(id: string, actorId: string): Promise<void> {
  if (id === actorId) throw new ApiError(400, "You can't delete your own account")
  const ref = getDb().collection("admin").doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new ApiError(404, "User not found")
  if (snap.data()!.roleId === 1 && (await adminCount()) <= 1) throw new ApiError(400, "There must be at least one administrator")
  await ref.delete()
}
