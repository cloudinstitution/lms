"use client"

import { SignInAgain } from "@/components/certificates/sign-in-again"
import { StatusBadge, fmtDate } from "@/components/certificates/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiFailure, LOGIN_AGAIN_MESSAGE, api } from "@/lib/certificate-client"
import { CheckCircle2, Clock, Paperclip, RotateCcw, XCircle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type Counts = { pending: number; accepted: number; rejected: number; resubmission: number }
const TILES: { key: string; label: string; field: keyof Counts; icon: any; color: string }[] = [
  { key: "pending", label: "Pending Review", field: "pending", icon: Clock, color: "text-amber-600" },
  { key: "Accepted", label: "Accepted", field: "accepted", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "Rejected", label: "Rejected", field: "rejected", icon: XCircle, color: "text-red-600" },
  { key: "Resubmission Required", label: "Resubmission", field: "resubmission", icon: RotateCcw, color: "text-orange-600" },
]
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [counts, setCounts] = useState<Counts>({ pending: 0, accepted: 0, rejected: 0, resubmission: 0 })
  const [filter, setFilter] = useState("pending")
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [open, setOpen] = useState<any>(null)
  const [remarks, setRemarks] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)
      if (q.trim()) params.set("q", q.trim())
      const d = await api(`/api/admin/projects?${params}`)
      setProjects(d.projects)
      setCounts(d.counts)
      setNeedsLogin(false)
    } catch (e) {
      if (e instanceof ApiFailure && e.needsLogin) setNeedsLogin(true)
      else toast.error(e instanceof Error ? e.message : "Could not load projects")
    } finally {
      setLoading(false)
    }
  }, [filter, q])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  async function review(id: string) {
    try {
      const d = await api(`/api/admin/projects/${id}`) // also moves Submitted → Under Review
      setOpen(d.project)
      setRemarks("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open project")
    }
  }

  async function decide(action: "accept" | "reject" | "resubmit") {
    if (action !== "accept" && !remarks.trim()) return toast.error("Remarks are required for this action")
    setBusy(true)
    try {
      const d = await api(`/api/admin/projects/${open.id}/${action}`, { method: "PUT", body: { remarks } })
      toast.success(action === "accept" ? `Accepted — certificate ${d.certificate?.certificate_id} issued` : action === "reject" ? "Project rejected" : "Resubmission requested")
      setOpen(null)
      setRemarks("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  const locked = open?.status === "Accepted"

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Project Reviews</h1>
        <p className="text-muted-foreground">Review student project submissions. Accepting a project issues the student's certificate automatically.</p>
      </div>
      {needsLogin && <SignInAgain />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} className="text-left">
            <Card className={filter === t.key ? "ring-2 ring-primary" : ""}>
              <CardContent className="flex items-center justify-between pt-6">
                <div><div className="text-sm text-muted-foreground">{t.label}</div><div className="text-3xl font-bold">{counts[t.field]}</div></div>
                <t.icon className={`h-8 w-8 ${t.color}`} />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search student, ID or project…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>{["Student", "Project", "Course", "Submitted", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && projects.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No projects found.</td></tr>}
              {projects.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3"><div className="font-medium">{p.student_name}</div><div className="font-mono text-xs text-muted-foreground">{p.student_id}</div></td>
                  <td className="px-4 py-3">{p.project_title}</td>
                  <td className="px-4 py-3">{p.course_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(p.submission_date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => review(p.id)}>Review</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{open.project_title} <StatusBadge status={open.status} /></DialogTitle>
                <DialogDescription>{open.student_name} ({open.student_id}) · {open.course_name} · {open.category} · {fmtDate(open.submission_date)}</DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm">{open.project_description}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {open.files.map((f: any) => (
                  <a key={f.id} href={`/api/admin/projects/${open.id}/files/${f.id}`} className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-muted">
                    <Paperclip className="h-3 w-3" />{f.name} <span className="text-muted-foreground">({f.kind}, {kb(f.size)})</span>
                  </a>
                ))}
              </div>
              {open.admin_remarks && <Alert><AlertTitle>Previous remarks</AlertTitle><AlertDescription className="whitespace-pre-wrap">{open.admin_remarks}</AlertDescription></Alert>}
              {locked ? (
                <Alert><AlertTitle>Accepted</AlertTitle><AlertDescription>Certificate {open.certificate?.certificate_id} was issued. To undo it, revoke the certificate under Certificates.</AlertDescription></Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks <span className="text-xs text-muted-foreground">(required to reject or request resubmission)</span></Label>
                    <Textarea id="remarks" rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Tell the student what needs to change…" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => decide("accept")} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-2 h-4 w-4" />Accept &amp; issue certificate</Button>
                    <Button disabled={busy} variant="outline" onClick={() => decide("resubmit")}><RotateCcw className="mr-2 h-4 w-4" />Request resubmission</Button>
                    <Button disabled={busy} variant="destructive" onClick={() => decide("reject")}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
