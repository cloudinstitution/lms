import { randomBytes } from "crypto"
import type { NextRequest } from "next/server"
import { certificateConfig, siteBaseUrl } from "./certificate-config"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import type { StudentUser, SessionUser } from "./session"
import type { CertificateDoc, CertificateStatus, CertificateView, ProjectDoc } from "./types"

export const COLLECTIONS = {
  projects: "projects",
  certificates: "certificates",
  tokens: "certificate_tokens",
  notifications: "student_notifications",
  tasks: "project_tasks",
} as const

/**
 * Certificate code == student ID (e.g. CI2026001), so the certificate document is keyed by it.
 * Using the code as the Firestore document ID is what makes duplicates impossible: creating a
 * second document with the same key fails. The prefix keeps odd custom IDs clear of Firestore's
 * reserved document-ID patterns.
 */
export const certKey = (certificateId: string) => `cert_${encodeURIComponent(certificateId.trim())}`

export const newToken = () => randomBytes(24).toString("base64url") // 192 bits
/** Token lookup documents are keyed by the token (prefixed to stay clear of reserved ID patterns). */
export const tokenKey = (token: string) => `t_${encodeURIComponent(token)}`

export function formatIssueDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
}

export function todayInConfiguredZone(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: certificateConfig.timeZone() }) // YYYY-MM-DD
}

export function verifyUrlFor(baseUrl: string, cert: Pick<CertificateDoc, "certificate_token">): string {
  return `${baseUrl}/certificate/verify/${cert.certificate_token}`
}

export function toCertificateView(cert: CertificateDoc, baseUrl: string, includeAdminFields = false): CertificateView {
  const view: CertificateView = {
    certificate_id: cert.certificate_id,
    student_id: cert.student_id,
    student_name: cert.student_name,
    course_id: cert.course_id,
    course_name: cert.course_name,
    project_title: cert.project_title,
    issue_date: cert.issue_date,
    issue_date_display: formatIssueDate(cert.issue_date),
    status: cert.status,
    revoked_at: cert.revoked_at,
    verify_url: verifyUrlFor(baseUrl, cert),
  }
  if (includeAdminFields) view.revoke_reason = cert.revoke_reason
  return view
}

async function loadCertificate(certificateId: string): Promise<CertificateDoc | null> {
  const snap = await getDb().collection(COLLECTIONS.certificates).doc(certKey(certificateId)).get()
  return snap.exists ? (snap.data() as CertificateDoc) : null
}

/** The signed-in student's certificate — only once its project is Accepted. */
export async function getStudentCertificates(student: StudentUser, req: NextRequest): Promise<CertificateView[]> {
  const cert = await loadCertificate(student.studentId)
  if (!cert || cert.student_doc_id !== student.docId) return []
  const project = await getDb().collection(COLLECTIONS.projects).doc(cert.project_id).get()
  if (!project.exists || (project.data() as ProjectDoc).status !== "Accepted") return []
  return [toCertificateView(cert, siteBaseUrl(req))]
}

/**
 * Load a certificate for its owner.
 * - 404 if it does not exist, 403 if it belongs to someone else.
 * - `forDownload` additionally enforces the rule that matters most: the backend (not the UI) checks that the
 *   project is Accepted and the certificate is Valid before anything is returned.
 */
export async function loadOwnedCertificate(
  student: StudentUser,
  certificateId: string,
  opts: { forDownload: boolean },
): Promise<CertificateDoc> {
  const cert = await loadCertificate(certificateId)
  if (!cert) throw new ApiError(404, "Certificate not found")
  if (cert.student_doc_id !== student.docId) throw new ApiError(403, "You do not have access to this certificate")

  const projectSnap = await getDb().collection(COLLECTIONS.projects).doc(cert.project_id).get()
  const accepted = projectSnap.exists && (projectSnap.data() as ProjectDoc).status === "Accepted"
  if (!accepted) throw new ApiError(403, "Certificate is not available until the project is accepted")
  if (opts.forDownload && cert.status !== "Valid") throw new ApiError(403, "This certificate has been revoked")
  return cert
}

export interface VerifyResult {
  found: boolean
  status: "VALID" | "REVOKED" | "NOT_FOUND"
  message?: string
  certificate_id?: string
  student_name?: string
  course_name?: string
  project_title?: string
  issue_date?: string
  issue_date_display?: string
  organization?: string
  revoked_at?: string | null
  is_owner?: boolean
  owner_url?: string | null
  public_download?: boolean
}

/** Resolve the key from a QR code (random token) or, unless disabled, a typed certificate ID. */
export async function findCertificateForVerify(key: string): Promise<CertificateDoc | null> {
  const db = getDb()
  const k = key.trim()
  if (!k || k.length > 200) return null

  const tokenSnap = await db.collection(COLLECTIONS.tokens).doc(tokenKey(k)).get()
  if (tokenSnap.exists) {
    const certId = (tokenSnap.data() as { certificate_id: string }).certificate_id
    return loadCertificate(certId)
  }
  if (certificateConfig.tokenOnlyVerify()) return null
  return (await loadCertificate(k)) ?? (await loadCertificate(k.toUpperCase()))
}

export async function verifyCertificate(key: string, viewer: SessionUser | null): Promise<VerifyResult> {
  const cert = await findCertificateForVerify(key)
  if (!cert) return { found: false, status: "NOT_FOUND", message: "Certificate Not Found / Invalid Certificate" }

  if (cert.status === "Revoked") {
    // Revoked: reveal nothing personal, only that this certificate is no longer valid.
    return {
      found: true,
      status: "REVOKED",
      message: "Certificate Revoked",
      certificate_id: cert.certificate_id,
      organization: certificateConfig.orgName(),
      revoked_at: cert.revoked_at,
    }
  }

  const project = await getDb().collection(COLLECTIONS.projects).doc(cert.project_id).get()
  if (!project.exists || (project.data() as ProjectDoc).status !== "Accepted") {
    return { found: false, status: "NOT_FOUND", message: "Certificate Not Found / Invalid Certificate" }
  }

  const isOwner = Boolean(viewer && viewer.role === "student" && viewer.docId === cert.student_doc_id)
  return {
    found: true,
    status: "VALID",
    certificate_id: cert.certificate_id,
    student_name: cert.student_name,
    course_name: cert.course_name,
    project_title: cert.project_title,
    issue_date: cert.issue_date,
    issue_date_display: formatIssueDate(cert.issue_date),
    organization: certificateConfig.orgName(),
    is_owner: isOwner,
    owner_url: isOwner ? `/student/certificates/${encodeURIComponent(cert.certificate_id)}` : null,
    public_download: certificateConfig.publicDownload(),
  }
}

export interface AdminCertificateFilters {
  q?: string
  course_id?: string
  from?: string
  to?: string
  status?: string
}

export async function adminListCertificates(filters: AdminCertificateFilters, req: NextRequest) {
  const snap = await getDb().collection(COLLECTIONS.certificates).get()
  const q = (filters.q || "").trim().toLowerCase()
  const base = siteBaseUrl(req)
  const rows = snap.docs
    .map((d) => d.data() as CertificateDoc)
    .filter((c) => {
      if (q && !(c.student_name.toLowerCase().includes(q) || c.student_id.toLowerCase().includes(q) || c.certificate_id.toLowerCase().includes(q) || c.project_title.toLowerCase().includes(q))) return false
      if (filters.course_id && String(c.course_id) !== filters.course_id) return false
      if (filters.from && c.issue_date < filters.from) return false
      if (filters.to && c.issue_date > filters.to) return false
      if ((filters.status === "Valid" || filters.status === "Revoked") && c.status !== filters.status) return false
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return rows.map((c) => toCertificateView(c, base, true))
}

export async function adminLoadCertificate(certificateId: string): Promise<CertificateDoc> {
  const cert = await loadCertificate(certificateId)
  if (!cert) throw new ApiError(404, "Certificate not found")
  return cert
}

/** Revoke / reactivate. Only status fields change — the code, token, student and issue date never do. */
export async function setCertificateStatus(
  certificateId: string,
  status: CertificateStatus,
  reason: string | null,
  req: NextRequest,
): Promise<CertificateView> {
  const db = getDb()
  const ref = db.collection(COLLECTIONS.certificates).doc(certKey(certificateId))
  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ApiError(404, "Certificate not found")
    const cert = snap.data() as CertificateDoc
    const now = new Date().toISOString()
    const next: CertificateDoc = {
      ...cert,
      status,
      revoke_reason: status === "Revoked" ? reason : null,
      revoked_at: status === "Revoked" ? (cert.status === "Revoked" ? cert.revoked_at : now) : null,
      updated_at: now,
    }
    tx.update(ref, {
      status: next.status,
      revoke_reason: next.revoke_reason,
      revoked_at: next.revoked_at,
      updated_at: next.updated_at,
    })
    return next
  })
  return toCertificateView(updated, siteBaseUrl(req), true)
}
