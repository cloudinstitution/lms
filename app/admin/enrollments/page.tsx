"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiFailure, api } from "@/lib/certificate-client"
import { rupees } from "@/lib/learner-client"
import { Download } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "")
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`

export default function AdminEnrollmentsPage() {
  const [data, setData] = useState<{ enrollments: any[]; signups: any[]; requests: any[]; revenue: number } | null>(null)
  const [q, setQ] = useState("")

  const load = () => api("/api/admin/enrollments").then(setData).catch((e) => toast.error(e instanceof ApiFailure || e instanceof Error ? e.message : "Could not load enrollments"))
  useEffect(() => { load() }, [])

  const decide = async (id: string, action: "approve" | "reject") => {
    if (action === "approve" && !confirm("Approve only after you have seen this payment in your Razorpay dashboard. Unlock the course?")) return
    try {
      await api(`/api/admin/payment-requests/${id}`, { method: "PUT", body: { action } })
      toast.success(action === "approve" ? "Course unlocked for the learner" : "Request rejected")
      load()
    } catch (e: any) { toast.error(e?.message || "Could not update the request") }
  }
  const [fees, setFees] = useState<{ id: number; title: string; price: number }[]>([])
  const [draft, setDraft] = useState<Record<number, string>>({})
  const loadFees = () => api("/api/admin/course-fees").then((d: any) => { setFees(d.courses); setDraft({}) }).catch(() => {})
  useEffect(() => { loadFees() }, [])
  const saveFee = async (id: number) => {
    try {
      await api("/api/admin/course-fees", { method: "PUT", body: { course_id: id, price: Number(draft[id]) } })
      toast.success("Fee updated. New purchases use it right away.")
      loadFees()
    } catch (e: any) { toast.error(e?.message || "Could not update the fee") }
  }
  const [add, setAdd] = useState({ email: "", course_id: "", reference: "" })
  const addEnrollment = async () => {
    try {
      await api("/api/admin/enrollments", { method: "POST", body: { email: add.email, course_id: Number(add.course_id), reference: add.reference } })
      toast.success("Course unlocked for the learner")
      setAdd({ email: "", course_id: "", reference: "" })
      load()
    } catch (e: any) { toast.error(e?.message || "Could not add the enrollment") }
  }
  const pending = (data?.requests ?? []).filter((r) => r.status === "pending")

  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase())
  const rows = useMemo(() => (data?.enrollments ?? []).filter((r) => !q || match(`${r.name} ${r.email} ${r.phone} ${r.course} ${r.payment_id}`)), [data, q])
  const signups = useMemo(() => (data?.signups ?? []).filter((r) => !q || match(`${r.name} ${r.email} ${r.phone}`)), [data, q])

  const exportCsv = () => {
    const head = ["Name", "Email", "Phone", "Course", "Amount (INR)", "Payment ID", "Order ID", "Enrolled at"]
    const lines = [head, ...rows.map((r) => [r.name, r.email, r.phone, r.course, r.amount, r.payment_id, r.order_id, r.enrolled_at])]
    const blob = new Blob(["﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "enrollments.csv"; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Online Enrollments</h1>
          <p className="text-muted-foreground">People who signed up on the website and bought courses.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[["Paid enrollments", data?.enrollments.length ?? "–"], ["Sign-ups", data?.signups.length ?? "–"], ["Revenue", data ? rupees(data.revenue) : "–"]].map(([k, v]) => (
          <Card key={String(k)}><CardContent className="pt-6"><div className="text-sm text-muted-foreground">{k}</div><div className="text-2xl font-bold">{v}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="font-semibold">Course fees</div>
          <p className="text-sm text-muted-foreground">The amount shown to buyers and charged for each course. Change it here whenever the fee changes.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {fees.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <span className="flex-1">{c.title}</span>
                <span className="text-muted-foreground">₹</span>
                <Input type="number" min={1} className="h-8 w-28" value={draft[c.id] ?? String(c.price)} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} />
                <Button size="sm" disabled={draft[c.id] === undefined || Number(draft[c.id]) === c.price} onClick={() => saveFee(c.id)}>Save</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="font-semibold">Add an enrollment manually</div>
          <p className="text-sm text-muted-foreground">Use this when you see a payment in your Razorpay dashboard that is not listed below. The learner must have signed up with this email.</p>
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Learner email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={add.course_id} onChange={(e) => setAdd({ ...add, course_id: e.target.value })}>
              <option value="">Choose course</option>
              {fees.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <Input placeholder="Payment ID / UTR (optional)" value={add.reference} onChange={(e) => setAdd({ ...add, reference: e.target.value })} />
            <Button onClick={addEnrollment} disabled={!add.email || !add.course_id}>Unlock course</Button>
          </div>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card className="border-amber-300">
          <CardContent className="space-y-3 pt-6">
            <div className="font-semibold">Payments waiting for confirmation ({pending.length})</div>
            <p className="text-sm text-muted-foreground">Match the reference with a payment in your Razorpay dashboard, then approve.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b">{["Name", "Email", "Course", "Amount", "Reference", "Sent", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.email}</td><td className="px-3 py-2">{r.course}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{rupees(r.amount)}</td><td className="px-3 py-2 font-mono text-xs">{r.reference || <span className="font-sans text-muted-foreground">not entered yet</span>}</td><td className="px-3 py-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><Button size="sm" onClick={() => decide(r.id, "approve")}>Approve</Button> <Button size="sm" variant="outline" onClick={() => decide(r.id, "reject")}>Reject</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Input placeholder="Search name, email, phone, course or payment ID" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      <Tabs defaultValue="paid">
        <TabsList><TabsTrigger value="paid">Enrollments</TabsTrigger><TabsTrigger value="signups">All sign-ups</TabsTrigger></TabsList>
        <TabsContent value="paid">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50"><tr>{["Name", "Email", "Phone", "Course", "Amount", "Payment ID", "Enrolled"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {!data && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
                {data && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No enrollments yet.</td></tr>}
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.email}</td><td className="px-4 py-3 whitespace-nowrap">{r.phone}</td>
                    <td className="px-4 py-3">{r.course}</td><td className="px-4 py-3 whitespace-nowrap">{rupees(r.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.payment_id}</td><td className="px-4 py-3 whitespace-nowrap">{fmt(r.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="signups">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50"><tr>{["Name", "Email", "Phone", "Courses bought", "Signed up"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {data && signups.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No sign-ups yet.</td></tr>}
                {signups.map((r, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.email}</td><td className="px-4 py-3">{r.phone}</td><td className="px-4 py-3">{r.purchased}</td><td className="px-4 py-3 whitespace-nowrap">{fmt(r.created_at)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
