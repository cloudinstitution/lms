"use client"

import { SignInAgain } from "@/components/certificates/sign-in-again"
import { StatusBadge, fmtDate } from "@/components/certificates/status-badge"
import StudentLayout from "@/components/student-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiFailure, LOGIN_AGAIN_MESSAGE, api } from "@/lib/certificate-client"
import { Award, FileUp, Loader2, MessageSquareWarning, Paperclip } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { explainStorageError, uploadSmart, uploadViaFirestore } from "@/lib/upload-client"
import { toast } from "sonner"

const ACCEPT = ".pdf,.zip,.rar,.7z,.gz,.tar,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.ipynb,.py,.js,.ts,.java,.json"

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
  my_status: string | null
  student_course?: string
}

interface Project {
  id: string
  task_id?: string | null
  course_id: number
  course_name: string
  project_title: string
  project_description: string
  category: string
  submission_date: string
  status: string
  admin_remarks: string | null
  files: { id: string; kind: string; name: string; size: number }[]
  certificate: { certificate_id: string; status: string } | null
  certificate_available: boolean
}

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export default function StudentProjectsPage() {
  const [courses, setCourses] = useState<{ id: number; name: string }[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resubmitId, setResubmitId] = useState<string | null>(null)

  const [tasks, setTasks] = useState<Task[]>([])
  const [courseId, setCourseId] = useState("")
  const [taskId, setTaskId] = useState("")
  const [description, setDescription] = useState("")
  const [projectFiles, setProjectFiles] = useState<File[]>([])
  const [supportFiles, setSupportFiles] = useState<File[]>([])
  const formRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const [c, p, t] = await Promise.all([api("/api/student/courses"), api("/api/student/projects"), api("/api/student/project-tasks")])
      setCourses(c.courses)
      setProjects(p.projects)
      setTasks(t.tasks)
      setCourseId((cur) => cur || String(c.courses[0]?.id ?? ""))
      setNeedsLogin(false)
    } catch (e) {
      if (e instanceof ApiFailure && e.needsLogin) setNeedsLogin(true)
      else toast.error(e instanceof Error ? e.message : "Could not load your projects")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const active = projects.find((p) => p.status === "Submitted" || p.status === "Under Review")
  const accepted = projects.find((p) => p.status === "Accepted")
  const resubmitting = projects.find((p) => p.id === resubmitId) || null
  const canSubmit = true
  const selectedCourse = courses.find((c) => String(c.id) === courseId)
  const courseTasks = tasks.filter((t) => !selectedCourse || t.student_course === selectedCourse.name)
  const chosen = tasks.find((t) => t.id === taskId) || null

  function startResubmit(p: Project) {
    setResubmitId(p.id)
    setCourseId(String(p.course_id))
    setTaskId(p.task_id ?? "")
    setDescription(p.project_description)
    setProjectFiles([])
    setSupportFiles([])
    formRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId) return toast.error("Please select a course")
    if (!taskId) return toast.error("Please choose the project you are submitting")
    if (projectFiles.length === 0) return toast.error("Please attach your project file")
    const tooBig = [...projectFiles, ...supportFiles].find((f) => f.size > 500 * 1024 * 1024)
    if (tooBig) return toast.error(`"${tooBig.name}" is larger than 500 MB`)
    setBusy(true)
    setProgress(0)
    try {
      const wanted = [
        ...projectFiles.map((f) => ({ f, kind: "project" as const })),
        ...supportFiles.map((f) => ({ f, kind: "supporting" as const })),
      ]
      const { slots } = await api("/api/projects/upload-urls", {
        method: "POST",
        body: { files: wanted.map(({ f, kind }) => ({ name: f.name, size: f.size, type: f.type || "application/octet-stream", kind })) },
      })
      // Slots come back in request order; upload each file straight to Firebase Storage.
      for (let i = 0; i < slots.length; i++) {
        if (String(slots[i].upload_url).startsWith("client-upload://")) {
          // No server credentials configured: upload straight to Firebase Storage with the web SDK.
          try {
            await uploadSmart(wanted[i].f, slots[i].path, slots[i].content_type, (frac) => setProgress(Math.round(((i + frac) / slots.length) * 100)))
          } catch (err: any) {
            throw new Error(err?.code === "lms/too-large" ? err.message : `Upload of "${wanted[i].f.name}" failed: ${explainStorageError(err)}`)
          }
          continue
        }
        let ok = false
        try {
          const res = await fetch(slots[i].upload_url, { method: "PUT", headers: { "Content-Type": slots[i].content_type }, body: wanted[i].f })
          ok = res.ok
        } catch {
          ok = false
        }
        if (!ok) {
          // Cloud Storage not reachable from the browser: keep the file in Firestore instead.
          try {
            await uploadViaFirestore(wanted[i].f, slots[i].path, slots[i].content_type, (frac) => setProgress(Math.round(((i + frac) / slots.length) * 100)))
          } catch (err: any) {
            throw new Error(err?.code === "lms/too-large" ? err.message : `Upload of "${wanted[i].f.name}" failed. Please try again.`)
          }
        }
      }
      setProgress(100)
      await api("/api/projects/submit", {
        method: "POST",
        body: {
          task_id: taskId,
          course_id: Number(courseId),
          project_description: description,
          project_id: resubmitId ?? undefined,
          files: slots.map((s: any) => ({ path: s.path, kind: s.kind })),
        },
      })
      toast.success(resubmitId ? "Project resubmitted for review" : "Project submitted for review")
      setTaskId(""); setDescription(""); setProjectFiles([]); setSupportFiles([]); setResubmitId(null)
      await load()
    } catch (err) {
      if (err instanceof ApiFailure && err.needsLogin) setNeedsLogin(true)
      toast.error(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">Submit your project for review. Once it is accepted your certificate is issued automatically.</p>
        </div>

        {needsLogin && <SignInAgain />}

        {accepted && (
          <Alert>
            <Award className="h-4 w-4" />
            <AlertTitle>Project Approved!</AlertTitle>
            <AlertDescription>
              Your project “{accepted.project_title}” was accepted.{" "}
              <Link className="font-medium underline" href="/student/certificates">View your certificate</Link>
            </AlertDescription>
          </Alert>
        )}

        {!loading && !needsLogin && courses.length === 0 && (
          <Alert variant="destructive">
            <AlertTitle>No course found on your profile</AlertTitle>
            <AlertDescription>You can only submit a project for a course you are enrolled in. Please contact the administrator to add a course to your account.</AlertDescription>
          </Alert>
        )}

        {!loading && !needsLogin && (
          <Card>
            <CardHeader>
              <CardTitle>Projects assigned to your course</CardTitle>
              <CardDescription>
                {selectedCourse ? `For ${selectedCourse.name}. ` : ""}Your instructor adds these. Choose one, then upload your work below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {courses.length > 1 && (
                <select aria-label="Course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setTaskId("") }} disabled={Boolean(resubmitId)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {courseTasks.length === 0 && (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No project has been assigned for {selectedCourse ? `“${selectedCourse.name}”` : "your course"} yet. Please check back later.
                </p>
              )}
              {courseTasks.map((t) => {
                const mine = t.my_status
                const blocked = mine === "Submitted" || mine === "Under Review" || mine === "Accepted"
                return (
                  <div key={t.id} className={`space-y-2 rounded-md border p-4 text-sm ${taskId === t.id ? "border-primary ring-1 ring-primary" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{t.category}{t.due_date ? ` · due ${fmtDate(t.due_date)}` : ""}</span>
                      {mine && <StatusBadge status={mine} />}
                    </div>
                    <p className="whitespace-pre-wrap text-muted-foreground">{t.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {t.file_url && <a href={t.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium underline"><Paperclip className="h-3 w-3" />Download project file{t.file_name ? ` (${t.file_name})` : ""}</a>}
                      {t.resource_url && <a href={t.resource_url} target="_blank" rel="noreferrer" className="text-xs font-medium underline">Open project brief</a>}
                      {!blocked && !resubmitId && (
                        <Button size="sm" variant={taskId === t.id ? "default" : "outline"} onClick={() => { setTaskId(t.id); formRef.current?.scrollIntoView({ behavior: "smooth" }) }}>
                          {taskId === t.id ? "Selected" : "Submit this project"}
                        </Button>
                      )}
                      {blocked && <span className="text-xs text-muted-foreground">Already submitted for this project.</span>}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {canSubmit && (
          <div ref={formRef}><Card>
            <CardHeader>
              <CardTitle>{resubmitting ? "Resubmit Project" : "Submit a Project"}</CardTitle>
              <CardDescription>
                {resubmitting ? `Update “${resubmitting.project_title}” based on the reviewer's remarks, then upload your files again.` : "Pick your course, choose the project assigned to it, and upload your work."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <select id="course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setTaskId("") }} disabled={Boolean(resubmitId)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Project you are submitting</Label>
                  {chosen ? (
                    <div className="rounded-md border border-primary p-3 text-sm">
                      <div className="font-semibold">{chosen.title}</div>
                      <div className="text-xs text-muted-foreground">{chosen.course_name}</div>
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Pick a project from “Projects assigned to your course” above.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Notes for the reviewer (optional)</Label>
                  <Textarea id="desc" rows={4} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} placeholder="What did you build, which tools did you use, anything the reviewer should know?" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pf">Project file(s) <span className="text-red-600">*</span></Label>
                    <Input id="pf" type="file" accept={ACCEPT} multiple onChange={(e) => setProjectFiles(Array.from(e.target.files ?? []))} />
                    <p className="text-xs text-muted-foreground">Max 500 MB each, up to 10 files.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sf">Supporting files (optional)</Label>
                    <Input id="sf" type="file" accept={ACCEPT} multiple onChange={(e) => setSupportFiles(Array.from(e.target.files ?? []))} />
                    <p className="text-xs text-muted-foreground">Diagrams, datasets, screenshots…</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy || needsLogin || !chosen}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    {busy ? (progress >= 100 ? "Saving…" : `Uploading… ${progress}%`) : resubmitting ? "Resubmit for review" : "Submit for review"}
                  </Button>
                  {resubmitting && <Button type="button" variant="outline" onClick={() => setResubmitId(null)}>Cancel</Button>}
                </div>
              </form>
            </CardContent>
          </Card></div>
        )}

        {active && (
          <Alert>
            <AlertTitle>Your project is {active.status === "Under Review" ? "being reviewed" : "waiting for review"}</AlertTitle>
            <AlertDescription>You can still submit your other assigned projects.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Submission history</h2>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && projects.length === 0 && <p className="text-sm text-muted-foreground">You haven't submitted a project yet.</p>}
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.project_title}</div>
                    <div className="text-sm text-muted-foreground">{p.course_name} · {p.category} · submitted {fmtDate(p.submission_date)}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="whitespace-pre-wrap text-sm">{p.project_description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {p.files.map((f) => (
                    <a key={f.id} href={`/api/student/projects/${p.id}/files/${f.id}`} className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-muted">
                      <Paperclip className="h-3 w-3" />{f.name} <span className="text-muted-foreground">({size(f.size)})</span>
                    </a>
                  ))}
                </div>
                {p.admin_remarks && (p.status === "Rejected" || p.status === "Resubmission Required") && (
                  <Alert variant="destructive">
                    <MessageSquareWarning className="h-4 w-4" />
                    <AlertTitle>Reviewer remarks</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{p.admin_remarks}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  {(p.status === "Rejected" || p.status === "Resubmission Required") && (
                    <Button size="sm" onClick={() => startResubmit(p)}>Update &amp; resubmit</Button>
                  )}
                  {p.status === "Accepted" && p.certificate_available && (
                    <Button size="sm" asChild><Link href={`/student/certificates/${encodeURIComponent(p.certificate!.certificate_id)}`}><Award className="mr-2 h-4 w-4" />View certificate</Link></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </StudentLayout>
  )
}
