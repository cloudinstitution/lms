import { getDb } from "./firebase-admin"
import { ApiError } from "./http"

const iso = () => new Date().toISOString()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

export async function createConsultation(input: any) {
  const name = str(input?.name, 80)
  if (name.length < 2) throw new ApiError(400, "Please enter your name")
  const phone = str(input?.phone, 20).replace(/[\s()-]/g, "").replace(/^\+?91/, "")
  if (!/^[6-9]\d{9}$/.test(phone)) throw new ApiError(400, "Enter a valid 10-digit mobile number")
  const email = str(input?.email, 120).toLowerCase()
  if (email && !EMAIL_RE.test(email)) throw new ApiError(400, "Enter a valid email address")
  const doc = { name, phone, email, interest: str(input?.interest, 120), message: str(input?.message, 500), status: "New", created_at: iso() }
  const ref = getDb().collection("consultations").doc()
  await ref.set(doc)
  return { id: ref.id }
}

export async function listConsultations() {
  const snap = await getDb().collection("consultations").get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

export async function setConsultationStatus(id: string, status: unknown) {
  if (status !== "New" && status !== "Contacted") throw new ApiError(400, "Status must be New or Contacted")
  const ref = getDb().collection("consultations").doc(id)
  if (!(await ref.get()).exists) throw new ApiError(404, "Request not found")
  await ref.update({ status })
}
