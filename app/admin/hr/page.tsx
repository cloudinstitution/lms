"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiFailure, api } from "@/lib/certificate-client"
import { Download, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN")
const sel = "h-10 rounded-md border bg-background px-3 text-sm"
const STATUSES = ["Present", "Absent", "Half day", "On leave"]
/** Every word typed must appear somewhere in the row's searchable text (ID, name, email, phone…), case-insensitive. */
const matchesQuery = (q: string, ...fields: unknown[]) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = fields.map((f) => String(f ?? "")).join(" ").toLowerCase()
  return words.every((w) => hay.includes(w))
}

const blankEmp = { company_id: "cloud-insthire", emp_id: "", name: "", email: "", phone: "", designation: "", department: "", location: "", joined_on: "", basic: "", hra: "", special_allowance: "", medical_allowance: "", conveyance: "", cca: "", professional_tax: "", other_deductions: "", password: "" }

function CompanyRow({ c, onSaved }: { c: { id: string; name: string; address: string[]; signatory?: string; signatory_title?: string; phone?: string; email?: string; website?: string; emp_prefix?: string }; onSaved: () => void }) {
  const [name, setName] = useState(c.name)
  const [addr, setAddr] = useState((c.address ?? []).join("\n"))
  const [sig, setSig] = useState(c.signatory ?? "")
  const [sigTitle, setSigTitle] = useState(c.signatory_title ?? "")
  const [phone, setPhone] = useState(c.phone ?? "")
  const [email, setEmail] = useState(c.email ?? "")
  const [prefix, setPrefix] = useState(c.emp_prefix ?? "")
  const [website, setWebsite] = useState(c.website ?? "")
  const save = async () => {
    try { await api("/api/admin/hr/companies", { method: "POST", body: { id: c.id || undefined, name, address: addr, signatory: sig, signatory_title: sigTitle, phone, email, website, emp_prefix: prefix } }); toast.success(c.id ? "Company saved" : "Company added"); if (!c.id) { setName(""); setAddr(""); setSig(""); setSigTitle(""); setPhone(""); setEmail(""); setWebsite(""); setPrefix("") } onSaved() } catch (e) { toast.error(err(e)) }
  }
  return (
    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_2fr_auto]">
      <Input placeholder={c.id ? "Company name" : "Add a new company…"} value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className="min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm" placeholder="Address (one line per row, up to 3)" value={addr} onChange={(e) => setAddr(e.target.value)} />
      <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">{c.id ? "Save" : "Add"}</Button>
      <Input className="sm:col-span-1" placeholder="Signatory name (letters)" value={sig} onChange={(e) => setSig(e.target.value)} />
      <Input placeholder="Signatory title (e.g. CEO / HR Manager)" value={sigTitle} onChange={(e) => setSigTitle(e.target.value)} />
      <Input placeholder="Phone (offer letter footer)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input placeholder="Email (offer letter footer)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Website (e.g. www.genailabs.in)" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <Input placeholder="Employee ID prefix (e.g. GL)" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
    </div>
  )
}

export default function HrPage() {
  const [year, setYear] = useState(todayIst().slice(0, 4))
  const [emps, setEmps] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [filterCo, setFilterCo] = useState("all")
  const loadCompanies = useCallback(() => api("/api/admin/hr/companies").then((d) => setCompanies(d.companies)).catch(() => {}), [])
  useEffect(() => { loadCompanies() }, [loadCompanies])
  const coName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—"
  const loadEmps = useCallback(() => api(`/api/admin/hr/employees?year=${year}`).then((d) => setEmps(d.employees)).catch((e) => toast.error(err(e))), [year])
  const loadHolidays = useCallback(() => api(`/api/admin/hr/holidays?year=${year}`).then((d) => setHolidays(d.holidays)).catch(() => {}), [year])
  const loadLeaves = useCallback(() => api(`/api/admin/hr/leaves?year=${year}`).then((d) => setLeaves(d.leaves)).catch(() => {}), [year])
  useEffect(() => { loadEmps(); loadHolidays(); loadLeaves() }, [loadEmps, loadHolidays, loadLeaves])
  const refresh = () => { loadEmps(); loadLeaves() }
  const [empQuery, setEmpQuery] = useState("")
  const [internQuery, setInternQuery] = useState("")
  const byCompany = emps.filter((e) => filterCo === "all" || e.company_id === filterCo)
  const shown = byCompany.filter((e) => matchesQuery(empQuery, e.emp_id, e.name, e.email, e.phone, e.designation, e.department, e.location, coName(e.company_id)))
  const active = emps.filter((e) => e.status !== "Inactive" && e.status !== "Exited" && (filterCo === "all" || e.company_id === filterCo))
  const nameOf = (id: string) => emps.find((e) => e.id === id)?.name ?? "—"

  // ----- offer letters -----
  const defaultComps = ["Basic", "HRA", "Conveyance", "Allowance Medical", "Allowance Advance", "Statutory Bonus", "Special Allowance"]
  const blankOffer = () => ({ company_id: "genai-labs", candidate_name: "", candidate_email: "", designation: "", location: "Bengaluru", offer_date: todayIst(), joining_date: "", prior_experience_months: "0", probation_months: "3", notice_months: "2", min_service_months: "6", casual_leaves: "12", sick_leaves: "8" })
  const [offers, setOffers] = useState<any[]>([])
  const [of, setOf] = useState<any>(blankOffer())
  const [comps, setComps] = useState<{ label: string; monthly: string }[]>(defaultComps.map((label) => ({ label, monthly: "" })))
  const [showTerms, setShowTerms] = useState(false)
  const loadOffers = useCallback(() => api("/api/admin/hr/offer-letters").then((d) => setOffers(d.offers)).catch(() => {}), [])
  useEffect(() => { loadOffers() }, [loadOffers])
  const setO = (k: string) => (e: { target: { value: string } }) => setOf({ ...of, [k]: e.target.value })
  const offerPdf = (o: any) => import("@/lib/offer-letter-pdf").then((m) => m.downloadOfferLetter(o)).catch(() => toast.error("Could not create the PDF"))
  const createOffer = async () => {
    try {
      const d = await api("/api/admin/hr/offer-letters", { method: "POST", body: { ...of, components: comps } })
      toast.success("Offer letter created"); setOf(blankOffer()); setComps(defaultComps.map((label) => ({ label, monthly: "" }))); loadOffers()
      await offerPdf(d.offer)
    } catch (e) { toast.error(err(e)) }
  }
  const removeOffer = async (o: any) => { if (!confirm(`Delete the offer letter for ${o.candidate_name}?`)) return; try { await api(`/api/admin/hr/offer-letters/${o.id}`, { method: "DELETE" }); loadOffers() } catch (e) { toast.error(err(e)) } }
  const compTotal = comps.reduce((n, c) => n + (Number(c.monthly) || 0), 0)

  // ----- internship offer letters -----
  const INTERN_POSITIONS = ["Intern", "Python Full Stack Intern", "Java Full Stack Intern", "Web Development Intern", "Data Analytics Intern", "AI & Machine Learning Intern", "Cloud Intern (AWS / Azure)", "Cloud Support Intern", "DevOps Intern", "Linux Administration Intern", "HR Intern", "Digital Marketing Intern"]
  const blankIntern = () => ({ company_id: "genai-labs", candidate_name: "", candidate_email: "", position: "Intern", position_other: false, location: "Bangalore", work_mode: "On-site", paid: false, stipend_amount: "", start_date: "", end_date: "", duration_value: "", duration_unit: "Months", offer_date: todayIst(), send_email: true })
  const [interns, setInterns] = useState<any[]>([])
  const [iv, setIv] = useState<any>(blankIntern())
  const [internBusy, setInternBusy] = useState(false)
  const loadInterns = useCallback(() => api("/api/admin/hr/internships").then((d) => setInterns(d.internships)).catch(() => {}), [])
  useEffect(() => { loadInterns() }, [loadInterns])
  const internsShown = interns.filter((o) => matchesQuery(internQuery, o.internship_id, o.candidate_name, o.candidate_email, o.position, o.company?.name, o.paid ? "paid" : "unpaid", o.start_date, o.location))
  const setI = (k: string) => (e: { target: { value: string } }) => setIv({ ...iv, [k]: e.target.value })
  const createIntern = async () => {
    setInternBusy(true)
    try {
      const d = await api("/api/admin/hr/internships", { method: "POST", body: iv })
      if (d.email?.skipped) toast.success(`Offer ${d.internship.internship_id} saved (not emailed)`)
      else if (d.email?.sent) toast.success(`Offer ${d.internship.internship_id} emailed to ${d.internship.candidate_email}`)
      else toast.warning(`Offer ${d.internship.internship_id} saved, but the email failed: ${d.email?.error ?? "unknown error"}`, { duration: 9000 })
      setIv(blankIntern()); loadInterns()
    } catch (e) { toast.error(err(e)) } finally { setInternBusy(false) }
  }
  const resendIntern = async (o: any) => {
    try { const d = await api(`/api/admin/hr/internships/${o.id}/send`, { method: "POST" }); d.email.sent ? toast.success(`Emailed to ${o.candidate_email}`) : toast.error(d.email.error ?? "The email could not be sent"); loadInterns() } catch (e) { toast.error(err(e)) }
  }
  const downloadIntern = async (o: any) => {
    try {
      const res = await fetch(`/api/admin/hr/internships/${o.id}/pdf`); if (!res.ok) throw new Error("Could not create the PDF")
      const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = url; a.download = `Internship-Offer-${o.internship_id}.pdf`; a.click(); URL.revokeObjectURL(url)
    } catch (e) { toast.error(err(e)) }
  }
  const removeIntern = async (o: any) => { if (!confirm(`Delete internship offer ${o.internship_id} for ${o.candidate_name}?`)) return; try { await api(`/api/admin/hr/internships/${o.id}`, { method: "DELETE" }); loadInterns() } catch (e) { toast.error(err(e)) } }

  // ----- employees -----
  const [showCo, setShowCo] = useState(false)
  const [exiting, setExiting] = useState<{ id: string; name: string; date: string } | null>(null)
  const confirmExit = async () => {
    if (!exiting) return
    try { await api(`/api/admin/hr/employees/${exiting.id}`, { method: "PUT", body: { status: "Exited", exit_date: exiting.date } }); toast.success(`${exiting.name} marked as exited. You can now create the experience letter.`); setExiting(null); loadEmps() } catch (e) { toast.error(err(e)) }
  }
  const reinstate = async (e: any) => { if (!confirm(`Bring ${e.name} back as an active employee?`)) return; try { await api(`/api/admin/hr/employees/${e.id}`, { method: "PUT", body: { status: "Active" } }); loadEmps() } catch (x) { toast.error(err(x)) } }
  const letter = async (e: any) => {
    try { const d = (await api(`/api/admin/hr/experience-letter?employee_id=${e.id}`)).letter; await (await import("@/lib/experience-letter-pdf")).downloadExperienceLetter(d) } catch (x) { toast.error(err(x)) }
  }
  const [f, setF] = useState<any>(blankEmp)
  const [editing, setEditing] = useState<string | null>(null)
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const saveEmp = async () => {
    try {
      if (editing) await api(`/api/admin/hr/employees/${editing}`, { method: "PUT", body: f })
      else await api("/api/admin/hr/employees", { method: "POST", body: f })
      toast.success(editing ? "Employee updated" : "Employee added")
      setF(blankEmp); setEditing(null); loadEmps()
    } catch (e) { toast.error(err(e)) }
  }
  const startEdit = (e: any) => { setEditing(e.id); setF({ ...blankEmp, ...e, password: "" }); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const setStatus = async (e: any) => { try { await api(`/api/admin/hr/employees/${e.id}`, { method: "PUT", body: { status: e.status === "Inactive" ? "Active" : "Inactive" } }); loadEmps() } catch (x) { toast.error(err(x)) } }

  // ----- attendance -----
  const [date, setDate] = useState(todayIst())
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [month, setMonth] = useState(todayIst().slice(0, 7))
  const [summary, setSummary] = useState<any[]>([])
  useEffect(() => { api(`/api/admin/hr/attendance?date=${date}`).then((d) => setMarks(d.records)).catch(() => setMarks({})) }, [date])
  useEffect(() => { api(`/api/admin/hr/attendance?month=${month}`).then((d) => setSummary(d.summary)).catch(() => setSummary([])) }, [month])
  const saveAtt = async () => {
    const records = active.filter((e) => marks[e.id]).map((e) => ({ employee_id: e.id, status: marks[e.id] }))
    if (!records.length) return toast.error("Mark at least one employee")
    try { await api("/api/admin/hr/attendance", { method: "POST", body: { date, records } }); toast.success("Attendance saved"); api(`/api/admin/hr/attendance?month=${month}`).then((d) => setSummary(d.summary)) } catch (e) { toast.error(err(e)) }
  }

  // ----- leaves -----
  const [lv, setLv] = useState({ employee_id: "", from: todayIst(), to: "", type: "Casual", reason: "", half_day: false, status: "Approved" })
  const addLeave = async () => {
    try { await api("/api/admin/hr/leaves", { method: "POST", body: { ...lv, to: lv.to || lv.from } }); toast.success("Leave recorded"); setLv({ ...lv, reason: "", to: "" }); refresh() } catch (e) { toast.error(err(e)) }
  }
  const decide = async (id: string, status: string) => { try { await api(`/api/admin/hr/leaves/${id}`, { method: "PUT", body: { status } }); refresh() } catch (e) { toast.error(err(e)) } }
  const delLeave = async (id: string) => { if (!confirm("Delete this leave record?")) return; try { await api(`/api/admin/hr/leaves/${id}`, { method: "DELETE" }); refresh() } catch (e) { toast.error(err(e)) } }

  // ----- holidays -----
  const [h, setH] = useState({ date: "", name: "" })
  const addHoliday = async () => { try { await api("/api/admin/hr/holidays", { method: "POST", body: h }); setH({ date: "", name: "" }); toast.success("Holiday added"); loadHolidays() } catch (e) { toast.error(err(e)) } }
  const delHoliday = async (id: string) => { try { await api(`/api/admin/hr/holidays/${id}`, { method: "DELETE" }); loadHolidays() } catch (e) { toast.error(err(e)) } }

  // ----- payslips -----
  const [ps, setPs] = useState({ employee_id: "", month: todayIst().slice(0, 7) })
  const [slip, setSlip] = useState<any>(null)
  const makeSlip = async () => {
    if (!ps.employee_id) return toast.error("Choose an employee")
    try { setSlip((await api(`/api/admin/hr/payslip?employee_id=${ps.employee_id}&month=${ps.month}`)).payslip) } catch (e) { toast.error(err(e)) }
  }
  const pdf = () => import("@/lib/payslip-pdf").then((m) => m.downloadPayslip(slip)).catch(() => toast.error("Could not create the PDF"))

  const Th = ({ cols }: { cols: string[] }) => <thead className="border-b bg-muted/50"><tr>{cols.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr></thead>
  const totalLeft = emps.reduce((n, e) => n + (e.leave?.remaining ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">HR & Employees</h1>
          <p className="text-sm text-muted-foreground">Employee details, attendance, leaves (24 a year each), holidays and payslips.</p>
        </div>
        <label className="text-sm">Year <select className={sel + " ml-2"} value={year} onChange={(e) => setYear(e.target.value)}>{[0, 1, 2].map((i) => String(Number(todayIst().slice(0, 4)) - i)).map((y) => <option key={y}>{y}</option>)}</select></label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{active.length}</div><div className="text-sm text-muted-foreground">Active employees</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{leaves.filter((l) => l.status === "Pending").length}</div><div className="text-sm text-muted-foreground">Leave requests waiting</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{holidays.length}</div><div className="text-sm text-muted-foreground">Holidays in {year}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="flex-wrap"><TabsTrigger value="employees">Employees</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="leaves">Leaves</TabsTrigger><TabsTrigger value="holidays">Holidays</TabsTrigger><TabsTrigger value="payslips">Payslips</TabsTrigger><TabsTrigger value="offers">Offer letters</TabsTrigger><TabsTrigger value="internships">Internships</TabsTrigger></TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{editing ? "Edit employee" : "Add employee"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted-foreground">Company<select className={sel + " w-full"} value={f.company_id} onChange={set("company_id")}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <Input placeholder={editing ? "Employee ID" : "Employee ID (blank = auto, e.g. GL001)"} value={f.emp_id ?? ""} onChange={set("emp_id")} />
                <Input placeholder="Full name" value={f.name} onChange={set("name")} />
                <Input placeholder="Email" value={f.email} onChange={set("email")} />
                <Input placeholder="Phone" value={f.phone} onChange={set("phone")} />
                <Input placeholder="Designation" value={f.designation} onChange={set("designation")} />
                <Input placeholder="Department" value={f.department} onChange={set("department")} />
                <Input placeholder="Location (e.g. Bangalore)" value={f.location} onChange={set("location")} />
                <label className="text-xs text-muted-foreground">Joining date<Input type="date" value={f.joined_on} onChange={set("joined_on")} /></label>
              </div>
              <div className="text-xs font-medium text-muted-foreground">Monthly earnings (₹)</div>
              <div className="grid gap-3 sm:grid-cols-6">
                <Input type="number" placeholder="Basic" value={f.basic} onChange={set("basic")} />
                <Input type="number" placeholder="HRA" value={f.hra} onChange={set("hra")} />
                <Input type="number" placeholder="Special allowance" value={f.special_allowance} onChange={set("special_allowance")} />
                <Input type="number" placeholder="Medical allowance" value={f.medical_allowance} onChange={set("medical_allowance")} />
                <Input type="number" placeholder="Conveyance" value={f.conveyance} onChange={set("conveyance")} />
                <Input type="number" placeholder="CCA" value={f.cca} onChange={set("cca")} />
              </div>
              <div className="text-xs font-medium text-muted-foreground">Monthly deductions (₹)</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input type="number" placeholder="Professional tax" value={f.professional_tax} onChange={set("professional_tax")} />
                <Input type="number" placeholder="Other deductions" value={f.other_deductions} onChange={set("other_deductions")} />
              </div>
              <div className="grid gap-1 sm:grid-cols-3">
                <Input type="password" autoComplete="new-password" placeholder={editing ? "New login password (leave blank to keep)" : "Login password (8+ characters)"} value={f.password} onChange={set("password")} />
                <p className="text-xs text-muted-foreground sm:col-span-2">The employee logs in at the normal login page with their email and this password, and sees their own attendance, leaves, holidays and payslips. Leave it blank to add them without a login.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEmp} className="bg-emerald-600 hover:bg-emerald-700">{editing ? "Save changes" : "Add employee"}</Button>
                {editing && <Button variant="outline" onClick={() => { setEditing(null); setF(blankEmp) }}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            Show <select className={sel} value={filterCo} onChange={(e) => setFilterCo(e.target.value)}><option value="all">All companies</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <Input className="w-72" placeholder="Search by Emp ID, name, email, phone…" value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} />
            {empQuery && <span className="text-xs text-muted-foreground">{shown.length} of {byCompany.length}</span>}
            <Button size="sm" variant="outline" onClick={() => setShowCo(!showCo)}>{showCo ? "Hide companies" : "Edit companies"}</Button>
          </div>
          {showCo && (
            <Card>
              <CardHeader><CardTitle className="text-base">Companies (shown on each payslip)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[...companies, { id: "", name: "", address: [] }].map((c) => <CompanyRow key={c.id || "new"} c={c} onSaved={loadCompanies} />)}
                <p className="text-xs text-muted-foreground">Give each company its name and up to 3 address lines. Employees pick their company in the form above, and their payslip uses that letterhead.</p>
              </CardContent>
            </Card>
          )}
          {exiting && (
            <Card className="border-amber-400">
              <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                <div className="text-sm"><div className="font-medium">Mark {exiting.name} as exited</div><div className="text-xs text-muted-foreground">They can no longer log in. You can then create their experience letter.</div></div>
                <label className="text-xs text-muted-foreground">Last working day<Input type="date" value={exiting.date} onChange={(e) => setExiting({ ...exiting, date: e.target.value })} /></label>
                <Button onClick={confirmExit} className="bg-amber-600 hover:bg-amber-700">Confirm exit</Button>
                <Button variant="ghost" onClick={() => setExiting(null)}>Cancel</Button>
              </CardContent>
            </Card>
          )}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <Th cols={["Emp ID", "Name", "Company", "Designation", "Contact", "Gross / month", `Leave ${year}: taken`, "Remaining", "Login", "Status", ""]} />
              <tbody>
                {shown.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">{empQuery ? `No employees match "${empQuery}".` : "No employees yet."}</td></tr>}
                {shown.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{e.emp_id}</td>
                    <td className="px-3 py-2 font-medium">{e.name}<div className="text-xs text-muted-foreground">{e.department}</div></td>
                    <td className="px-3 py-2 text-xs">{coName(e.company_id)}</td><td className="px-3 py-2">{e.designation}</td>
                    <td className="px-3 py-2 text-xs">{e.email}<br />{e.phone}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{inr(e.basic + e.hra + e.special_allowance + e.medical_allowance + e.conveyance + e.cca)}</td>
                    <td className="px-3 py-2">{e.leave.taken} / {e.leave.total}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-700">{e.leave.remaining}</td>
                    <td className="px-3 py-2 text-xs">{e.has_login ? "Enabled" : "None"}</td><td className="px-3 py-2 text-xs">{e.status === "Exited" ? `Exited ${e.exit_date}` : e.status}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => startEdit(e)}>Edit</Button>{" "}
                      {e.status === "Exited" ? (<><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => letter(e)}>Experience letter</Button> <Button size="sm" variant="ghost" onClick={() => reinstate(e)}>Reinstate</Button></>) : (<><Button size="sm" variant="ghost" onClick={() => setStatus(e)}>{e.status === "Inactive" ? "Activate" : "Deactivate"}</Button> <Button size="sm" variant="outline" onClick={() => setExiting({ id: e.id, name: e.name, date: todayIst() })}>Mark exited</Button></>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {emps.length > 0 && <p className="text-xs text-muted-foreground">{totalLeft} leave days remaining across all employees in {year}.</p>}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Mark attendance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Input type="date" max={todayIst()} value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
                <Button variant="outline" size="sm" onClick={() => setMarks(Object.fromEntries(active.map((e) => [e.id, "Present"])))}>Mark all present</Button>
              </div>
              {active.length === 0 && <p className="text-sm text-muted-foreground">Add employees first.</p>}
              {active.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <span className="font-medium">{e.name}</span>
                  <div className="flex gap-1">{STATUSES.map((s) => <Button key={s} size="sm" variant={marks[e.id] === s ? "default" : "outline"} className={marks[e.id] === s ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setMarks({ ...marks, [e.id]: s })}>{s}</Button>)}</div>
                </div>
              ))}
              <Button onClick={saveAtt} className="bg-emerald-600 hover:bg-emerald-700">Save attendance</Button>
            </CardContent>
          </Card>
          <div className="flex items-center gap-3 text-sm">Monthly summary <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" /></div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm"><Th cols={["Employee", "Present", "Absent", "Half days", "On leave"]} />
              <tbody>{summary.map((s) => <tr key={s.employee_id} className="border-b last:border-0"><td className="px-3 py-2">{s.name}</td><td className="px-3 py-2">{s.present}</td><td className="px-3 py-2">{s.absent}</td><td className="px-3 py-2">{s.half_day}</td><td className="px-3 py-2">{s.on_leave}</td></tr>)}</tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Record a leave</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <select className={sel} value={lv.employee_id} onChange={(e) => setLv({ ...lv, employee_id: e.target.value })}><option value="">Employee…</option>{active.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.leave.remaining} left)</option>)}</select>
                <label className="text-xs text-muted-foreground">From<Input type="date" value={lv.from} onChange={(e) => setLv({ ...lv, from: e.target.value })} /></label>
                <label className="text-xs text-muted-foreground">To<Input type="date" value={lv.to} disabled={lv.half_day} onChange={(e) => setLv({ ...lv, to: e.target.value })} /></label>
                <select className={sel} value={lv.type} onChange={(e) => setLv({ ...lv, type: e.target.value })}>{["Casual", "Sick", "Earned", "Other"].map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Input placeholder="Reason (optional)" value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} className="max-w-sm" />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={lv.half_day} onChange={(e) => setLv({ ...lv, half_day: e.target.checked })} />Half day</label>
                <select className={sel} value={lv.status} onChange={(e) => setLv({ ...lv, status: e.target.value })}><option>Approved</option><option>Pending</option></select>
                <Button onClick={addLeave} className="bg-emerald-600 hover:bg-emerald-700">Add leave</Button>
              </div>
              <p className="text-xs text-muted-foreground">Sundays and listed holidays are not counted. Each employee has 24 leave days a year; approvals beyond that are blocked.</p>
            </CardContent>
          </Card>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm"><Th cols={["Employee", "From", "To", "Days", "Type", "Reason", "Status", ""]} />
              <tbody>
                {leaves.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No leaves recorded for {year}.</td></tr>}
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{nameOf(l.employee_id)}</td><td className="px-3 py-2 whitespace-nowrap">{l.from}</td><td className="px-3 py-2 whitespace-nowrap">{l.to}</td><td className="px-3 py-2">{l.days}</td><td className="px-3 py-2">{l.type}</td><td className="px-3 py-2">{l.reason}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${l.status === "Approved" ? "bg-emerald-100 text-emerald-800" : l.status === "Rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{l.status}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {l.status !== "Approved" && <Button size="sm" variant="outline" onClick={() => decide(l.id, "Approved")}>Approve</Button>} {l.status === "Pending" && <Button size="sm" variant="ghost" onClick={() => decide(l.id, "Rejected")}>Reject</Button>}
                      <Button size="icon" variant="ghost" onClick={() => delLeave(l.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input type="date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} className="w-44" />
            <Input placeholder="Holiday name (e.g. Diwali)" value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} className="max-w-xs" />
            <Button onClick={addHoliday} className="bg-emerald-600 hover:bg-emerald-700">Add holiday</Button>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm"><Th cols={["Date", "Day", "Holiday", ""]} />
              <tbody>
                {holidays.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No holidays added for {year}.</td></tr>}
                {holidays.map((x) => <tr key={x.id} className="border-b last:border-0"><td className="px-3 py-2">{x.date}</td><td className="px-3 py-2">{new Date(x.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}</td><td className="px-3 py-2">{x.name}</td><td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={() => delHoliday(x.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></td></tr>)}
              </tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="payslips" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select className={sel} value={ps.employee_id} onChange={(e) => setPs({ ...ps, employee_id: e.target.value })}><option value="">Employee…</option>{emps.map((e) => <option key={e.id} value={e.id}>{e.name} ({coName(e.company_id)})</option>)}</select>
            <Input type="month" value={ps.month} onChange={(e) => setPs({ ...ps, month: e.target.value })} className="w-44" />
            <Button onClick={makeSlip} className="bg-emerald-600 hover:bg-emerald-700">Generate payslip</Button>
          </div>
          {slip && (
            <Card>
              <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{slip.employee.name} — {slip.month}</span><Button size="sm" variant="outline" onClick={pdf}><Download className="mr-1 h-4 w-4" />Download PDF</Button></CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <div>Employee ID: {slip.employee.emp_id || "-"} · Joining date: {slip.employee.joined_on} · Location: {slip.employee.location || "-"}</div>
                  <div>Working days {slip.working_days} · Effective {slip.effective_days} · LOP {slip.attendance.loss_of_pay_days}</div>
                </div>
                <table className="w-full max-w-xl text-left"><thead><tr className="border-b"><th className="py-1 font-medium">Earnings</th><th className="py-1 text-right font-medium">Full</th><th className="py-1 text-right font-medium">Actual</th></tr></thead>
                  <tbody>{slip.earnings.map((e: any) => <tr key={e.label}><td className="py-0.5">{e.label}</td><td className="py-0.5 text-right">{inr(e.full)}</td><td className="py-0.5 text-right">{inr(e.actual)}</td></tr>)}
                    <tr className="border-t font-medium"><td className="py-1">Total earnings</td><td className="py-1 text-right">{inr(slip.total_full)}</td><td className="py-1 text-right">{inr(slip.total_actual)}</td></tr></tbody></table>
                <div>{slip.deductions.map((d: any) => `${d.label} ${inr(d.amount)}`).join(" · ")} — <span className="font-medium">Total deductions {inr(slip.total_deductions)}</span></div>
                <div>Leave {slip.month.slice(0, 4)}: {slip.leave_balance.taken} taken, {slip.leave_balance.remaining} remaining of {slip.leave_balance.total}</div>
                <div className="text-lg font-bold text-emerald-700">Net pay {inr(slip.net_pay)}</div>
              </CardContent>
            </Card>
          )}
          <p className="text-xs text-muted-foreground">Actual pay = full amount × effective work days ÷ days in month, where effective days = days in month − LOP (absent days + ½ × half days). Mark attendance for the month first so the payslip is accurate.</p>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">New offer letter</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted-foreground">Company<select className={sel + " w-full"} value={of.company_id} onChange={setO("company_id")}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <Input placeholder="Candidate name" value={of.candidate_name} onChange={setO("candidate_name")} />
                <Input placeholder="Candidate email" value={of.candidate_email} onChange={setO("candidate_email")} />
                <Input placeholder="Role offered (e.g. Software Developer)" value={of.designation} onChange={setO("designation")} />
                <Input placeholder="Place of posting" value={of.location} onChange={setO("location")} />
                <label className="text-xs text-muted-foreground">Prior experience recognised (months)<Input type="number" min={0} value={of.prior_experience_months} onChange={setO("prior_experience_months")} /></label>
                <label className="text-xs text-muted-foreground">Offer date<Input type="date" value={of.offer_date} onChange={setO("offer_date")} /></label>
                <label className="text-xs text-muted-foreground">Join on or before<Input type="date" value={of.joining_date} onChange={setO("joining_date")} /></label>
              </div>
              <div className="text-xs font-medium text-muted-foreground">Monthly compensation (₹) — rows left at 0 are left out</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {comps.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={c.label} onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <Input type="number" className="w-36" placeholder="Monthly" value={c.monthly} onChange={(e) => setComps(comps.map((x, j) => (j === i ? { ...x, monthly: e.target.value } : x)))} />
                    <Button variant="ghost" size="icon" onClick={() => setComps(comps.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Button size="sm" variant="outline" onClick={() => setComps([...comps, { label: "", monthly: "" }])}>Add row</Button>
                <span>Monthly total <b>{inr(compTotal)}</b> · Yearly <b>{inr(compTotal * 12)}</b></span>
                <Button size="sm" variant="ghost" onClick={() => setShowTerms(!showTerms)}>{showTerms ? "Hide terms" : "Edit terms (probation, notice, leave)"}</Button>
              </div>
              {showTerms && (
                <div className="grid gap-3 sm:grid-cols-5">
                  {([["probation_months", "Probation (months)"], ["notice_months", "Notice (months)"], ["min_service_months", "Minimum service (months)"], ["casual_leaves", "Casual leaves / year"], ["sick_leaves", "Sick leaves / year"]] as const).map(([k, l]) => (
                    <label key={k} className="text-xs text-muted-foreground">{l}<Input type="number" min={0} value={of[k]} onChange={setO(k)} /></label>
                  ))}
                </div>
              )}
              <Button onClick={createOffer} className="bg-emerald-600 hover:bg-emerald-700">Create &amp; download offer letter</Button>
              <p className="text-xs text-muted-foreground">The PDF uses the chosen company's logo, stamp, phone, email and address. The standard terms text lives in lib/offer-letter-terms.ts.</p>
            </CardContent>
          </Card>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <Th cols={["Candidate", "Company", "Role", "Offer date", "Joining", "Monthly", ""]} />
              <tbody>
                {offers.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No offer letters yet.</td></tr>}
                {offers.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{o.candidate_name}<div className="text-xs text-muted-foreground">{o.candidate_email}</div></td>
                    <td className="px-3 py-2 text-xs">{o.company?.name}</td><td className="px-3 py-2">{o.designation}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.offer_date}</td><td className="px-3 py-2 whitespace-nowrap">{o.joining_date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{inr(o.monthly_total)}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => offerPdf(o)}><Download className="mr-1 h-4 w-4" />Download</Button> <Button size="sm" variant="ghost" onClick={() => removeOffer(o)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="internships" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">New internship offer letter</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-muted-foreground">Company<select className={sel + " w-full"} value={iv.company_id} onChange={setI("company_id")}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <Input placeholder="Candidate name" value={iv.candidate_name} onChange={setI("candidate_name")} />
                <Input type="email" placeholder="Candidate email (the letter is sent here)" value={iv.candidate_email} onChange={setI("candidate_email")} />
                <label className="text-xs text-muted-foreground">Position
                  <select className={sel + " w-full"} value={iv.position_other ? "__other" : iv.position} onChange={(e) => e.target.value === "__other" ? setIv({ ...iv, position_other: true, position: "" }) : setIv({ ...iv, position_other: false, position: e.target.value })}>
                    {INTERN_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}<option value="__other">Other (type it)…</option>
                  </select>
                  {iv.position_other && <Input className="mt-2" placeholder="Type the position" value={iv.position} onChange={setI("position")} />}
                </label>
                <Input placeholder="Work location" value={iv.location} onChange={setI("location")} />
                <label className="text-xs text-muted-foreground">Work mode<select className={sel + " w-full"} value={iv.work_mode} onChange={setI("work_mode")}><option>On-site</option><option>Remote</option><option>Hybrid</option></select></label>
                <label className="text-xs text-muted-foreground">Start date<Input type="date" value={iv.start_date} onChange={setI("start_date")} /></label>
                <label className="text-xs text-muted-foreground">End date (optional)<Input type="date" value={iv.end_date} onChange={setI("end_date")} /></label>
                <label className="text-xs text-muted-foreground">Offer date<Input type="date" value={iv.offer_date} onChange={setI("offer_date")} /></label>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs text-muted-foreground">Duration<div className="mt-1 flex gap-2"><Input type="number" min={1} className="w-24" placeholder="60" value={iv.duration_value} onChange={setI("duration_value")} /><select className={sel} value={iv.duration_unit} onChange={setI("duration_unit")}><option>Hours</option><option>Days</option><option>Weeks</option><option>Months</option></select></div></label>
                <div className="text-xs text-muted-foreground">Internship type
                  <div className="mt-1 flex h-10 items-center gap-4 text-sm text-foreground">
                    <label className="flex items-center gap-1"><input type="radio" checked={!iv.paid} onChange={() => setIv({ ...iv, paid: false })} />Unpaid</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={iv.paid} onChange={() => setIv({ ...iv, paid: true })} />Paid</label>
                  </div></div>
                {iv.paid && <label className="text-xs text-muted-foreground">Stipend per month (₹)<Input type="number" min={1} className="w-40" value={iv.stipend_amount} onChange={setI("stipend_amount")} /></label>}
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={iv.send_email} onChange={(e) => setIv({ ...iv, send_email: e.target.checked })} />Email the letter (PDF) to the candidate now</label>
              <Button onClick={createIntern} disabled={internBusy} className="bg-emerald-600 hover:bg-emerald-700">{internBusy ? "Creating…" : iv.send_email ? "Create & email offer letter" : "Create offer letter"}</Button>
              <p className="text-xs text-muted-foreground">An Internship ID is given automatically (for example GL-INT-2026-001) and printed on the letter. The company is copied on the email, and replies go to the company email.</p>
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Input className="w-80" placeholder="Search by Internship ID, name, email, position…" value={internQuery} onChange={(e) => setInternQuery(e.target.value)} />
            {internQuery && <span className="text-xs text-muted-foreground">{internsShown.length} of {interns.length}</span>}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <Th cols={["Internship ID", "Candidate", "Position", "Type", "Start", "Duration", "Email", ""]} />
              <tbody>
                {internsShown.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">{internQuery ? `No internship offers match "${internQuery}".` : "No internship offers yet."}</td></tr>}
                {internsShown.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{o.internship_id}<div className="font-sans text-muted-foreground">{o.company?.name}</div></td>
                    <td className="px-3 py-2 font-medium">{o.candidate_name}<div className="text-xs font-normal text-muted-foreground">{o.candidate_email}</div></td>
                    <td className="px-3 py-2">{o.position}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.paid ? `Paid ₹${inr(o.stipend_amount)}/mo` : "Unpaid"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.start_date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{o.duration_value} {o.duration_unit}</td>
                    <td className="px-3 py-2 text-xs">{o.email_status === "sent" ? <span className="text-emerald-700">Sent {o.email_sent_at ? new Date(o.email_sent_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}</span> : o.email_status === "failed" ? <span className="text-red-600" title={o.email_error}>Failed</span> : <span className="text-muted-foreground">Not sent</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => downloadIntern(o)}><Download className="mr-1 h-4 w-4" />PDF</Button> <Button size="sm" variant="outline" onClick={() => resendIntern(o)}>{o.email_status === "sent" ? "Resend" : "Send email"}</Button> <Button size="sm" variant="ghost" onClick={() => removeIntern(o)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
