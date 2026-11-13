"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { learnerApi as api } from "@/lib/learner-client"
import { Download, GraduationCap, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN")
const sel = "h-10 rounded-md border bg-background px-3 text-sm"
const pill = (s: string) => s === "Approved" || s === "Present" ? "bg-emerald-100 text-emerald-800" : s === "Rejected" || s === "Absent" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"

export default function EmployeeDashboard() {
  const router = useRouter()
  const [month, setMonth] = useState(todayIst().slice(0, 7))
  const [data, setData] = useState<any>(null)
  const [lv, setLv] = useState({ from: todayIst(), to: "", type: "Casual", reason: "", half_day: false })
  const [slip, setSlip] = useState<any>(null)
  const [marking, setMarking] = useState(false)
  const [markMsg, setMarkMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [slipMonth, setSlipMonth] = useState(todayIst().slice(0, 7))

  const load = useCallback(() => api(`/api/employee/me?month=${month}`).then(setData).catch(() => router.replace("/login")), [month, router])
  useEffect(() => { load() }, [load])

  const markAttendance = () => {
    if (!navigator.geolocation) return setMarkMsg({ ok: false, text: "This browser can't share its location. Please use your phone or another browser." })
    setMarking(true); setMarkMsg(null)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await api("/api/employee/attendance", { body: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } })
        const away = r.distance_m >= 1000 ? `${(r.distance_m / 1000).toFixed(1)} km` : `${r.distance_m} m`
        if (r.kept === "admin") setMarkMsg({ ok: r.status === "Present", text: `Today's attendance was already recorded by your admin as ${r.status}.` })
        else if (r.kept === "already") setMarkMsg({ ok: true, text: "You're already marked Present today." })
        else if (r.status === "Present") { setMarkMsg({ ok: true, text: `Marked Present — you are ${away} from the office.` }); toast.success("Attendance marked: Present") }
        else { setMarkMsg({ ok: false, text: `You are ${away} from the office (allowed: ${r.radius_m} m), so today is marked Absent. If you reach the office, tap the button again.` }); toast.warning("Marked Absent — you're away from the office") }
        load()
      } catch (e: any) { setMarkMsg({ ok: false, text: e?.message || "Could not mark attendance" }) } finally { setMarking(false) }
    }, (e) => {
      setMarking(false)
      setMarkMsg({ ok: false, text: e.code === 1 ? "Location access is blocked. Allow location for this site in your browser settings, then try again. (Nothing was recorded.)" : "Couldn't get your location. Turn on GPS / location, then try again. (Nothing was recorded.)" })
    }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 })
  }
  const logout = async () => { await fetch("/api/employee/logout", { method: "POST", credentials: "same-origin" }).catch(() => {}); router.push("/") }
  const apply = async () => {
    try { await api("/api/employee/leaves", { body: { ...lv, to: lv.to || lv.from } }); toast.success("Leave request sent for approval"); setLv({ ...lv, reason: "", to: "" }); load() } catch (e: any) { toast.error(e?.message || "Could not send the request") }
  }
  const cancel = async (id: string) => { try { await api(`/api/employee/leaves/${id}`, { method: "DELETE" }); load() } catch (e: any) { toast.error(e?.message || "Could not cancel") } }
  const viewSlip = async () => { try { setSlip((await api(`/api/employee/payslip?month=${slipMonth}`)).payslip) } catch (e: any) { toast.error(e?.message || "Could not load the payslip") } }
  const pdf = () => import("@/lib/payslip-pdf").then((m) => m.downloadPayslip(slip)).catch(() => toast.error("Could not create the PDF"))

  if (!data) return <div className="p-6 text-muted-foreground">Loading…</div>
  const l = data.leave
  const upcoming = data.holidays.filter((h: any) => h.date >= todayIst())

  return (
    <div className="min-h-screen bg-purple-50/60">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/employee/dashboard" className="flex items-center gap-2 font-bold text-emerald-700"><GraduationCap className="h-6 w-6" />Cloud Institution · Staff</Link>
          <div className="flex items-center gap-3 text-sm"><span className="hidden sm:inline">{data.employee.name}</span><Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" />Log out</Button></div>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {data.employee.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">{[data.employee.emp_id && `ID ${data.employee.emp_id}`, data.employee.designation, data.employee.department].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {[["Total leaves", l.total], ["Taken", l.taken], ["Remaining", l.remaining], ["Holidays ahead", upcoming.length]].map(([a, b]) => (
            <Card key={String(a)}><CardContent className="pt-6"><div className="text-2xl font-bold">{b}</div><div className="text-sm text-muted-foreground">{a} ({data.year})</div></CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="leaves">
          <TabsList><TabsTrigger value="leaves">Leaves</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="payslips">Payslips</TabsTrigger><TabsTrigger value="holidays">Holidays</TabsTrigger></TabsList>

          <TabsContent value="leaves" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Apply for leave</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs text-muted-foreground">From<Input type="date" value={lv.from} onChange={(e) => setLv({ ...lv, from: e.target.value })} /></label>
                  <label className="text-xs text-muted-foreground">To<Input type="date" value={lv.to} disabled={lv.half_day} onChange={(e) => setLv({ ...lv, to: e.target.value })} /></label>
                  <label className="text-xs text-muted-foreground">Type<select className={sel + " w-full"} value={lv.type} onChange={(e) => setLv({ ...lv, type: e.target.value })}>{["Casual", "Sick", "Earned", "Other"].map((t) => <option key={t}>{t}</option>)}</select></label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Input placeholder="Reason" value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} className="max-w-sm" />
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={lv.half_day} onChange={(e) => setLv({ ...lv, half_day: e.target.checked })} />Half day</label>
                  <Button onClick={apply} className="bg-emerald-600 hover:bg-emerald-700">Send request</Button>
                </div>
                <p className="text-xs text-muted-foreground">Sundays and holidays are not counted. Your admin approves or rejects the request.</p>
              </CardContent>
            </Card>
            <div className="overflow-x-auto rounded-md border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50"><tr>{["From", "To", "Days", "Type", "Reason", "Status", ""].map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}</tr></thead>
                <tbody>
                  {data.leaves.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No leaves this year.</td></tr>}
                  {data.leaves.map((x: any) => <tr key={x.id} className="border-b last:border-0"><td className="px-3 py-2 whitespace-nowrap">{x.from}</td><td className="px-3 py-2 whitespace-nowrap">{x.to}</td><td className="px-3 py-2">{x.days}</td><td className="px-3 py-2">{x.type}</td><td className="px-3 py-2">{x.reason}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${pill(x.status)}`}>{x.status}</span></td><td className="px-3 py-2">{x.status === "Pending" && <Button size="sm" variant="ghost" onClick={() => cancel(x.id)}>Cancel</Button>}</td></tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Today's attendance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={markAttendance} disabled={marking || !data.office.configured || data.today.status === "Present"} className="bg-emerald-600 hover:bg-emerald-700">{marking ? "Checking your location…" : data.today.status === "Present" ? "Marked Present today" : "Mark my attendance"}</Button>
                  {data.today.status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill(data.today.status)}`}>Today: {data.today.status}{data.today.distance_m != null ? ` · ${data.today.distance_m} m from office` : ""}</span>}
                </div>
                {!data.office.configured && <p className="text-sm text-amber-700">Your office location hasn't been set up yet, so you can't mark attendance yet. Please ask your admin.</p>}
                {markMsg && <p className={`text-sm ${markMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{markMsg.text}</p>}
                <p className="text-xs text-muted-foreground">Tap the button while you are at the office and allow location access. Within {data.office.radius_m} m of the office you are marked Present; from further away you are marked Absent. Your location is used only to check this distance.</p>
              </CardContent>
            </Card>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            <div className="overflow-x-auto rounded-md border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Day</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">How</th></tr></thead>
                <tbody>
                  {data.attendance.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No attendance marked for this month yet.</td></tr>}
                  {data.attendance.map((a: any) => <tr key={a.date} className="border-b last:border-0"><td className="px-3 py-2">{a.date}</td><td className="px-3 py-2">{new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${pill(a.status)}`}>{a.status}</span></td><td className="px-3 py-2 text-xs text-muted-foreground">{a.self ? `Self check-in${a.distance_m != null ? ` · ${a.distance_m} m from office` : ""}` : "Recorded by admin"}</td></tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payslips" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3"><Input type="month" value={slipMonth} onChange={(e) => setSlipMonth(e.target.value)} className="w-44" /><Button onClick={viewSlip} className="bg-emerald-600 hover:bg-emerald-700">View payslip</Button></div>
            {slip && (
              <Card>
                <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>Payslip — {slip.month}</span><Button size="sm" variant="outline" onClick={pdf}><Download className="mr-1 h-4 w-4" />Download PDF</Button></CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>Working days {slip.working_days} · Effective {slip.effective_days} · LOP {slip.attendance.loss_of_pay_days}</div>
                  <table className="w-full max-w-xl text-left"><thead><tr className="border-b"><th className="py-1 font-medium">Earnings</th><th className="py-1 text-right font-medium">Full</th><th className="py-1 text-right font-medium">Actual</th></tr></thead>
                    <tbody>{slip.earnings.map((e: any) => <tr key={e.label}><td className="py-0.5">{e.label}</td><td className="py-0.5 text-right">{inr(e.full)}</td><td className="py-0.5 text-right">{inr(e.actual)}</td></tr>)}
                      <tr className="border-t font-medium"><td className="py-1">Total earnings</td><td className="py-1 text-right">{inr(slip.total_full)}</td><td className="py-1 text-right">{inr(slip.total_actual)}</td></tr></tbody></table>
                  <div>{slip.deductions.map((d: any) => `${d.label} ${inr(d.amount)}`).join(" · ")} — <span className="font-medium">Total deductions {inr(slip.total_deductions)}</span></div>
                  <div className="text-lg font-bold text-emerald-700">Net pay {inr(slip.net_pay)}</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="holidays">
            <div className="overflow-x-auto rounded-md border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Day</th><th className="px-3 py-2 font-medium">Holiday</th></tr></thead>
                <tbody>
                  {data.holidays.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No holidays announced for {data.year} yet.</td></tr>}
                  {data.holidays.map((h: any) => <tr key={h.id} className="border-b last:border-0"><td className="px-3 py-2">{h.date}</td><td className="px-3 py-2">{new Date(h.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}</td><td className="px-3 py-2">{h.name}</td></tr>)}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
