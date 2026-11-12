import { buildVtuOfferPdf } from "../vtu-pdf"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import { LETTER_IMAGES } from "./letter-assets"
import { sendMail } from "./mailer"
import { DEFAULT_VTU_MAIL, vtuEmail, type VtuMailVars } from "./vtu-email"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const nowIso = () => new Date().toISOString()
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const LOGO = "/vtu_logo.png", SEAL = "/vtu_seal.jpg"

export type VtuMailTemplate = { subject: string; body: string }

function cleanTemplate(subject: unknown, body: unknown): VtuMailTemplate {
  const s = typeof subject === "string" ? subject.trim() : "", b = typeof body === "string" ? body.replace(/\r\n/g, "\n").trim() : ""
  if (!s) throw new ApiError(400, "The email needs a subject")
  if (!b) throw new ApiError(400, "The email needs a message")
  if (s.length > 200) throw new ApiError(400, "The subject is too long (200 characters max)")
  if (b.length > 6000) throw new ApiError(400, "The message is too long (6000 characters max)")
  return { subject: s, body: b }
}

/** The saved default draft (or the built-in one). */
export async function getVtuTemplate(): Promise<VtuMailTemplate & { saved: boolean }> {
  const snap = await getDb().collection("hr_settings").doc("vtu_mail").get()
  const d = snap.exists ? (snap.data() as any) : null
  return d?.subject && d?.body ? { subject: d.subject, body: d.body, saved: true } : { ...DEFAULT_VTU_MAIL, saved: false }
}

export async function saveVtuTemplate(input: any): Promise<VtuMailTemplate> {
  if (input?.reset === true) { await getDb().collection("hr_settings").doc("vtu_mail").delete(); return { ...DEFAULT_VTU_MAIL } }
  const t = cleanTemplate(input?.subject, input?.body)
  await getDb().collection("hr_settings").doc("vtu_mail").set({ ...t, updated_at: nowIso() })
  return t
}

async function nextVtuId(year: string): Promise<string> {
  const snap = await getDb().collection("vtu_internships").get()
  const base = `CI-VTU-${year}-`
  let max = 0
  for (const d of snap.docs) { const id = String((d.data() as any).vtu_id ?? ""); if (id.startsWith(base)) max = Math.max(max, Number(id.slice(base.length)) || 0) }
  return `${base}${String(max + 1).padStart(3, "0")}`
}

export async function createVtuInternship(input: any) {
  const name = str(input?.candidate_name, 80)
  if (name.length < 2) throw new ApiError(400, "Enter the student's name")
  const email = str(input?.candidate_email, 120).toLowerCase()
  if (!EMAIL_RE.test(email)) throw new ApiError(400, "Enter the student's email address so the letter can be sent")
  const program = str(input?.program, 80)
  if (!program) throw new ApiError(400, "Choose the internship program")
  const weeksRaw = input?.weeks === undefined || input?.weeks === "" ? 15 : Number(input.weeks)
  if (!Number.isInteger(weeksRaw) || weeksRaw < 1 || weeksRaw > 52) throw new ApiError(400, "Weeks must be a whole number from 1 to 52")
  const offer_date = input?.offer_date ? str(input.offer_date, 10) : todayIst()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(offer_date) || Number.isNaN(Date.parse(offer_date))) throw new ApiError(400, "Offer date is not valid")
  const tpl = input?.mail_subject !== undefined || input?.mail_body !== undefined ? cleanTemplate(input.mail_subject, input.mail_body) : await getVtuTemplate()
  const doc = {
    vtu_id: await nextVtuId(offer_date.slice(0, 4)), candidate_name: name, candidate_email: email, usn: str(input?.usn, 30).toUpperCase(), college: str(input?.college, 100),
    program, weeks: weeksRaw, offer_date, coordinator_name: str(input?.coordinator_name, 60) || "Poornima", coordinator_title: str(input?.coordinator_title, 60) || "Program Coordinator",
    mail_subject: tpl.subject, mail_body: tpl.body, email_status: "not_sent", email_sent_at: "", email_error: "", created_at: nowIso(),
  }
  const ref = getDb().collection("vtu_internships").doc()
  await ref.set(doc)
  return { id: ref.id, ...doc }
}

export async function listVtuInternships() {
  const snap = await getDb().collection("vtu_internships").get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

export async function getVtuInternship(id: string) {
  const snap = await getDb().collection("vtu_internships").doc(id).get()
  if (!snap.exists) throw new ApiError(404, "VTU internship offer not found")
  return { id, ...(snap.data() as any) }
}

export async function deleteVtuInternship(id: string) {
  const ref = getDb().collection("vtu_internships").doc(id)
  if (!(await ref.get()).exists) throw new ApiError(404, "VTU internship offer not found")
  await ref.delete()
}

export async function vtuPdf(id: string) {
  const o = await getVtuInternship(id)
  const doc = buildVtuOfferPdf(o, { logo: LETTER_IMAGES[LOGO] ?? null, seal: LETTER_IMAGES[SEAL] ?? null })
  return { bytes: Buffer.from(doc.output("arraybuffer")), filename: `VTU-Internship-Offer-${o.vtu_id}.pdf`, offer: o }
}

const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
export const mailVars = (o: any): VtuMailVars => ({ name: o.candidate_name, program: o.program, weeks: String(o.weeks), date: longDate(o.offer_date), id: o.vtu_id, coordinator: o.coordinator_name })

/** What the email will look like for this offer (used for the preview and for sending). */
export function renderVtuMail(o: any, tpl?: VtuMailTemplate, logoCid?: string) {
  return vtuEmail(tpl ?? { subject: o.mail_subject, body: o.mail_body }, mailVars(o), logoCid)
}

/** Emails the letter with the custom draft. If `draft` is given it replaces the stored draft for this offer. Never throws for a mail failure. */
export async function emailVtu(id: string, draft?: { subject?: unknown; body?: unknown }): Promise<{ sent: boolean; error?: string }> {
  let o = await getVtuInternship(id)
  if (draft && (draft.subject !== undefined || draft.body !== undefined)) {
    const t = cleanTemplate(draft.subject, draft.body)
    await getDb().collection("vtu_internships").doc(id).update({ mail_subject: t.subject, mail_body: t.body })
    o = { ...o, mail_subject: t.subject, mail_body: t.body }
  }
  const { bytes, filename } = await vtuPdf(id)
  const logo = LETTER_IMAGES[LOGO]
  const mail = renderVtuMail(o, undefined, logo ? "company-logo" : undefined)
  try {
    await sendMail({
      to: o.candidate_email, replyTo: "info@cloudinstitution.com", subject: mail.subject, text: mail.text, html: mail.html,
      attachments: [
        { filename, content: bytes, contentType: "application/pdf" },
        ...(logo ? [{ filename: "logo.png", content: Buffer.from(logo.data.split(",")[1], "base64"), contentType: "image/png", cid: "company-logo" }] : []),
      ],
    }, "Cloud Institution")
    await getDb().collection("vtu_internships").doc(id).update({ email_status: "sent", email_sent_at: nowIso(), email_error: "" })
    return { sent: true }
  } catch (e) {
    const error = e instanceof ApiError ? e.message : "The email could not be sent. Check the email settings on the server."
    await getDb().collection("vtu_internships").doc(id).update({ email_status: "failed", email_error: error })
    return { sent: false, error }
  }
}
