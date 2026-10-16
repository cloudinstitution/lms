"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ApiFailure, api } from "@/lib/certificate-client"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

type Q = { question: string; options: string[]; answer: number }
const blank = (): Q => ({ question: "", options: ["", "", "", ""], answer: 0 })
const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")

export default function CourseQuizzesPage() {
  const [courses, setCourses] = useState<{ id: number; title: string }[]>([])
  const [courseId, setCourseId] = useState("")
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [after, setAfter] = useState("1")
  const [pass, setPass] = useState("60")
  const [qs, setQs] = useState<Q[]>([blank()])
  const [busy, setBusy] = useState(false)

  useEffect(() => { api("/api/catalog").then((d) => { setCourses(d.courses); if (d.courses[0]) setCourseId(String(d.courses[0].id)) }).catch((e) => toast.error(err(e))) }, [])
  const load = () => courseId && api(`/api/admin/course-quizzes?course_id=${courseId}`).then((d) => setQuizzes(d.quizzes)).catch((e) => toast.error(err(e)))
  useEffect(() => { load() }, [courseId])

  const setQ = (i: number, patch: Partial<Q>) => setQs(qs.map((q, k) => (k === i ? { ...q, ...patch } : q)))
  const setOpt = (i: number, j: number, v: string) => setQ(i, { options: qs[i].options.map((o, k) => (k === j ? v : o)) })

  const save = async () => {
    setBusy(true)
    try {
      await api("/api/admin/course-quizzes", { method: "POST", body: { course_id: Number(courseId), title, after_lesson: Number(after), pass_mark: Number(pass), questions: qs.map((q) => {
        // keep the correct answer pointing at the same option after blank options are dropped
        const kept = q.options.map((o, idx) => ({ o: o.trim(), idx })).filter((x) => x.o)
        return { question: q.question, options: kept.map((x) => x.o), answer: kept.findIndex((x) => x.idx === q.answer) }
      }) } })
      toast.success("Quiz added")
      setTitle(""); setQs([blank()]); load()
    } catch (e) { toast.error(err(e)) }
    setBusy(false)
  }
  const remove = async (id: string) => {
    if (!confirm("Delete this quiz? Learners' scores for it stop counting.")) return
    try { await api(`/api/admin/course-quizzes/${id}`, { method: "DELETE" }); toast.success("Quiz deleted"); load() } catch (e) { toast.error(err(e)) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Course quizzes</h1>
        <p className="text-sm text-muted-foreground">Quizzes appear between lessons for learners who bought the course. Learners must pass them to reach "Completed".</p>
      </div>
      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>

      <Card>
        <CardHeader><CardTitle className="text-base">Existing quizzes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {quizzes.length === 0 && <p className="text-sm text-muted-foreground">No quizzes for this course yet.</p>}
          {quizzes.map((z) => (
            <div key={z.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span><b>{z.title}</b> — after lesson {z.after_lesson} · {z.questions.length} questions · pass {z.pass_mark}%</span>
              <Button variant="ghost" size="icon" onClick={() => remove(z.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Add a quiz</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input type="number" min={1} placeholder="Show after lesson #" value={after} onChange={(e) => setAfter(e.target.value)} />
            <Input type="number" min={1} max={100} placeholder="Pass mark %" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          {qs.map((q, i) => (
            <div key={i} className="space-y-2 rounded-md border p-3">
              <div className="flex gap-2">
                <Input placeholder={`Question ${i + 1}`} value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} />
                {qs.length > 1 && <Button variant="ghost" size="icon" onClick={() => setQs(qs.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>}
              </div>
              {q.options.map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input type="radio" name={`ans${i}`} checked={q.answer === j} onChange={() => setQ(i, { answer: j })} title="Correct answer" />
                  <Input placeholder={`Option ${j + 1}${q.answer === j ? " (correct)" : ""}`} value={o} onChange={(e) => setOpt(i, j, e.target.value)} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Select the radio button next to the correct option. Leave unused options blank.</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQs([...qs, blank()])}><Plus className="mr-1 h-4 w-4" />Add question</Button>
            <Button onClick={save} disabled={busy || !courseId} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Saving…" : "Save quiz"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
