import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import { LETTER_IMAGES } from "./letter-assets"
import { sendMail } from "./mailer"
import { builtinMouTemplate, checkMouTemplate, fillMouDocx, type MouVars } from "./mou-docx"
import { DEFAULT_MOU_MAIL, mouEmail, type MouMailVars } from "./mou-email"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "")
const nowIso = () => new Date().toISOString()
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const MAX_TEMPLATE_BYTES = 700_000

export type MouMailTemplate = { subject: string; body: string }

function cleanTemplate(subject: unknown, body: unknown): MouMailTemplate {
  const s = typeof subject === "string" ? subject.trim() : "", b = typeof body === "string" ? body.replace(/\r\n/g, "\n").trim() : ""
  if (!s) throw new ApiError(400, "The email needs a subject")
  if (!b) throw new ApiError(400, "The email needs a message")
  if (s.length > 200) throw new ApiError(400, "The subject is too long (200 characters max)")
  if (b.length > 6000) throw new ApiError(400, "The message is too long (6000 characters max)")
  return { subject: s, body: b }
}

// ---------- email draft ----------
export async function getMouMailTemplate(): Promise<MouMailTemplate & { saved: boolean }> {
  const d = (await getDb().collection("hr_settings").doc("mou_mail").get()).data() as any
  return d?.subject && d?.body ? { subject: d.subject, body: d.body, saved: true } : { ...DEFAULT_MOU_MAIL, saved: false }
}
export async function saveMouMailTemplate(input: any): Promise<void> {
  if (input?.reset === true) { await getDb().collection("hr_settings").doc("mou_mail").delete(); return }
  await getDb().collection("hr_settings").doc("mou_mail").set({ ...cleanTemplate(input?.subject, input?.body), updated_at: nowIso() })
}

// ---------- the MOU document template (built-in, or the admin's own upload) ----------
export async function getMouTemplateFile(): Promise<{ buf: Buffer; custom: boolean; name: string; updated_at?: string }> {
  const d = (await getDb().collection("hr_settings").doc("mou_template").get()).data() as any
  if (d?.data) return { buf: Buffer.from(d.data, "base64"), custom: true, name: d.filename || "MOU-template.docx", updated_at: d.updated_at }
  return { buf: builtinMouTemplate(), custom: false, name: "Memorandum_of_Understanding_MOU.docx" }
}
export async function saveMouTemplateFile(filename: unknown, base64: unknown): Promise<void> {
  if (typeof base64 !== "string" || !base64) throw new ApiError(400, "Choose a Word (.docx) file")
  const buf = Buffer.from(base64, "base64")
  if (buf.length > MAX_TEMPLATE_BYTES) throw new ApiError(400, `The template is too large (${Math.round(buf.length / 1024)} KB). Keep it under ${Math.round(MAX_TEMPLATE_BYTES / 1024)} KB — compress the letterhead images.`)
  const problem = await checkMouTemplate(buf)
  if (problem) throw new ApiError(400, problem)
  await getDb().collection("hr_settings").doc("mou_template").set({ data: buf.toString("base64"), filename: str(filename, 120) || "MOU-template.docx", updated_at: nowIso() })
}
export async function resetMouTemplateFile(): Promise<void> { await getDb().collection("hr_settings").doc("mou_template").delete() }

// ---------- MOUs ----------
async function nextMouId(year: string): Promise<string> {
  const snap = await getDb().collection("mou_agreements").get()
  const base = `CI-MOU-${year}-`
  let max = 0
  for (const d of snap.docs) { const id = String((d.data() as any).mou_id ?? ""); if (id.startsWith(base)) max = Math.max(max, Number(id.slice(base.length)) || 0) }
  return `${base}${String(max + 1).padStart(3, "0")}`
}

export async function createMou(input: any) {
  const company = str(input?.company, 150)
  if (company.length < 2) throw new ApiError(400, "Enter the company name")
  const rawEmail = str(input?.email, 120).toLowerCase()
  if (rawEmail && !EMAIL_RE.test(rawEmail)) throw new ApiError(400, "That email address isn't valid")
  const mou_date = input?.mou_date ? str(input.mou_date, 10) : todayIst()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mou_date) || Number.isNaN(Date.parse(mou_date))) throw new ApiError(400, "The MOU date is not valid")
  const tpl = input?.mail_subject !== undefined || input?.mail_body !== undefined ? cleanTemplate(input.mail_subject, input.mail_body) : await getMouMailTemplate()
  const doc = {
    mou_id: await nextMouId(mou_date.slice(0, 4)), company, address: str(input?.address, 400), name: str(input?.name, 80), designation: str(input?.designation, 80),
    email: rawEmail, phone: str(input?.phone, 30), business: str(input?.business, 150), mou_date,
    mail_subject: tpl.subject, mail_body: tpl.body, email_status: "not_sent", email_sent_at: "", email_error: "", created_at: nowIso(),
  }
  const ref = getDb().collection("mou_agreements").doc()
  await ref.set(doc)
  return { id: ref.id, ...doc }
}
export async function listMous() {
  return (await getDb().collection("mou_agreements").get()).docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}
export async function getMou(id: string) {
  const snap = await getDb().collection("mou_agreements").doc(id).get()
  if (!snap.exists) throw new ApiError(404, "MOU not found")
  return { id, ...(snap.data() as any) }
}
export async function deleteMou(id: string) {
  const ref = getDb().collection("mou_agreements").doc(id)
  if (!(await ref.get()).exists) throw new ApiError(404, "MOU not found")
  await ref.delete()
}

const docVars = (m: any): MouVars => ({ company: m.company, address: m.address, name: m.name, designation: m.designation, email: m.email, phone: m.phone, business: m.business, date: longDate(m.mou_date) })
const safeFile = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "Company"

/** The filled MOU (.docx) for one company. */
export async function mouDocx(id: string) {
  const m = await getMou(id)
  const bytes = await fillMouDocx((await getMouTemplateFile()).buf, docVars(m))
  return { bytes, filename: `MOU-${safeFile(m.company)}-${m.mou_id}.docx`, mou: m }
}

const mailVars = (m: any): MouMailVars => ({ company: m.company, name: m.name || "Sir/Madam", designation: m.designation || "Authorised Signatory", address: m.address, date: longDate(m.mou_date), id: m.mou_id })
export function renderMouMail(m: any, logoCid?: string) { return mouEmail({ subject: m.mail_subject, body: m.mail_body }, mailVars(m), logoCid) }

/** Emails the filled MOU with the custom draft. Optional `draft` replaces this MOU's stored draft first. Never throws for a mail failure. */
export async function emailMou(id: string, draft?: { subject?: unknown; body?: unknown }): Promise<{ sent: boolean; error?: string }> {
  let m = await getMou(id)
  if (!m.email) throw new ApiError(400, "This company has no email address. Add it, or download the MOU and send it yourself.")
  if (draft && (draft.subject !== undefined || draft.body !== undefined)) {
    const t = cleanTemplate(draft.subject, draft.body)
    await getDb().collection("mou_agreements").doc(id).update({ mail_subject: t.subject, mail_body: t.body })
    m = { ...m, mail_subject: t.subject, mail_body: t.body }
  }
  const { bytes, filename } = await mouDocx(id)
  const logo = LETTER_IMAGES["/vtu_logo.png"]
  const mail = renderMouMail(m, logo ? "company-logo" : undefined)
  try {
    await sendMail({
      to: m.email, replyTo: "dilipd@cloudinstitution.com", subject: mail.subject, text: mail.text, html: mail.html,
      attachments: [
        { filename, content: bytes, contentType: DOCX },
        ...(logo ? [{ filename: "logo.png", content: Buffer.from(logo.data.split(",")[1], "base64"), contentType: "image/png", cid: "company-logo" }] : []),
      ],
    }, "Cloud Institution")
    await getDb().collection("mou_agreements").doc(id).update({ email_status: "sent", email_sent_at: nowIso(), email_error: "" })
    return { sent: true }
  } catch (e) {
    const error = e instanceof ApiError ? e.message : "The email could not be sent. Check the email settings on the server."
    await getDb().collection("mou_agreements").doc(id).update({ email_status: "failed", email_error: error })
    return { sent: false, error }
  }
}
