"use client"

import { StatusBadge } from "@/components/certificates/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiFailure, LOGIN_AGAIN_MESSAGE, api } from "@/lib/certificate-client"
import { Download, Eye, ShieldCheck, ShieldOff } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

export default function AdminCertificatesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<any>(null)
  const [reason, setReason] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (q.trim()) p.set("q", q.trim())
      if (status) p.set("status", status)
      if (from) p.set("from", from)
      if (to) p.set("to", to)
      setRows((await api(`/api/admin/certificates?${p}`)).certificates)
      setDenied(null)
    } catch (e) {
      if (e instanceof ApiFailure && e.needsLogin) setDenied(LOGIN_AGAIN_MESSAGE)
      else if (e instanceof ApiFailure && e.status === 403) setDenied("Only administrators can manage certificates.")
      else toast.error(e instanceof Error ? e.message : "Could not load certificates")
    } finally {
      setLoading(false)
    }
  }, [q, status, from, to])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  async function setState(c: any, action: "revoke" | "reactivate", body?: object) {
    try {
      await api(`/api/admin/certificates/${encodeURIComponent(c.certificate_id)}/${action}`, { method: "PUT", body: body ?? {} })
      toast.success(action === "revoke" ? `Certificate ${c.certificate_id} revoked` : `Certificate ${c.certificate_id} reactivated`)
      setRevoking(null); setReason("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Certificate Management</h1>
        <p className="text-muted-foreground">Every certificate code is the student's ID. Revoking takes effect immediately on the public verification page.</p>
      </div>
      {denied && <Alert variant="destructive"><AlertTitle>Access problem</AlertTitle><AlertDescription>{denied}</AlertDescription></Alert>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>Search</Label><Input className="w-64" placeholder="Name, student ID, project…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="space-y-1"><Label>Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">All</option><option>Valid</option><option>Revoked</option>
          </select>
        </div>
        <div className="space-y-1"><Label>Issued from</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label>to</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>{["Certificate ID", "Student", "Course", "Issued", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No certificates found.</td></tr>}
              {rows.map((c) => (
                <tr key={c.certificate_id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono">{c.certificate_id}</td>
                  <td className="px-4 py-3">{c.student_name}</td>
                  <td className="px-4 py-3">{c.course_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.issue_date_display}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} />{c.revoke_reason && <div className="mt-1 text-xs text-muted-foreground">{c.revoke_reason}</div>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="View verification page" asChild><a href={c.verify_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a></Button>
                      {c.status === "Valid" && <Button size="icon" variant="ghost" title="Download PDF" asChild><a href={`/api/admin/certificates/${encodeURIComponent(c.certificate_id)}/download`}><Download className="h-4 w-4" /></a></Button>}
                      {c.status === "Valid"
                        ? <Button size="sm" variant="outline" className="text-red-600" onClick={() => setRevoking(c)}><ShieldOff className="mr-1 h-4 w-4" />Revoke</Button>
                        : <Button size="sm" variant="outline" onClick={() => setState(c, "reactivate")}><ShieldCheck className="mr-1 h-4 w-4" />Reactivate</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(revoking)} onOpenChange={(v) => !v && setRevoking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke certificate {revoking?.certificate_id}?</DialogTitle>
            <DialogDescription>The student can no longer download it, and its QR code will show “Certificate Revoked”. You can reactivate it later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label htmlFor="reason">Reason (optional)</Label><Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setState(revoking, "revoke", { reason })}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
