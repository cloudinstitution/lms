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
  const [data, setData] = useState<{ enrollments: any[]; signups: any[]; revenue: number } | null>(null)
  const [q, setQ] = useState("")

  useEffect(() => {
    api("/api/admin/enrollments").then(setData).catch((e) => toast.error(e instanceof ApiFailure || e instanceof Error ? e.message : "Could not load enrollments"))
  }, [])

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
