"use client"

import { fmtDate } from "@/components/certificates/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { db, storage } from "@/lib/firebase"
import { explainStorageError, uploadSmart } from "@/lib/upload-client"
import { collection, getDocs } from "firebase/firestore"
import { getDownloadURL, ref as storageRef } from "firebase/storage"
import { ApiFailure, api } from "@/lib/certificate-client"
import { Paperclip, Pencil, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface Task {
  id: string
  course_id: number
  course_name: string
  title: string
  description: string
  category: string
  due_date: string | null
  resource_url: string | null
  file_name?: string | null
  file_url?: string | null
  file_size?: number | null
  active: boolean
  submissions?: number
}
type Course = { id: number; name: string }
const CATEGORIES = ["Cloud Infrastructure", "DevOps / CI-CD", "Web Application", "Data & Analytics", "Machine Learning / AI", "Security", "Networking", "Other"]
const empty = { course: "", title: "", description: "", category: CATEGORIES[0], due_date: "", resource_url: "" }

/** Admin / teacher: assign projects to courses. Students see them on My Projects. */
export function AdminTasks({ onNeedsLogin }: { onNeedsLogin: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // task id, or "new"
  const [f, setF] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [keepFile, setKeepFile] = useState(true)

  // Courses come straight from the same Firestore `courses` collection the admin Courses tab uses.
  const loadCourses = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "courses"))
      const list: Course[] = []
      snap.docs.forEach((d, i) => {
        const c = d.data() as { title?: unknown; name?: unknown; courseID?: unknown }
        const name = String(c.title ?? c.name ?? "").trim()
        const n = Number(c.courseID)
        if (name) list.push({ id: Number.isFinite(n) && c.courseID !== "" && c.courseID != null ? n : i + 1, name })
      })
      setCourses(list)
    } catch (e) {
      console.warn("Could not load courses:", e)
    }
  }, [])
  useEffect(() => { loadCourses() }, [loadCourses])

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/project-tasks")
      setTasks(d.tasks)
      setCourses((cur) => (cur.length ? cur : d.courses))
    } catch (e) {
      if (e instanceof ApiFailure && e.needsLogin) onNeedsLogin()
      else toast.error(e instanceof Error ? e.message : "Could not load assigned projects")
    } finally {
      setLoading(false)
    }
  }, [onNeedsLogin])
  useEffect(() => { load() }, [load])

  function startNew() {
    setF({ ...empty, course: courses[0] ? String(courses[0].id) : "" })
    setFile(null)
    setKeepFile(true)
    setEditing("new")
  }
  function startEdit(t: Task) {
    setF({ course: String(t.course_id), title: t.title, description: t.description, category: t.category, due_date: t.due_date ?? "", resource_url: t.resource_url ?? "" })
    setFile(null)
    setKeepFile(true)
    setEditing(t.id)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const course = courses.find((c) => String(c.id) === f.course) ?? tasks.find((t) => String(t.course_id) === f.course && t.id === editing) 
    const course_name = (course as any)?.name ?? (course as any)?.course_name
    if (!course_name) return toast.error("Please select a course")
    setBusy(true)
    try {
      const body = { course_id: Number(f.course), course_name, title: f.title, description: f.description, category: f.category, due_date: f.due_date, resource_url: f.resource_url }
      let saved: any
      if (editing === "new") saved = (await api("/api/admin/project-tasks", { method: "POST", body })).task
      else saved = (await api(`/api/admin/project-tasks/${editing}`, { method: "PUT", body: { ...body, ...(keepFile || file ? {} : { file_url: "" }) } })).task
      if (file) {
        // The admin's project file goes straight to Firebase Storage, then its link is stored on the project.
        const safe = file.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120) || "project-file"
        const path = `project-tasks/${saved.id}/${Date.now()}-${safe}`
        try {
          const via = await uploadSmart(file, path, file.type || "application/octet-stream")
          const url = via === "storage" ? await getDownloadURL(storageRef(storage, path)) : `/api/task-files?path=${encodeURIComponent(path)}`
          await api(`/api/admin/project-tasks/${saved.id}`, { method: "PUT", body: { ...body, file_url: url, file_name: file.name, file_size: file.size } })
        } catch (upErr: any) {
          toast.error(`Project saved, but the file upload failed: ${upErr?.code === "lms/too-large" ? upErr.message : explainStorageError(upErr)}`)
          setEditing(null)
          await load()
          return
        }
      }
      toast.success(editing === "new" ? "Project assigned to the course" : "Project updated")
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  async function toggle(t: Task) {
    try {
      await api(`/api/admin/project-tasks/${t.id}`, { method: "PUT", body: { active: !t.active } })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update")
    }
  }

  async function remove(t: Task) {
    if (!window.confirm(`Delete “${t.title}”?${t.submissions ? " Students already submitted for it, so it will only be hidden." : ""}`)) return
    try {
      const r = await api(`/api/admin/project-tasks/${t.id}`, { method: "DELETE" })
      toast.success(r.hidden ? "Hidden from students (it has submissions)" : "Project deleted")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Projects you assign here appear for students of that course on <b>My Projects</b>.</p>
        {!editing && <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" />Assign a project</Button>}
      </div>

      {editing && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-course">Course</Label>
                  <select id="t-course" value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {courses.length === 0 && <option value="">No courses found</option>}
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-cat">Category</Label>
                  <select id="t-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {[...new Set([f.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-title">Project title</Label>
                <Input id="t-title" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Serverless Image Processing Pipeline" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-desc">What students must build</Label>
                <Textarea id="t-desc" rows={6} maxLength={5000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Describe the project, the requirements and what to upload." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-due">Due date (optional)</Label>
                  <Input id="t-due" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-url">Brief / material link (optional)</Label>
                  <Input id="t-url" type="url" value={f.resource_url} onChange={(e) => setF({ ...f, resource_url: e.target.value })} placeholder="https://drive.google.com/…" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-file">Upload project file (optional)</Label>
                <Input id="t-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">PDF, ZIP, document… students can download it from My Projects.</p>
                {editing !== "new" && tasks.find((t) => t.id === editing)?.file_url && !file && (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={keepFile} onChange={(e) => setKeepFile(e.target.checked)} />
                    Keep current file ({tasks.find((t) => t.id === editing)?.file_name})
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing === "new" ? "Assign project" : "Save changes"}</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && tasks.length === 0 && !editing && <p className="text-sm text-muted-foreground">No projects assigned yet. Click “Assign a project” to add the first one.</p>}
      {tasks.map((t) => (
        <Card key={t.id} className={t.active ? "" : "opacity-60"}>
          <CardContent className="space-y-2 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-muted-foreground">{t.course_name} · {t.category}{t.due_date ? ` · due ${fmtDate(t.due_date)}` : ""} · {t.submissions ?? 0} submission(s)</div>
              </div>
              {!t.active && <Badge variant="secondary">Hidden</Badge>}
            </div>
            <p className="whitespace-pre-wrap text-sm">{t.description}</p>
            {t.file_url && <a href={t.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium underline"><Paperclip className="h-3 w-3" />{t.file_name || "Project file"}</a>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(t)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
              <Button size="sm" variant="outline" onClick={() => toggle(t)}>{t.active ? "Hide" : "Show"}</Button>
              <Button size="sm" variant="outline" onClick={() => remove(t)}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
