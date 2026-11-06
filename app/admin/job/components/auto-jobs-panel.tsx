"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ApiFailure, api } from "@/lib/certificate-client"
import { RefreshCw, Sparkles } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "react-toastify"

const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "never")

/** Automatic job search: finds matching jobs on public job boards and posts them for students. */
export default function AutoJobsPanel({ onSynced }: { onSynced: () => void }) {
  const [st, setSt] = useState<any>(null)
  const [sources, setSources] = useState<any[]>([])
  const [kw, setKw] = useState("")
  const [loc, setLoc] = useState("")
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const load = useCallback(() => api("/api/admin/jobs/auto").then((d) => { setSt(d.settings); setSources(d.sources); setKw(d.settings.keywords.join(", ")); setLoc(d.settings.locations.join(", ")) }).catch(() => {}), [])
  useEffect(() => { load() }, [load])
  if (!st) return null

  const save = async (patch: any = {}) => {
    try { const d = await api("/api/admin/jobs/auto", { method: "PUT", body: { keywords: kw, locations: loc, sources: st.sources, max_per_run: st.max_per_run, valid_days: st.valid_days, enabled: st.enabled, ...patch } }); setSt(d.settings); toast.success("Saved") } catch (e) { toast.error(err(e)) }
  }
  const sync = async () => {
    setBusy(true)
    try {
      await save()
      const { run } = await api("/api/admin/jobs/auto/sync", { method: "POST" })
      const failed = Object.entries(run.sources as Record<string, { error?: string }>).filter(([, v]) => v.error)
      toast.success(`${run.added} new job${run.added === 1 ? "" : "s"} posted for students`)
      failed.forEach(([k, v]) => toast.warn(`${k}: ${v.error}`))
      await load(); onSynced()
    } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }
  const toggleSource = (id: string) => setSt({ ...st, sources: st.sources.includes(id) ? st.sources.filter((x: string) => x !== id) : [...st.sources, id] })
  const lr = st.last_run

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Automatic job search</span>
          <span className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={st.enabled} onChange={(e) => { setSt({ ...st, enabled: e.target.checked }); save({ enabled: e.target.checked }) }} />Search every day</label>
            <Button size="sm" onClick={sync} disabled={busy}><RefreshCw className={`mr-1 h-4 w-4 ${busy ? "animate-spin" : ""}`} />{busy ? "Searching…" : "Find jobs now"}</Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{open ? "Hide settings" : "Settings"}</Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Matching jobs are found on public job boards and shown to students automatically, with no manual posting. Auto-posted jobs close by themselves when they expire. Last search: <b>{when(lr?.at)}</b>{lr ? ` — ${lr.added} added, ${lr.closed} closed` : ""}.</p>
        {lr && Object.entries(lr.sources as Record<string, { found: number; error?: string }>).some(([, v]) => v.error) && (
          <p className="text-xs text-red-600">{Object.entries(lr.sources as Record<string, { found: number; error?: string }>).filter(([, v]) => v.error).map(([k, v]) => `${k}: ${v.error}`).join(" · ")}</p>
        )}
        {open && (
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground">Search keywords (comma separated; a job must match at least one)<Input value={kw} onChange={(e) => setKw(e.target.value)} /></label>
            <label className="block text-xs text-muted-foreground">Locations to include (comma separated; leave empty for everywhere)<Input value={loc} onChange={(e) => setLoc(e.target.value)} /></label>
            <div className="flex flex-wrap gap-4">
              {sources.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={st.sources.includes(s.id)} onChange={() => toggleSource(s.id)} />{s.label}{!s.ready && <span className="text-amber-600">(not set up)</span>}</label>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs text-muted-foreground">Max new jobs per search<Input type="number" className="w-32" value={st.max_per_run} onChange={(e) => setSt({ ...st, max_per_run: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">Keep each job open (days)<Input type="number" className="w-32" value={st.valid_days} onChange={(e) => setSt({ ...st, valid_days: e.target.value })} /></label>
              <Button variant="outline" onClick={() => save()}>Save settings</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
