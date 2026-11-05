import { getDb } from "./firebase-admin"
import { ApiError } from "./http"
import { hashPassword, verifyPassword } from "./learners-service"
import type { EmployeeUser } from "./session"

const iso = () => new Date().toISOString()
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const money = (v: unknown, label: string) => {
  const n = v === undefined || v === null || v === "" ? 0 : Number(v)
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new ApiError(400, `${label} must be a valid amount`)
  return Math.round(n * 100) / 100
}
const validDate = (v: unknown, label: string) => {
  const s = typeof v === "string" ? v : ""
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) throw new ApiError(400, `${label} must be a valid date`)
  return s
}

/** Paid leave days each employee gets per calendar year. */
export const LEAVES_PER_YEAR = () => Number(process.env.HR_LEAVES_PER_YEAR) > 0 ? Number(process.env.HR_LEAVES_PER_YEAR) : 24

export const ATTENDANCE_STATUSES = ["Present", "Absent", "Half day", "On leave"] as const
export const LEAVE_TYPES = ["Casual", "Sick", "Earned", "Other"] as const

// ---------- companies (letterhead on payslips; employees belong to one) ----------
export interface Company { id: string; name: string; address: string[]; logo: string }
const DEFAULT_COMPANY_ID = "cloud-insthire"
const DEFAULT_COMPANIES: Company[] = [
  { id: DEFAULT_COMPANY_ID, name: "CLOUD INSTHIRE PRIVATE LIMITED", address: ["2nd, 15, 100 Feet Ring Rd, BTM 2nd Stage, Kuvempu Nagar,", "Stage, BTM Layout, Bengaluru, Karnataka 560076"], logo: "/lg_logo.png" },
  { id: "genai-labs", name: "GENAI LABS", address: [], logo: "" },
]

/** Built-in companies (editable) plus any the admin added. */
export async function listCompanies(): Promise<Company[]> {
  const snap = await getDb().collection("hr_companies").get()
  const stored = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...(d.data() as any) } as Company]))
  const merged = DEFAULT_COMPANIES.map((c) => ({ ...c, ...(stored.get(c.id) ?? {}), id: c.id }))
  const extra = [...stored.values()].filter((c) => !DEFAULT_COMPANIES.some((d) => d.id === c.id)).sort((a, b) => a.name.localeCompare(b.name))
  return [...merged, ...extra].map((c) => ({ ...c, address: Array.isArray(c.address) ? c.address : [] }))
}

/** Create a company (no id) or update one (id): name, and address as up to 3 lines. */
export async function saveCompany(input: any) {
  const name = str(input?.name, 100)
  if (name.length < 2) throw new ApiError(400, "Enter the company name")
  const lines = (Array.isArray(input?.address) ? input.address : String(input?.address ?? "").split("\n")).map((l: unknown) => str(l, 120)).filter(Boolean).slice(0, 3)
  const all = await listCompanies()
  let id = typeof input?.id === "string" ? input.id : ""
  if (id && !all.some((c) => c.id === id)) throw new ApiError(404, "Company not found")
  if (!id) {
    id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)
    if (!id || all.some((c) => c.id === id)) throw new ApiError(409, "A company with this name already exists")
  }
  const logo = all.find((c) => c.id === id)?.logo ?? ""
  await getDb().collection("hr_companies").doc(id).set({ name, address: lines, logo, updated_at: iso() })
  return { id, name, address: lines, logo }
}

async function assertCompany(id: unknown) {
  if (!(await listCompanies()).some((c) => c.id === id)) throw new ApiError(400, "Choose a valid company")
}

// ---------- employees ----------
export interface Employee {
  id: string; name: string; email: string; phone: string; designation: string; department: string
  company_id: string; has_login?: boolean; joined_on: string; location: string; basic: number; hra: number; special_allowance: number; medical_allowance: number; conveyance: number; cca: number; professional_tax: number; other_deductions: number; status: "Active" | "Inactive"; created_at: string
}

const PAY_FIELDS = [
  ["basic", "Basic pay"], ["hra", "HRA"], ["special_allowance", "Special allowance"], ["medical_allowance", "Medical allowance"],
  ["conveyance", "Conveyance"], ["cca", "CCA"], ["professional_tax", "Professional tax"], ["other_deductions", "Other deductions"],
] as const

function cleanEmployee(input: any, partial = false) {
  const name = str(input?.name, 80)
  if (!partial && name.length < 2) throw new ApiError(400, "Enter the employee's name")
  const email = str(input?.email, 120).toLowerCase()
  if (email && !EMAIL_RE.test(email)) throw new ApiError(400, "Enter a valid email address")
  const phone = str(input?.phone, 20)
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) throw new ApiError(400, "Enter a valid phone number")
  const out: Record<string, unknown> = { name, email, phone, designation: str(input?.designation, 80), department: str(input?.department, 80), location: str(input?.location, 80), company_id: typeof input?.company_id === "string" ? input.company_id : undefined }
  if (input?.joined_on) out.joined_on = validDate(input.joined_on, "Joining date")
  else if (!partial) out.joined_on = iso().slice(0, 10)
  // (older records / clients used `allowances` and `deductions`)
  const src = { ...input, special_allowance: input?.special_allowance ?? input?.allowances, other_deductions: input?.other_deductions ?? input?.deductions }
  for (const [k, label] of PAY_FIELDS) out[k] = money(src[k], label)
  if (input?.status === "Inactive" || input?.status === "Active") out.status = input.status
  // An edit only changes the fields it actually sent (so flipping Active/Inactive never blanks the details).
  if (partial) for (const k of Object.keys(out)) if (k !== "status" && (src as any)[k] === undefined) delete out[k]
  return out
}

export async function listEmployees(): Promise<Employee[]> {
  const snap = await getDb().collection("employees").get()
  return snap.docs.map((d) => publicEmployee(d.id, d.data() as any)).sort((a, b) => a.name.localeCompare(b.name))
}

/** Never send the password hash anywhere: only whether a login exists. */
function publicEmployee(id: string, d: any): Employee {
  const { password_hash, allowances, deductions, ...rest } = d
  return {
    id, ...rest,
    special_allowance: rest.special_allowance ?? allowances ?? 0, other_deductions: rest.other_deductions ?? deductions ?? 0,
    medical_allowance: rest.medical_allowance ?? 0, conveyance: rest.conveyance ?? 0, cca: rest.cca ?? 0, professional_tax: rest.professional_tax ?? 0, location: rest.location ?? "",
    company_id: rest.company_id || DEFAULT_COMPANY_ID,
    has_login: Boolean(password_hash),
  } as Employee
}

async function getEmployee(id: string) {
  const snap = await getDb().collection("employees").doc(id).get()
  if (!snap.exists) throw new ApiError(404, "Employee not found")
  return publicEmployee(snap.id, snap.data() as any)
}

/** Optional login password from the admin form: 8+ characters, and the employee needs an email to sign in with. */
async function loginFields(input: any, email: string, selfId?: string): Promise<Record<string, unknown>> {
  const pw = typeof input?.password === "string" ? input.password : ""
  if (!pw) return {}
  if (pw.length < 8 || pw.length > 100) throw new ApiError(400, "The login password must be at least 8 characters")
  if (!email) throw new ApiError(400, "Add the employee's email so they can log in with it")
  const dup = (await getDb().collection("employees").where("email", "==", email).get()).docs.find((d) => d.id !== selfId)
  if (dup) throw new ApiError(409, "Another employee already uses this email")
  return { password_hash: hashPassword(pw) }
}

export async function createEmployee(input: unknown) {
  const clean = cleanEmployee(input)
  clean.company_id = clean.company_id || DEFAULT_COMPANY_ID
  await assertCompany(clean.company_id)
  const doc = { ...clean, ...(await loginFields(input, String(clean.email ?? ""))), status: "Active", created_at: iso() }
  const ref = getDb().collection("employees").doc()
  await ref.set(doc)
  return publicEmployee(ref.id, doc)
}

export async function updateEmployee(id: string, input: unknown) {
  const cur = await getEmployee(id)
  const clean = cleanEmployee(input, true)
  if (clean.company_id !== undefined) await assertCompany(clean.company_id)
  const email = String(clean.email ?? "") || cur.email
  if (clean.email && clean.email !== cur.email && cur.has_login) {
    const dup = (await getDb().collection("employees").where("email", "==", clean.email).get()).docs.find((d) => d.id !== id)
    if (dup) throw new ApiError(409, "Another employee already uses this email")
  }
  await getDb().collection("employees").doc(id).update({ ...clean, ...(await loginFields(input, email, id)) })
}

// ---------- employee login ----------
export async function authenticateEmployee(emailRaw: string, password: string): Promise<EmployeeUser | null> {
  const email = emailRaw.trim().toLowerCase()
  const snap = await getDb().collection("employees").where("email", "==", email).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  const d = doc.data() as any
  if (!d.password_hash) return null
  if (!verifyPassword(password, d.password_hash) || d.status === "Inactive") throw new ApiError(401, "Invalid email or password")
  return { role: "employee", docId: doc.id, name: String(d.name ?? ""), email: String(d.email ?? email) }
}

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)

/** Everything an employee sees on their own page. */
export async function employeeOverview(user: EmployeeUser, month: string | undefined) {
  const m = month && MONTH_RE.test(month) ? month : istToday().slice(0, 7)
  const year = istToday().slice(0, 4)
  const emp = await getEmployee(user.docId)
  const [leaves, holidays, snap, balance] = await Promise.all([listLeaves({ year, employee_id: user.docId }), listHolidays(year), getDb().collection("employee_attendance").get(), leaveBalance(user.docId, year)])
  const attendance = snap.docs.map((d) => d.data() as any).filter((a) => a.employee_id === user.docId && String(a.date).startsWith(m))
    .map((a) => ({ date: a.date as string, status: a.status as string })).sort((a, b) => a.date.localeCompare(b.date))
  return {
    employee: { name: emp.name, email: emp.email, designation: emp.designation, department: emp.department, joined_on: emp.joined_on },
    year, month: m, leave: balance, leaves, holidays, attendance,
  }
}

/** An employee applies for leave: it always starts Pending and cannot exceed the days left. */
export async function employeeApplyLeave(user: EmployeeUser, input: any) {
  const leave = await addLeave({ ...input, employee_id: user.docId, status: "Pending" })
  const bal = await leaveBalance(user.docId, leave.from.slice(0, 4))
  if (leave.days > bal.remaining) {
    await deleteLeave(leave.id)
    throw new ApiError(400, `You have only ${bal.remaining} leave day(s) left for ${leave.from.slice(0, 4)}`)
  }
  return leave
}

export async function employeeCancelLeave(user: EmployeeUser, id: string) {
  const ref = getDb().collection("employee_leaves").doc(id)
  const snap = await ref.get()
  if (!snap.exists || (snap.data() as any).employee_id !== user.docId) throw new ApiError(404, "Leave not found")
  if ((snap.data() as any).status !== "Pending") throw new ApiError(400, "Only a pending request can be cancelled")
  await ref.delete()
}

// ---------- holidays ----------
export async function listHolidays(year?: string) {
  const snap = await getDb().collection("holidays").get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as { id: string; date: string; name: string }))
    .filter((h) => !year || h.date.startsWith(year)).sort((a, b) => a.date.localeCompare(b.date))
}
export async function addHoliday(input: any) {
  const date = validDate(input?.date, "Holiday date")
  const name = str(input?.name, 100)
  if (name.length < 2) throw new ApiError(400, "Enter the holiday name")
  const existing = (await listHolidays()).find((h) => h.date === date)
  if (existing) throw new ApiError(409, `${date} is already marked as ${existing.name}`)
  const ref = getDb().collection("holidays").doc()
  await ref.set({ date, name, created_at: iso() })
  return { id: ref.id, date, name }
}
export async function deleteHoliday(id: string) {
  const ref = getDb().collection("holidays").doc(id)
  if (!(await ref.get()).exists) throw new ApiError(404, "Holiday not found")
  await ref.delete()
}

// ---------- leaves ----------
interface LeaveDoc { employee_id: string; from: string; to: string; days: number; type: string; reason: string; status: "Pending" | "Approved" | "Rejected"; created_at: string }

const dayMs = 86400000
/** Working days between two dates (inclusive): Sundays and listed holidays do not count. */
function countLeaveDays(from: string, to: string, holidays: Set<string>, half: boolean) {
  if (to < from) throw new ApiError(400, "The end date is before the start date")
  if (Date.parse(to) - Date.parse(from) > 120 * dayMs) throw new ApiError(400, "A leave cannot be longer than 120 days")
  let n = 0
  for (let t = Date.parse(from); t <= Date.parse(to); t += dayMs) {
    const d = new Date(t)
    if (d.getUTCDay() === 0) continue
    if (holidays.has(d.toISOString().slice(0, 10))) continue
    n++
  }
  if (half) {
    if (from !== to) throw new ApiError(400, "A half day must be a single date")
    return n > 0 ? 0.5 : 0
  }
  if (n === 0) throw new ApiError(400, "Those dates are all Sundays or holidays, so no leave is needed")
  return n
}

export async function listLeaves(opts: { year?: string; employee_id?: string } = {}) {
  const snap = await getDb().collection("employee_leaves").get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as LeaveDoc & { id: string }))
    .filter((l) => (!opts.year || l.from.startsWith(opts.year)) && (!opts.employee_id || l.employee_id === opts.employee_id))
    .sort((a, b) => b.from.localeCompare(a.from))
}

export async function addLeave(input: any) {
  const emp = await getEmployee(String(input?.employee_id ?? ""))
  const from = validDate(input?.from, "Start date")
  const to = validDate(input?.to ?? input?.from, "End date")
  const type = LEAVE_TYPES.includes(input?.type) ? input.type : "Casual"
  const holidays = new Set((await listHolidays()).map((h) => h.date))
  const days = countLeaveDays(from, to, holidays, input?.half_day === true)
  const status = input?.status === "Pending" ? "Pending" : "Approved"
  if (status === "Approved") {
    const bal = await leaveBalance(emp.id, from.slice(0, 4))
    if (days > bal.remaining) throw new ApiError(400, `${emp.name} has only ${bal.remaining} leave day(s) left for ${from.slice(0, 4)}`)
  }
  const doc: LeaveDoc = { employee_id: emp.id, from, to, days, type, reason: str(input?.reason, 300), status, created_at: iso() }
  const ref = getDb().collection("employee_leaves").doc()
  await ref.set(doc)
  return { id: ref.id, ...doc }
}

export async function decideLeave(id: string, status: unknown) {
  if (status !== "Approved" && status !== "Rejected" && status !== "Pending") throw new ApiError(400, "Status must be Approved, Rejected or Pending")
  const ref = getDb().collection("employee_leaves").doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new ApiError(404, "Leave not found")
  const l = snap.data() as LeaveDoc
  if (status === "Approved" && l.status !== "Approved") {
    const bal = await leaveBalance(l.employee_id, l.from.slice(0, 4))
    if (l.days > bal.remaining) throw new ApiError(400, `Only ${bal.remaining} leave day(s) left for ${l.from.slice(0, 4)}`)
  }
  await ref.update({ status })
}

export async function deleteLeave(id: string) {
  const ref = getDb().collection("employee_leaves").doc(id)
  if (!(await ref.get()).exists) throw new ApiError(404, "Leave not found")
  await ref.delete()
}

export async function leaveBalance(employeeId: string, year: string) {
  const total = LEAVES_PER_YEAR()
  const taken = (await listLeaves({ year, employee_id: employeeId })).filter((l) => l.status === "Approved").reduce((n, l) => n + l.days, 0)
  return { total, taken, remaining: Math.max(0, total - taken) }
}

/** Every employee with leave taken / remaining for the year. */
export async function employeesWithBalance(year: string) {
  const [emps, leaves] = await Promise.all([listEmployees(), listLeaves({ year })])
  const total = LEAVES_PER_YEAR()
  return emps.map((e) => {
    const mine = leaves.filter((l) => l.employee_id === e.id)
    const taken = mine.filter((l) => l.status === "Approved").reduce((n, l) => n + l.days, 0)
    const pending = mine.filter((l) => l.status === "Pending").reduce((n, l) => n + l.days, 0)
    return { ...e, leave: { total, taken, pending, remaining: Math.max(0, total - taken) } }
  })
}

// ---------- attendance ----------
export async function attendanceForDate(date: string) {
  validDate(date, "Date")
  const snap = await getDb().collection("employee_attendance").get()
  const out: Record<string, string> = {}
  for (const d of snap.docs) { const a = d.data() as any; if (a.date === date) out[a.employee_id] = a.status }
  return out
}

export async function saveAttendance(dateRaw: unknown, records: unknown) {
  const date = validDate(dateRaw, "Date")
  if (date > new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)) throw new ApiError(400, "You cannot mark attendance for a future date")
  if (!Array.isArray(records) || records.length === 0 || records.length > 500) throw new ApiError(400, "No attendance to save")
  const emps = new Set((await listEmployees()).map((e) => e.id))
  const db = getDb()
  for (const r of records as any[]) {
    if (!emps.has(String(r?.employee_id))) throw new ApiError(400, "Unknown employee in the list")
    if (!ATTENDANCE_STATUSES.includes(r?.status)) throw new ApiError(400, "Status must be Present, Absent, Half day or On leave")
  }
  for (const r of records as any[]) {
    await db.collection("employee_attendance").doc(`${r.employee_id}__${date}`).set({ employee_id: r.employee_id, date, status: r.status, updated_at: iso() })
  }
  return { saved: records.length }
}

/** Per-employee totals for a month, including approved leave days that fall in it. */
export async function attendanceSummary(month: string) {
  if (!MONTH_RE.test(month)) throw new ApiError(400, "Month must look like 2026-11")
  const [emps, snap, leaves] = await Promise.all([listEmployees(), getDb().collection("employee_attendance").get(), listLeaves()])
  const recs = snap.docs.map((d) => d.data() as any).filter((a) => String(a.date).startsWith(month))
  return emps.map((e) => {
    const mine = recs.filter((a) => a.employee_id === e.id)
    const c = (s: string) => mine.filter((a) => a.status === s).length
    return { employee_id: e.id, name: e.name, present: c("Present"), absent: c("Absent"), half_day: c("Half day"), on_leave: c("On leave") }
  })
}

// ---------- payslip ----------
const r2 = (n: number) => Math.round(n * 100) / 100

export async function payslipData(employeeId: string, month: string) {
  if (!MONTH_RE.test(month)) throw new ApiError(400, "Month must look like 2026-11")
  const emp = await getEmployee(employeeId)
  const [y, m] = month.split("-").map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const snap = await getDb().collection("employee_attendance").get()
  const recs = snap.docs.map((d) => d.data() as any).filter((a) => a.employee_id === emp.id && String(a.date).startsWith(month))
  const count = (s: string) => recs.filter((a) => a.status === s).length
  const absent = count("Absent"), half = count("Half day")
  const lopDays = Math.min(daysInMonth, absent + half * 0.5)
  const effective = daysInMonth - lopDays
  const lines: [string, number][] = [["BASIC", emp.basic], ["HRA", emp.hra], ["SPECIAL ALLOWANCE", emp.special_allowance], ["MEDICAL ALLOWANCE", emp.medical_allowance], ["CONVEYANCE", emp.conveyance], ["CCA", emp.cca]]
  const earnings = lines.map(([label, full]) => ({ label, full, actual: r2((full * effective) / daysInMonth) }))
  const totalFull = r2(earnings.reduce((n, e) => n + e.full, 0))
  const totalActual = r2(earnings.reduce((n, e) => n + e.actual, 0))
  const deductions = [{ label: "Professional Tax", amount: emp.professional_tax }, { label: "Other Deductions", amount: emp.other_deductions }]
  const totalDed = r2(deductions.reduce((n, d) => n + d.amount, 0))
  const bal = await leaveBalance(emp.id, String(y))
  const company = (await listCompanies()).find((c) => c.id === emp.company_id) ?? DEFAULT_COMPANIES[0]
  return {
    company: { id: company.id, name: company.name, address: company.address, logo: company.logo },
    employee: { id: emp.id, name: emp.name, email: emp.email, designation: emp.designation, department: emp.department, location: emp.location, joined_on: emp.joined_on },
    month, days_in_month: daysInMonth, working_days: daysInMonth, effective_days: effective,
    attendance: { present: count("Present"), absent, half_day: half, on_leave: count("On leave"), loss_of_pay_days: lopDays },
    earnings, total_full: totalFull, total_actual: totalActual,
    deductions, total_deductions: totalDed,
    net_pay: Math.max(0, r2(totalActual - totalDed)),
    leave_balance: bal,
  }
}
