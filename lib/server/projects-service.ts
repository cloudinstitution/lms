import type { NextRequest } from "next/server"
import { siteBaseUrl } from "./certificate-config"
import {
  COLLECTIONS,
  certKey,
  newToken,
  todayInConfiguredZone,
  toCertificateView,
  tokenKey,
} from "./certificates-service"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import type { StaffUser, StudentUser } from "./session"
import { deleteStoredFiles, verifyUploadedFiles, type SubmittedFile } from "./storage"
import type {
  CertificateDoc,
  CertificateView,
  ProjectDoc,
  ProjectStatus,
  ProjectTaskDoc,
  ProjectTaskView,
  ProjectView,
} from "./types"

const ACTIVE_STATUSES: ProjectStatus[] = ["Submitted", "Under Review", "Accepted"]
const RESUBMITTABLE: ProjectStatus[] = ["Rejected", "Resubmission Required"]

const iso = () => new Date().toISOString()

export function toProjectView(
  id: string,
  p: ProjectDoc,
  cert: Pick<CertificateDoc, "certificate_id" | "status" | "project_id"> | null | undefined,
): ProjectView {
  const linked = cert && cert.project_id === id ? cert : null
  return {
    id,
    task_id: p.task_id ?? null,
    student_doc_id: p.student_doc_id,
    student_id: p.student_id,
    student_name: p.student_name,
    course_id: p.course_id,
    course_name: p.course_name,
    project_title: p.project_title,
    project_description: p.project_description,
    category: p.category,
    submission_date: p.submission_date,
    status: p.status,
    admin_remarks: p.admin_remarks,
    reviewed_by_name: p.reviewed_by_name,
    reviewed_at: p.reviewed_at,
    updated_at: p.updated_at,
    files: p.files.map((f) => ({ id: f.id, kind: f.kind, name: f.name, size: f.size })), // storage paths stay server-side
    certificate: linked ? { certificate_id: linked.certificate_id, status: linked.status } : null,
    certificate_available: Boolean(linked && p.status === "Accepted" && linked.status === "Valid"),
  }
}

async function addNotification(studentDocId: string, title: string, message: string) {
  try {
    await getDb().collection(COLLECTIONS.notifications).add({
      student_doc_id: studentDocId,
      title,
      message,
      type: "project",
      read: false,
      created_at: iso(),
    })
  } catch (e) {
    console.error("Failed to store notification:", e)
  }
}

/* -------------------------------------------------------------------------- */
/*  Student side                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The courses a student may submit a project for: the ones on their record. If their record has none (e.g. the account was
 * created without a course), fall back to the institute's course list so they are not blocked; the reviewer sees the chosen course.
 */
export async function studentCourses(student: StudentUser): Promise<{ id: number; name: string }[]> {
  if (student.courseNames.length) return student.courseNames.map((name, i) => ({ id: student.courseIds[i], name }))
  const snap = await getDb().collection("courses").get()
  const out: { id: number; name: string }[] = []
  snap.docs.forEach((d, i) => {
    const c = d.data() as { title?: unknown; name?: unknown; courseID?: unknown }
    const name = String(c.title ?? c.name ?? "").trim()
    const n = Number(c.courseID)
    if (name) out.push({ id: Number.isFinite(n) && c.courseID !== "" && c.courseID != null ? n : i + 1, name })
  })
  return out
}

/* -------------------------------------------------------------------------- */
/*  Assigned projects (created by admin / teacher, per course)                */
/* -------------------------------------------------------------------------- */

const norm = (s: string) => s.trim().toLowerCase()

/** A task belongs to a student's course when the ids or the names match. */
export function matchesTaskCourse(c: { id: number; name: string }, t: { course_id: number; course_name: string }): boolean {
  return c.id === t.course_id || norm(c.name) === norm(t.course_name)
}

export interface TaskInput {
  course_id?: unknown
  course_name?: unknown
  title?: unknown
  description?: unknown
  category?: unknown
  due_date?: unknown
  resource_url?: unknown
  file_name?: unknown
  file_url?: unknown
  file_size?: unknown
  active?: unknown
}

function parseTask(input: TaskInput): Omit<ProjectTaskDoc, "created_by_name" | "created_at" | "updated_at"> {
  const title = cleanText(input.title, "Project title", 200)
  const description = cleanText(input.description, "Project details", 5000)
  const course_name = cleanText(input.course_name, "Course", 200)
  const n = Number(input.course_id)
  const course_id = Number.isFinite(n) && input.course_id !== "" && input.course_id != null ? n : 0
  const category = typeof input.category === "string" && input.category.trim() ? input.category.trim().slice(0, 80) : "General"
  let due_date: string | null = null
  if (typeof input.due_date === "string" && input.due_date.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due_date.trim())) throw new ApiError(400, "Due date must be YYYY-MM-DD")
    due_date = input.due_date.trim()
  }
  let resource_url: string | null = null
  if (typeof input.resource_url === "string" && input.resource_url.trim()) {
    const u = input.resource_url.trim()
    if (!/^https?:\/\//i.test(u) || u.length > 500) throw new ApiError(400, "Link must start with http:// or https://")
    resource_url = u
  }
  let file_name: string | null = null
  let file_url: string | null = null
  let file_size: number | null = null
  if (typeof input.file_url === "string" && input.file_url.trim()) {
    const u = input.file_url.trim()
    if (!/^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com|[a-z0-9-]+\.firebasestorage\.app)\//i.test(u) || u.length > 2000) {
      throw new ApiError(400, "Uploaded file link is not valid")
    }
    file_url = u
    file_name = typeof input.file_name === "string" && input.file_name.trim() ? input.file_name.trim().slice(0, 200) : "project-file"
    const n = Number(input.file_size)
    file_size = Number.isFinite(n) && n > 0 ? n : null
  }
  return { course_id, course_name, title, description, category, due_date, resource_url, file_name, file_url, file_size, active: input.active === false ? false : true }
}

export async function createTask(staff: StaffUser, input: TaskInput): Promise<ProjectTaskView> {
  const now = iso()
  const doc: ProjectTaskDoc = { ...parseTask(input), created_by_name: staff.name, created_at: now, updated_at: now }
  const ref = await getDb().collection(COLLECTIONS.tasks).add(doc)
  return { id: ref.id, ...doc }
}

export async function updateTask(id: string, input: TaskInput): Promise<ProjectTaskView> {
  const ref = getDb().collection(COLLECTIONS.tasks).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new ApiError(404, "Project not found")
  const prev = snap.data() as ProjectTaskDoc
  const next = { ...prev, ...parseTask({ ...prev, ...input }), updated_at: iso() }
  await ref.set(next)
  return { id, ...next }
}

/** Deleting a project that students already submitted for only hides it, so their history stays intact. */
export async function deleteTask(id: string): Promise<{ deleted: boolean; hidden: boolean }> {
  const db = getDb()
  const ref = db.collection(COLLECTIONS.tasks).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new ApiError(404, "Project not found")
  const used = await db.collection(COLLECTIONS.projects).where("task_id", "==", id).get()
  if (!used.empty) {
    await ref.update({ active: false, updated_at: iso() })
    return { deleted: false, hidden: true }
  }
  await ref.delete()
  return { deleted: true, hidden: false }
}

export async function adminListTasks(): Promise<ProjectTaskView[]> {
  const db = getDb()
  const [tasks, projects] = await Promise.all([db.collection(COLLECTIONS.tasks).get(), db.collection(COLLECTIONS.projects).get()])
  const counts = new Map<string, number>()
  projects.docs.forEach((d) => {
    const t = (d.data() as ProjectDoc).task_id
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1)
  })
  return tasks.docs
    .map((d) => ({ id: d.id, ...(d.data() as ProjectTaskDoc), submissions: counts.get(d.id) ?? 0 }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** Courses the admin can assign a project to: the institute's `courses` collection. */
export async function listAllCourses(): Promise<{ id: number; name: string }[]> {
  const snap = await getDb().collection("courses").get()
  const out: { id: number; name: string }[] = []
  snap.docs.forEach((d, i) => {
    const c = d.data() as { title?: unknown; name?: unknown; courseID?: unknown }
    const name = String(c.title ?? c.name ?? "").trim()
    const n = Number(c.courseID)
    if (name) out.push({ id: Number.isFinite(n) && c.courseID !== "" && c.courseID != null ? n : i + 1, name })
  })
  return out
}

/** Active projects assigned to the student's courses, with the student's own submission status for each. */
export async function listStudentTasks(student: StudentUser): Promise<ProjectTaskView[]> {
  const db = getDb()
  const [courses, tasks, mine] = await Promise.all([
    studentCourses(student),
    db.collection(COLLECTIONS.tasks).get(),
    db.collection(COLLECTIONS.projects).where("student_doc_id", "==", student.docId).get(),
  ])
  const latest = new Map<string, ProjectDoc>()
  mine.docs.forEach((d) => {
    const p = d.data() as ProjectDoc
    if (!p.task_id) return
    const cur = latest.get(p.task_id)
    if (!cur || p.submission_date > cur.submission_date) latest.set(p.task_id, p)
  })
  return tasks.docs
    .map((d) => ({ id: d.id, ...(d.data() as ProjectTaskDoc) }))
    .filter((t) => t.active !== false && courses.some((c) => matchesTaskCourse(c, t)))
    .map((t) => ({ ...t, my_status: latest.get(t.id)?.status ?? null }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export interface SubmitInput {
  task_id?: unknown
  course_id?: unknown
  project_title?: unknown
  project_description?: unknown
  category?: unknown
  project_id?: unknown
  files: SubmittedFile[]
}

function cleanText(value: unknown, label: string, max: number): string {
  const s = typeof value === "string" ? value.trim() : ""
  if (!s) throw new ApiError(400, `${label} is required`)
  if (s.length > max) throw new ApiError(400, `${label} is too long (max ${max} characters)`)
  return s
}

/**
 * Create a submission, or resubmit one that was Rejected / marked "Resubmission Required".
 * The student's identity, status and dates are all decided here — never taken from the request body.
 */
export async function submitProject(student: StudentUser, input: SubmitInput): Promise<ProjectView> {
  const db = getDb()
  const resubmitId = typeof input.project_id === "string" && input.project_id ? input.project_id : null
  let taskId = typeof input.task_id === "string" && input.task_id ? input.task_id : null
  if (!taskId && resubmitId) {
    const prev = await db.collection(COLLECTIONS.projects).doc(resubmitId).get()
    const pd = prev.exists ? (prev.data() as ProjectDoc) : null
    if (pd && pd.student_doc_id === student.docId) taskId = pd.task_id ?? null
  }
  if (!taskId) throw new ApiError(400, "Please choose the project you are submitting")
  const taskSnap = await db.collection(COLLECTIONS.tasks).doc(taskId).get()
  if (!taskSnap.exists || (taskSnap.data() as ProjectTaskDoc).active === false) throw new ApiError(404, "That project is no longer available")
  const task = taskSnap.data() as ProjectTaskDoc
  const course = (await studentCourses(student)).find((c) => matchesTaskCourse(c, task))
  if (!course) throw new ApiError(403, "This project is not assigned to your course")

  // The title, category and course come from the admin's assignment, not from the student.
  const title = task.title
  const category = task.category || "General"
  const courseId = course.id
  const courseName = course.name
  const rawNotes = typeof input.project_description === "string" ? input.project_description.trim() : ""
  if (rawNotes.length > 5000) throw new ApiError(400, "Notes are too long (max 5000 characters)")
  const description = rawNotes || "Submitted for the assigned project."

  const files = await verifyUploadedFiles(student.docId, input.files)

  const certRef = db.collection(COLLECTIONS.certificates).doc(certKey(student.studentId))
  const mineQuery = db.collection(COLLECTIONS.projects).where("student_doc_id", "==", student.docId)
  const now = iso()
  let projectId = ""
  let oldPaths: string[] = []

  const doc: ProjectDoc = {
    task_id: taskId,
    student_doc_id: student.docId,
    student_id: student.studentId,
    student_name: student.name,
    student_email: student.email,
    course_id: courseId,
    course_name: courseName,
    project_title: title,
    project_description: description,
    category,
    files,
    project_file: files.find((f) => f.kind === "project")?.path ?? null,
    submission_date: now,
    status: "Submitted",
    admin_remarks: null,
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    certificate_id: null,
    created_at: now,
    updated_at: now,
  }

  await db.runTransaction(async (tx) => {
    const certSnap = await tx.get(certRef)
    const mine = await tx.get(mineQuery)

    // One certificate per student (the certificate code IS the student ID).
    if (certSnap.exists) {
      throw new ApiError(409, `You already hold certificate ${student.studentId}. A new project submission is not needed.`)
    }

    if (resubmitId) {
      const target = mine.docs.find((d) => d.id === resubmitId)
      if (!target) throw new ApiError(404, "Project not found")
      const existing = target.data() as ProjectDoc
      if (!RESUBMITTABLE.includes(existing.status)) {
        throw new ApiError(409, `A project in status "${existing.status}" cannot be resubmitted`)
      }
      if (existing.task_id && existing.task_id !== taskId) throw new ApiError(400, "The project cannot be changed when resubmitting")
      oldPaths = existing.files.map((f) => f.path)
      tx.update(target.ref, {
        task_id: taskId,
        project_title: title,
        project_description: description,
        category,
        files,
        project_file: doc.project_file,
        submission_date: now,
        status: "Submitted",
        reviewed_by: null,
        reviewed_by_name: null,
        reviewed_at: null,
        updated_at: now,
      })
      projectId = target.id
    } else {
      const active = mine.docs.find((d) => ACTIVE_STATUSES.includes((d.data() as ProjectDoc).status))
      if (active) {
        throw new ApiError(409, `You already have a project in status "${(active.data() as ProjectDoc).status}". Only one active submission is allowed.`)
      }
      const ref = db.collection(COLLECTIONS.projects).doc()
      tx.create(ref, doc)
      projectId = ref.id
    }
  })

  const kept = new Set(files.map((f) => f.path))
  const stale = oldPaths.filter((p) => !kept.has(p))
  if (stale.length) void deleteStoredFiles(stale)

  const snap = await db.collection(COLLECTIONS.projects).doc(projectId).get()
  return toProjectView(projectId, snap.data() as ProjectDoc, null)
}

export async function listStudentProjects(student: StudentUser): Promise<ProjectView[]> {
  const db = getDb()
  const [projects, certSnap] = await Promise.all([
    db.collection(COLLECTIONS.projects).where("student_doc_id", "==", student.docId).get(),
    db.collection(COLLECTIONS.certificates).doc(certKey(student.studentId)).get(),
  ])
  const cert = certSnap.exists ? (certSnap.data() as CertificateDoc) : null
  return projects.docs
    .map((d) => ({ id: d.id, p: d.data() as ProjectDoc }))
    .sort((a, b) => b.p.submission_date.localeCompare(a.p.submission_date))
    .map(({ id, p }) => toProjectView(id, p, cert))
}

export async function getStudentProjectFile(student: StudentUser, projectId: string, fileId: string) {
  const snap = await getDb().collection(COLLECTIONS.projects).doc(projectId).get()
  if (!snap.exists) throw new ApiError(404, "Project not found")
  const p = snap.data() as ProjectDoc
  if (p.student_doc_id !== student.docId) throw new ApiError(404, "Project not found") // don't reveal others' projects
  const f = p.files.find((x) => x.id === fileId)
  if (!f) throw new ApiError(404, "File not found")
  return f
}

export async function listStudentNotifications(student: StudentUser) {
  const snap = await getDb()
    .collection(COLLECTIONS.notifications)
    .where("student_doc_id", "==", student.docId)
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as { title: string; message: string; read: boolean; created_at: string }) }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50)
}

export async function markNotificationRead(student: StudentUser, id: string) {
  const ref = getDb().collection(COLLECTIONS.notifications).doc(id)
  const snap = await ref.get()
  if (!snap.exists || (snap.data() as { student_doc_id: string }).student_doc_id !== student.docId) {
    throw new ApiError(404, "Notification not found")
  }
  await ref.update({ read: true })
}

/* -------------------------------------------------------------------------- */
/*  Reviewer side (admin / teacher)                                           */
/* -------------------------------------------------------------------------- */

export interface AdminProjectFilters {
  status?: string
  q?: string
  course_id?: string
}

export async function adminListProjects(filters: AdminProjectFilters) {
  const db = getDb()
  const [projects, certs] = await Promise.all([
    db.collection(COLLECTIONS.projects).get(),
    db.collection(COLLECTIONS.certificates).get(),
  ])
  const certByProject = new Map<string, CertificateDoc>()
  certs.docs.forEach((d) => {
    const c = d.data() as CertificateDoc
    certByProject.set(c.project_id, c)
  })
  const all = projects.docs.map((d) => ({ id: d.id, p: d.data() as ProjectDoc }))

  const count = (pred: (s: ProjectStatus) => boolean) => all.filter(({ p }) => pred(p.status)).length
  const counts = {
    pending: count((s) => s === "Submitted" || s === "Under Review"),
    accepted: count((s) => s === "Accepted"),
    rejected: count((s) => s === "Rejected"),
    resubmission: count((s) => s === "Resubmission Required"),
  }

  const q = (filters.q || "").trim().toLowerCase()
  const rows = all
    .filter(({ p }) => {
      if (filters.status === "pending") {
        if (p.status !== "Submitted" && p.status !== "Under Review") return false
      } else if (filters.status && p.status !== filters.status) return false
      if (filters.course_id && String(p.course_id) !== filters.course_id) return false
      if (q && !(p.student_name.toLowerCase().includes(q) || p.student_id.toLowerCase().includes(q) || p.project_title.toLowerCase().includes(q))) return false
      return true
    })
    .sort((a, b) => b.p.submission_date.localeCompare(a.p.submission_date))
    .map(({ id, p }) => toProjectView(id, p, certByProject.get(id)))
  return { projects: rows, counts }
}

async function certificateForProject(projectId: string, studentId: string) {
  const snap = await getDb().collection(COLLECTIONS.certificates).doc(certKey(studentId)).get()
  const c = snap.exists ? (snap.data() as CertificateDoc) : null
  return c && c.project_id === projectId ? c : null
}

/** Open a project for review. A fresh "Submitted" project moves to "Under Review". */
export async function adminOpenProject(id: string, reviewer: StaffUser): Promise<ProjectView> {
  const db = getDb()
  const ref = db.collection(COLLECTIONS.projects).doc(id)
  const project = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ApiError(404, "Project not found")
    let p = snap.data() as ProjectDoc
    if (p.status === "Submitted") {
      const patch = { status: "Under Review" as const, reviewed_by: reviewer.docId, reviewed_by_name: reviewer.name, updated_at: iso() }
      tx.update(ref, patch)
      p = { ...p, ...patch }
    }
    return p
  })
  return toProjectView(id, project, await certificateForProject(id, project.student_id))
}

export async function adminGetProjectFile(id: string, fileId: string) {
  const snap = await getDb().collection(COLLECTIONS.projects).doc(id).get()
  if (!snap.exists) throw new ApiError(404, "Project not found")
  const f = (snap.data() as ProjectDoc).files.find((x) => x.id === fileId)
  if (!f) throw new ApiError(404, "File not found")
  return f
}

/** Reject, or ask for resubmission. Remarks are mandatory and are sent to the student. */
export async function adminDecide(
  id: string,
  reviewer: StaffUser,
  status: "Rejected" | "Resubmission Required",
  remarks: unknown,
): Promise<ProjectView> {
  const text = typeof remarks === "string" ? remarks.trim() : ""
  if (!text) throw new ApiError(400, "Remarks are required for this action")
  if (text.length > 3000) throw new ApiError(400, "Remarks are too long")

  const db = getDb()
  const ref = db.collection(COLLECTIONS.projects).doc(id)
  const project = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ApiError(404, "Project not found")
    const p = snap.data() as ProjectDoc
    if (p.status === "Accepted") {
      throw new ApiError(409, "Project is already accepted. Revoke its certificate instead of changing the decision.")
    }
    const now = iso()
    const patch = { status, admin_remarks: text, reviewed_by: reviewer.docId, reviewed_by_name: reviewer.name, reviewed_at: now, updated_at: now }
    tx.update(ref, patch)
    return { ...p, ...patch } as ProjectDoc
  })

  await addNotification(
    project.student_doc_id,
    "Project Requires Changes",
    `Your project “${project.project_title}” requires modification.\n\nAdmin Remarks:\n${text}\n\nPlease update and resubmit your project.`,
  )
  return toProjectView(id, project, null)
}

export interface AcceptResult {
  project: ProjectView
  certificate: CertificateView
  created: boolean
}

/**
 * Accept a project and — in the same transaction — issue its certificate.
 *
 * - Certificate code = the student's ID. The certificate document is keyed by it, so a duplicate is
 *   impossible (and a student can hold only one).
 * - The random QR token gets its own lookup document, created in the same transaction; creating a
 *   token that already exists fails, which is what enforces token uniqueness.
 * - Idempotent: accepting an already-accepted project returns the existing certificate untouched.
 */
export async function acceptProject(id: string, reviewer: StaffUser, remarks: unknown, req: NextRequest): Promise<AcceptResult> {
  const note = typeof remarks === "string" && remarks.trim() ? remarks.trim().slice(0, 3000) : null
  const db = getDb()
  const projectRef = db.collection(COLLECTIONS.projects).doc(id)

  let attempt = 0
  for (;;) {
    attempt++
    try {
      const result = await db.runTransaction(async (tx) => {
        const projectSnap = await tx.get(projectRef)
        if (!projectSnap.exists) throw new ApiError(404, "Project not found")
        const project = projectSnap.data() as ProjectDoc
        if (!project.student_id) throw new ApiError(409, "Student has no student ID, so a certificate code cannot be created")

        const certRef = db.collection(COLLECTIONS.certificates).doc(certKey(project.student_id))
        const certSnap = await tx.get(certRef)
        const token = newToken()
        const tokenRef = db.collection(COLLECTIONS.tokens).doc(tokenKey(token))
        const tokenSnap = await tx.get(tokenRef) // reads must come before writes

        if (certSnap.exists) {
          const existing = certSnap.data() as CertificateDoc
          if (existing.project_id !== id) {
            throw new ApiError(
              409,
              `${project.student_name} already holds certificate ${existing.certificate_id} (for another project). Revoke it before accepting a different project.`,
            )
          }
          if (project.status === "Accepted") {
            return { project, cert: existing, created: false } // idempotent
          }
        }
        if (tokenSnap.exists) throw new TokenCollision()

        const now = iso()
        const projectPatch = {
          status: "Accepted" as const,
          admin_remarks: note,
          reviewed_by: reviewer.docId,
          reviewed_by_name: reviewer.name,
          reviewed_at: now,
          certificate_id: project.student_id,
          updated_at: now,
        }
        tx.update(projectRef, projectPatch)

        if (certSnap.exists) {
          // Same project, certificate already there but project wasn't Accepted (e.g. re-accepted after a manual fix).
          return { project: { ...project, ...projectPatch }, cert: certSnap.data() as CertificateDoc, created: false }
        }

        const cert: CertificateDoc = {
          certificate_id: project.student_id,
          certificate_token: token,
          student_doc_id: project.student_doc_id,
          student_id: project.student_id,
          project_id: id,
          course_id: project.course_id,
          student_name: project.student_name,
          course_name: project.course_name,
          project_title: project.project_title,
          issue_date: todayInConfiguredZone(),
          certificate_file_url: `/api/student/certificates/${encodeURIComponent(project.student_id)}/download`,
          qr_code_url: `/api/student/certificates/${encodeURIComponent(project.student_id)}/qr`,
          status: "Valid",
          revoke_reason: null,
          created_at: now,
          updated_at: now,
          revoked_at: null,
        }
        tx.create(certRef, cert)
        tx.create(tokenRef, { certificate_id: cert.certificate_id, created_at: now })
        return { project: { ...project, ...projectPatch }, cert, created: true }
      })

      if (result.created) {
        await addNotification(
          result.project.student_doc_id,
          "Project Approved!",
          `Congratulations! Your project “${result.project.project_title}” has been reviewed and accepted.\n\nYour certificate is now available in the LMS under My Certificates.`,
        )
      }
      return {
        project: toProjectView(id, result.project, result.cert),
        certificate: toCertificateView(result.cert, siteBaseUrl(req), true),
        created: result.created,
      }
    } catch (e) {
      if (e instanceof TokenCollision && attempt < 5) continue // astronomically unlikely; just draw another token
      throw e
    }
  }
}

class TokenCollision extends Error {}
