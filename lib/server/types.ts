export const PROJECT_STATUSES = [
  "Submitted",
  "Under Review",
  "Accepted",
  "Rejected",
  "Resubmission Required",
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export type CertificateStatus = "Valid" | "Revoked"

export interface ProjectFile {
  id: string
  kind: "project" | "supporting"
  name: string
  size: number
  content_type: string
  path: string // storage path — never sent to clients
}

/** Firestore document: projects/{autoId} */
export interface ProjectDoc {
  student_doc_id: string
  student_id: string // e.g. CI2026001
  student_name: string
  student_email: string
  course_id: number
  course_name: string
  project_title: string
  project_description: string
  category: string
  files: ProjectFile[]
  project_file: string | null // first project file path (kept for parity with the spec's field list)
  submission_date: string
  status: ProjectStatus
  admin_remarks: string | null
  reviewed_by: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  certificate_id: string | null
  created_at: string
  updated_at: string
}

/** Firestore document: certificates/cert_{encodeURIComponent(studentId)} — one per student */
export interface CertificateDoc {
  certificate_id: string // == the student's ID, e.g. CI2026001
  certificate_token: string // random, used in the QR URL
  student_doc_id: string
  student_id: string
  project_id: string
  course_id: number
  student_name: string
  course_name: string
  project_title: string
  issue_date: string // YYYY-MM-DD
  certificate_file_url: string
  qr_code_url: string
  status: CertificateStatus
  revoke_reason: string | null
  created_at: string
  updated_at: string
  revoked_at: string | null
}

export interface ProjectView {
  id: string
  student_doc_id: string
  student_id: string
  student_name: string
  course_id: number
  course_name: string
  project_title: string
  project_description: string
  category: string
  submission_date: string
  status: ProjectStatus
  admin_remarks: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  updated_at: string
  files: { id: string; kind: "project" | "supporting"; name: string; size: number }[]
  certificate: { certificate_id: string; status: CertificateStatus } | null
  certificate_available: boolean
}

export interface CertificateView {
  certificate_id: string
  student_id: string
  student_name: string
  course_id: number
  course_name: string
  project_title: string
  issue_date: string
  issue_date_display: string
  status: CertificateStatus
  revoke_reason?: string | null
  revoked_at: string | null
  verify_url: string
}
