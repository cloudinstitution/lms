import { createHash, timingSafeEqual } from "crypto"
import { SignJWT, jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"

export const SESSION_COOKIE = "lms_session"
export const SESSION_TTL_SECONDS = 4 * 60 * 60 // matches the 4h client session in lib/session-storage.ts

export type SessionRole = "student" | "admin" | "teacher"

export interface StudentUser {
  role: "student"
  docId: string // Firestore id of the students/{docId} document
  studentId: string // human student ID, e.g. CI2026001 (also the certificate code)
  name: string
  email: string
  courseIds: number[]
  courseNames: string[]
}

export interface StaffUser {
  role: "admin" | "teacher"
  docId: string // Firestore id of the admin/{docId} document
  name: string
  email: string
}

export type SessionUser = StudentUser | StaffUser

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters")
    }
    return new TextEncoder().encode("dev-only-session-secret-change-me-0123456789")
  }
  return new TextEncoder().encode(secret)
}

/** Constant-time string comparison (hash both sides so lengths always match). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.docId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey())
}

function serializeCookie(value: string, maxAge: number): string {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Lax"]
  if (process.env.NODE_ENV === "production") parts.push("Secure")
  return parts.join("; ")
}

export function setSessionCookie(res: Response, token: string) {
  res.headers.append("Set-Cookie", serializeCookie(token, SESSION_TTL_SECONDS))
}

export function clearSessionCookie(res: Response) {
  res.headers.append("Set-Cookie", serializeCookie("", 0))
}

/**
 * Check a username/password against the same Firestore collections the existing login page uses
 * (`students`, then `admin`) but on the server, so the result can be trusted.
 */
export async function authenticate(username: string, password: string): Promise<SessionUser | null> {
  const db = getDb()
  const students = await db.collection("students").where("username", "==", username).get()
  if (!students.empty) {
    const doc = students.docs[0]
    const d = doc.data()
    if (typeof d.password !== "string" || !safeEqual(d.password, password)) return null
    if (d.status === "Inactive") return null
    return toStudentUser(doc.id, d)
  }

  const staff = await db.collection("admin").where("username", "==", username).get()
  if (!staff.empty) {
    const doc = staff.docs[0]
    const d = doc.data()
    if (typeof d.password !== "string" || !safeEqual(d.password, password)) return null
    const role = roleFromRoleId(d.roleId)
    if (!role) return null
    return { role, docId: doc.id, name: d.name || d.username, email: d.username }
  }
  return null
}

function roleFromRoleId(roleId: unknown): "admin" | "teacher" | null {
  if (roleId === 1) return "admin"
  if (roleId === 2) return "teacher"
  return null
}

function toList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  return v === undefined || v === null || v === "" ? [] : [v]
}

/**
 * Student records in this app store courses as `courseName` (array or single string) and `courseID` (array of numbers,
 * sometimes missing or misaligned). Build matching name/id lists that tolerate all of those shapes.
 */
function toStudentUser(docId: string, d: FirebaseFirestore.DocumentData): StudentUser {
  const names = toList(d.courseName ?? d.courses).map((n) => String(n).trim()).filter(Boolean)
  const rawIds = toList(d.courseID ?? d.courseId)
  const courseIds = names.map((_, i) => {
    const n = Number(rawIds[i])
    return Number.isFinite(n) && rawIds[i] !== "" && rawIds[i] != null ? n : i + 1
  })
  return {
    role: "student",
    docId,
    studentId: String(d.studentId ?? ""),
    name: String(d.name ?? ""),
    email: String(d.username ?? ""),
    courseIds,
    courseNames: names,
  }
}

/**
 * Resolve the signed-in user from the session cookie, re-reading their Firestore document so that
 * deleted / deactivated students and demoted staff lose access immediately (not after the 4h token).
 * Returns null when there is no valid session.
 */
export async function readSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  let sub: string
  let role: string
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] })
    sub = String(payload.sub || "")
    role = String(payload.role || "")
  } catch {
    return null
  }
  if (!sub) return null

  const db = getDb()
  if (role === "student") {
    const snap = await db.collection("students").doc(sub).get()
    if (!snap.exists) return null
    const d = snap.data()!
    if (d.status === "Inactive") return null
    return toStudentUser(snap.id, d)
  }
  if (role === "admin" || role === "teacher") {
    const snap = await db.collection("admin").doc(sub).get()
    if (!snap.exists) return null
    const d = snap.data()!
    const current = roleFromRoleId(d.roleId)
    if (!current || current !== role) return null
    return { role: current, docId: snap.id, name: d.name || d.username, email: d.username }
  }
  return null
}

export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await readSessionUser(req)
  if (!user) throw new ApiError(401, "Authentication required", "no_session")
  return user
}

export async function requireStudent(req: NextRequest): Promise<StudentUser> {
  const user = await requireUser(req)
  if (user.role !== "student") throw new ApiError(403, "This action is for students only")
  return user
}

/** Admin or teacher (the people who may review projects). */
export async function requireReviewer(req: NextRequest): Promise<StaffUser> {
  const user = await requireUser(req)
  if (user.role === "student") throw new ApiError(403, "Not allowed for your role")
  return user
}

export async function requireAdmin(req: NextRequest): Promise<StaffUser> {
  const user = await requireUser(req)
  if (user.role !== "admin") throw new ApiError(403, "Administrator access required")
  return user
}

/**
 * CSRF defence for state-changing requests: the browser always sends Origin on cross-site POST/PUT,
 * so if it is present it must match this host. (The cookie is also SameSite=Lax.)
 */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return
  const origin = req.headers.get("origin")
  if (!origin) return
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new ApiError(403, "Bad origin")
  }
  if (host && originHost !== host) throw new ApiError(403, "Cross-site request blocked")
}
