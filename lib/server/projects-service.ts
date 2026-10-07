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

export interface SubmitInput {
  course_id: unknown
  project_title: unknown
  project_description: unknown
  category: unknown
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
  const title = cleanText(input.project_title, "Project title", 200)
  const description = cleanText(input.project_description, "Project description", 5000)
  const category = cleanText(input.category, "Project category", 80)
  const courseId = Number(input.course_id)
  const idx = student.courseIds.indexOf(courseId)
  if (!Number.isInteger(courseId) || idx === -1) throw new ApiError(403, "You are not enrolled in that course")
  const courseName = student.courseNames[idx] || `Course ${courseId}`
  const resubmitId = typeof input.project_id === "string" && input.project_id ? input.project_id : null

  const files = await verifyUploadedFiles(student.docId, input.files)

  const db = getDb()
  const certRef = db.collection(COLLECTIONS.certificates).doc(certKey(student.studentId))
  const mineQuery = db.collection(COLLECTIONS.projects).where("student_doc_id", "==", student.docId)
  const now = iso()
  let projectId = ""
  let oldPaths: string[] = []

  const doc: ProjectDoc = {
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
      if (existing.course_id !== courseId) throw new ApiError(400, "The course cannot be changed when resubmitting")
      oldPaths = existing.files.map((f) => f.path)
      tx.update(target.ref, {
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
