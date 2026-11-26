import { getDb } from "./firebase-admin"
import { listCompanies } from "./hr-service"

/** What a public verification of an internship shows. Never includes email, USN, stipend or other private details. */
export type InternshipVerification =
  | { status: "NOT_FOUND" }
  | { status: "VALID"; kind: "internship" | "vtu"; internship_id: string; candidate_name: string; role: string; organization: string; location?: string; mode?: string; duration: string; start_date?: string; end_date?: string; issued_on: string; progress: "Upcoming" | "Ongoing" | "Completed" | "Issued" }

const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9\-_]{3,40}$/

export async function verifyInternship(rawId: string): Promise<InternshipVerification> {
  const id = String(rawId ?? "").trim().toUpperCase()
  if (!ID_RE.test(id)) return { status: "NOT_FOUND" }
  const db = getDb()
  const mine = (await db.collection("internships").get()).docs.map((d) => d.data() as any).find((o) => String(o.internship_id ?? "").toUpperCase() === id)
  if (mine) {
    const org = (await listCompanies()).find((c) => c.id === mine.company_id)?.name ?? "Cloud Institution"
    const today = todayIst()
    const progress = mine.start_date && today < mine.start_date ? "Upcoming" : mine.end_date ? (today > mine.end_date ? "Completed" : "Ongoing") : "Ongoing"
    return { status: "VALID", kind: "internship", internship_id: mine.internship_id, candidate_name: mine.candidate_name, role: mine.position || "Intern", organization: org, location: mine.location, mode: mine.work_mode,
      duration: `${mine.duration_value} ${String(mine.duration_unit || "Months").toLowerCase()}`, start_date: mine.start_date, end_date: mine.end_date || undefined, issued_on: mine.offer_date, progress }
  }
  const v = (await db.collection("vtu_internships").get()).docs.map((d) => d.data() as any).find((o) => String(o.vtu_id ?? "").toUpperCase() === id)
  if (v) return { status: "VALID", kind: "vtu", internship_id: v.vtu_id, candidate_name: v.candidate_name, role: v.program, organization: "Cloud Institution (VTU Internship Portal)", duration: `${v.weeks} weeks`, issued_on: v.offer_date, progress: "Issued" }
  return { status: "NOT_FOUND" }
}
