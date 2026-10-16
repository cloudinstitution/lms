import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import { CATALOG, findCourse, type CatalogCourse } from "./catalog"
import type { LearnerUser } from "./session"

const iso = () => new Date().toISOString()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface EnrollmentView {
  course_id: number
  title: string
  category: string
  duration: string
  level: string
  enrolled_at: string
  amount: number
}

// ---------- passwords ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: unknown): boolean {
  if (typeof stored !== "string") return false
  const [kind, salt, hash] = stored.split("$")
  if (kind !== "scrypt" || !salt || !hash) return false
  const a = Buffer.from(hash, "hex")
  const b = scryptSync(password, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}

const learnerId = (email: string) => `learner_${createHash("sha256").update(email).digest("hex").slice(0, 32)}`

// ---------- signup / login ----------
export async function signupLearner(input: { name?: unknown; email?: unknown; phone?: unknown; password?: unknown }): Promise<LearnerUser> {
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const phone = typeof input.phone === "string" ? input.phone.trim() : ""
  const password = typeof input.password === "string" ? input.password : ""
  if (name.length < 2 || name.length > 80) throw new ApiError(400, "Please enter your full name")
  if (!EMAIL_RE.test(email) || email.length > 120) throw new ApiError(400, "Please enter a valid email address")
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) throw new ApiError(400, "Please enter a valid phone number")
  if (password.length < 8 || password.length > 100) throw new ApiError(400, "Password must be at least 8 characters")

  const db = getDb()
  // An email that already belongs to a student / staff account must use that account.
  const [st, ad] = await Promise.all([
    db.collection("students").where("username", "==", email).get(),
    db.collection("admin").where("username", "==", email).get(),
  ])
  if (!st.empty || !ad.empty) throw new ApiError(409, "This email already has an account. Please log in instead.")

  const id = learnerId(email)
  const ref = db.collection("learners").doc(id)
  const password_hash = hashPassword(password)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) throw new ApiError(409, "This email is already registered. Please log in instead.")
    tx.create(ref, { name, email, phone: phone || null, password_hash, status: "Active", created_at: iso() })
  })
  return { role: "learner", docId: id, name, email }
}

/** Returns null when the email is not a learner account (so the caller can say "not found"); throws on wrong password. */
export async function authenticateLearner(emailRaw: string, password: string): Promise<LearnerUser | null> {
  const email = emailRaw.trim().toLowerCase()
  const snap = await getDb().collection("learners").doc(learnerId(email)).get()
  if (!snap.exists) return null
  const d = snap.data()!
  if (!verifyPassword(password, d.password_hash) || d.status === "Inactive") throw new ApiError(401, "Invalid email or password")
  return { role: "learner", docId: snap.id, name: String(d.name ?? ""), email: String(d.email ?? email) }
}

// ---------- enrollments ----------
const enrollKey = (lid: string, courseId: number) => `${lid}__c${courseId}`

const toEnrollment = (c: CatalogCourse, d: any): EnrollmentView => ({
  course_id: c.id, title: c.title, category: c.category, duration: c.duration, level: c.level, enrolled_at: d.enrolled_at, amount: d.amount,
})

export async function listEnrollments(learner: LearnerUser): Promise<EnrollmentView[]> {
  const snap = await getDb().collection("enrollments").where("learner_id", "==", learner.docId).get()
  return snap.docs
    .map((x) => x.data() as any)
    .map((d) => ({ d, c: findCourse(d.course_id) }))
    .filter((x): x is { d: any; c: CatalogCourse } => Boolean(x.c))
    .map(({ d, c }) => toEnrollment(c, d))
    .sort((a, b) => b.enrolled_at.localeCompare(a.enrolled_at))
}

export async function assertEnrolled(learner: LearnerUser, courseId: number) {
  const snap = await getDb().collection("enrollments").doc(enrollKey(learner.docId, courseId)).get()
  if (!snap.exists) throw new ApiError(403, "Buy this course to access it")
}

// ---------- payments (Razorpay) ----------
function razorpayKeys() {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw new ApiError(503, "Online payments are not enabled yet. Please contact the institute.")
  return { id, secret }
}

export async function createOrder(learner: LearnerUser, courseIdRaw: unknown) {
  const course = findCourse(courseIdRaw)
  if (!course) throw new ApiError(404, "Course not found")
  const keys = razorpayKeys()
  const db = getDb()
  if ((await db.collection("enrollments").doc(enrollKey(learner.docId, course.id)).get()).exists) {
    throw new ApiError(409, "You already own this course")
  }
  const amount = course.price * 100 // paise
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keys.id}:${keys.secret}`).toString("base64")}` },
    body: JSON.stringify({ amount, currency: "INR", receipt: `c${course.id}_${Date.now()}`.slice(0, 40), notes: { learner_id: learner.docId, course_id: String(course.id) } }),
  })
  if (!res.ok) throw new ApiError(502, "Could not start the payment. Please try again.")
  const order = (await res.json()) as { id?: string }
  if (!order.id) throw new ApiError(502, "Could not start the payment. Please try again.")
  await db.collection("orders").doc(order.id).set({
    learner_id: learner.docId, course_id: course.id, amount: course.price, currency: "INR", status: "created", created_at: iso(),
  })
  return { order_id: order.id, amount, currency: "INR", key_id: keys.id, course: { id: course.id, title: course.title }, prefill: { name: learner.name, email: learner.email } }
}

const sameHmac = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Marks the order paid and grants the course. Safe to call repeatedly (browser verify + webhook). */
export async function fulfillOrder(orderId: string, paymentId: string): Promise<{ learner_id: string; course_id: number }> {
  const db = getDb()
  const ref = db.collection("orders").doc(orderId)
  let out = { learner_id: "", course_id: 0 }
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ApiError(404, "Order not found")
    const o = snap.data() as any
    out = { learner_id: o.learner_id, course_id: o.course_id }
    const eRef = db.collection("enrollments").doc(enrollKey(o.learner_id, o.course_id))
    const e = await tx.get(eRef)
    if (o.status !== "paid") tx.update(ref, { status: "paid", payment_id: paymentId, paid_at: iso() })
    if (!e.exists) tx.create(eRef, { learner_id: o.learner_id, course_id: o.course_id, order_id: orderId, payment_id: paymentId, amount: o.amount, enrolled_at: iso() })
  })
  return out
}

export async function verifyPayment(learner: LearnerUser, input: { razorpay_order_id?: unknown; razorpay_payment_id?: unknown; razorpay_signature?: unknown }) {
  const orderId = typeof input.razorpay_order_id === "string" ? input.razorpay_order_id : ""
  const paymentId = typeof input.razorpay_payment_id === "string" ? input.razorpay_payment_id : ""
  const sig = typeof input.razorpay_signature === "string" ? input.razorpay_signature : ""
  if (!orderId || !paymentId || !sig) throw new ApiError(400, "Missing payment details")
  const { secret } = razorpayKeys()
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
  if (!sameHmac(expected, sig)) throw new ApiError(400, "Payment could not be verified")
  const o = await getDb().collection("orders").doc(orderId).get()
  if (!o.exists || (o.data() as any).learner_id !== learner.docId) throw new ApiError(404, "Order not found")
  return fulfillOrder(orderId, paymentId)
}

/** Razorpay webhook: grants the course even if the buyer closed the browser right after paying. */
export async function handleWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) throw new ApiError(503, "Webhook not configured")
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  if (!signature || !sameHmac(expected, signature)) throw new ApiError(400, "Bad signature")
  const evt = JSON.parse(rawBody) as any
  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    const pay = evt.payload?.payment?.entity
    const orderId = pay?.order_id ?? evt.payload?.order?.entity?.id
    if (orderId && pay?.id && (await getDb().collection("orders").doc(orderId).get()).exists) await fulfillOrder(orderId, pay.id)
  }
}

// ---------- course content ----------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

export async function listCourseVideos(courseId: number) {
  const course = findCourse(courseId)
  if (!course) throw new ApiError(404, "Course not found")
  const db = getDb()
  let name = course.title
  const all = await db.collection("courses").get()
  const match = all.docs.map((d) => String((d.data() as any).name ?? (d.data() as any).title ?? d.id)).find((n) => norm(n) === norm(course.title))
  if (match) name = match
  const snap = await db.collection(`courses/${encodeURIComponent(name)}/videos`).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .map((v) => ({ id: v.id as string, title: String(v.title ?? "Lesson"), link: String(v.link ?? ""), serialNo: Number(v.serialNo ?? 0), sourceType: v.sourceType === "gdrive" ? "gdrive" : "youtube" }))
    .sort((a, b) => a.serialNo - b.serialNo)
}

export { CATALOG }
