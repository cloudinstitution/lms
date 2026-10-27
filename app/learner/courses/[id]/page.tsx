"use client"

import { driveEmbedUrl, youtubeEmbedUrl } from "@/lib/video-embed"
import LearnerShell from "@/components/learner/learner-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { learnerApi } from "@/lib/learner-client"
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Circle, ClipboardList, PlayCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type Video = { id: string; title: string; link: string; serialNo: number; section?: string; sourceType: "youtube" | "gdrive" }
type QuizInfo = { id: string; title: string; after_lesson: number; pass_mark: number; question_count: number; best: number | null; passed: boolean }
type Progress = { status: string; percent: number; lessons_done: number; lessons_total: number; quizzes_passed: number; quizzes_total: number }
type Item = { kind: "lesson"; video: Video; n: number } | { kind: "quiz"; quiz: QuizInfo }

const embedUrl = (v: Video): string | null => {
  return youtubeEmbedUrl(v.link) ?? driveEmbedUrl(v.link)
}

// Topic of a lesson: an explicit section set by the admin, else guessed from the title (Java, HTML, CSS, ...).
const TOPICS: [string, RegExp][] = [["Java", /\bjava\b/i], ["HTML", /\bhtml5?\b/i], ["CSS", /\bcss3?\b/i], ["JavaScript", /\b(javascript|js|es6)\b/i], ["React", /\breact/i], ["Node.js", /\bnode/i], ["SQL & Databases", /\b(sql|mysql|mongo\w*|database)\b/i], ["Spring", /\bspring/i], ["Git", /\bgit(hub)?\b/i]]
const topicOf = (v: Video) => v.section || TOPICS.find(([, re]) => re.test(v.title))?.[0] || "Other"

const STATUS_STYLE: Record<string, string> = {
  "Not started": "bg-gray-100 text-gray-700",
  "In progress": "bg-amber-100 text-amber-800",
  Completed: "bg-emerald-100 text-emerald-800",
}
const StatusPill = ({ status }: { status: string }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE["Not started"]}`}>{status}</span>

function QuizView({ quiz, onDone }: { quiz: QuizInfo; onDone: (p: Progress) => void }) {
  const [data, setData] = useState<{ title: string; pass_mark: number; questions: { question: string; options: string[] }[] } | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setResult(null)
    learnerApi(`/api/learner/quizzes/${quiz.id}`).then((d) => { setData(d.quiz); setAnswers(d.quiz.questions.map(() => -1)) }).catch((e) => toast.error(e?.message || "Could not load the quiz"))
  }, [quiz.id])

  const submit = async () => {
    setBusy(true)
    try {
      const r = await learnerApi(`/api/learner/quizzes/${quiz.id}`, { body: { answers } })
      setResult(r); onDone(r.progress)
    } catch (e: any) { toast.error(e?.message || "Could not submit the quiz") }
    setBusy(false)
  }

  if (!data) return <p className="text-sm text-muted-foreground">Loading quiz…</p>
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{data.title}</h2>
        <p className="text-sm text-muted-foreground">Score {data.pass_mark}% or more to pass. You can retake it any time.</p>
      </div>
      {result && (
        <div className={`rounded-md border p-3 text-sm ${result.passed ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>
          {result.passed ? "Passed" : "Not passed yet"} — you scored {result.score} of {result.total} ({result.percent}%).
        </div>
      )}
      {data.questions.map((q, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 pt-6">
            <div className="font-medium">{i + 1}. {q.question}</div>
            {q.options.map((o, j) => {
              const rv = result?.review?.[i]
              const mark = rv ? (j === rv.correct_index ? "border-emerald-500 bg-emerald-50" : j === rv.your_index ? "border-red-400 bg-red-50" : "") : answers[i] === j ? "border-primary bg-primary/5" : ""
              return (
                <label key={j} className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm ${mark}`}>
                  <input type="radio" name={`q${i}`} disabled={Boolean(result)} checked={answers[i] === j} onChange={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))} />
                  {o}
                  {rv && j === rv.correct_index && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />}
                  {rv && j === rv.your_index && j !== rv.correct_index && <XCircle className="ml-auto h-4 w-4 text-red-500" />}
                </label>
              )
            })}
          </CardContent>
        </Card>
      ))}
      {result ? (
        <Button variant="outline" onClick={() => { setResult(null); setAnswers(data.questions.map(() => -1)) }}>Retake quiz</Button>
      ) : (
        <Button onClick={submit} disabled={busy || answers.some((a) => a < 0)} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Checking…" : "Submit answers"}</Button>
      )}
    </div>
  )
}

function Player({ id, title }: { id: string; title: string }) {
  const [state, setState] = useState<{ videos: Video[]; quizzes: QuizInfo[]; completed: string[]; progress: Progress } | null>(null)
  const [error, setError] = useState("")
  const [currentKey, setCurrentKey] = useState<string | null>(null)

  const load = useCallback(() => learnerApi(`/api/learner/courses/${id}/progress`).then(setState).catch((e) => setError(e?.message || "Could not load the course")), [id])
  useEffect(() => { load() }, [load])

  // lessons in order, each quiz right after the lesson it belongs to (quizzes past the last lesson go at the end)
  const items: Item[] = useMemo(() => {
    if (!state) return []
    const out: Item[] = []
    state.videos.forEach((v, i) => {
      out.push({ kind: "lesson", video: v, n: i + 1 })
      state.quizzes.filter((q) => q.after_lesson === i + 1).forEach((quiz) => out.push({ kind: "quiz", quiz }))
    })
    state.quizzes.filter((q) => q.after_lesson > state.videos.length).forEach((quiz) => out.push({ kind: "quiz", quiz }))
    return out
  }, [state])

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  // a quiz belongs to the topic of the lesson before it
  const groups = useMemo(() => {
    const out: { name: string; items: Item[] }[] = []
    let name = "Other"
    for (const it of items) {
      if (it.kind === "lesson") name = topicOf(it.video)
      let g = out.find((x) => x.name === name)
      if (!g) out.push((g = { name, items: [] }))
      g.items.push(it)
    }
    return out
  }, [items])
  const keyOf = (it: Item) => (it.kind === "lesson" ? `l:${it.video.id}` : `q:${it.quiz.id}`)
  useEffect(() => {
    if (state && !currentKey && items.length) {
      const firstOpen = items.find((it) => (it.kind === "lesson" ? !state.completed.includes(it.video.id) : !it.quiz.passed)) ?? items[0]
      setCurrentKey(keyOf(firstOpen))
    }
  }, [state, items, currentKey])

  const idx = items.findIndex((it) => keyOf(it) === currentKey)
  const current = idx >= 0 ? items[idx] : null
  const next = idx >= 0 ? items[idx + 1] : undefined

  const mark = async (lessonId: string, done: boolean, goNext: boolean) => {
    try {
      await learnerApi(`/api/learner/courses/${id}/progress`, { body: { lesson_id: lessonId, done } })
      await load()
      if (goNext && next) setCurrentKey(keyOf(next))
    } catch (e: any) { toast.error(e?.message || "Could not save your progress") }
  }

  const statusOf = (it: Item) => (!state ? false : it.kind === "lesson" ? state.completed.includes(it.video.id) : it.quiz.passed)
  const p = state?.progress

  return (
    <div className="space-y-4">
      <Link href="/learner/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ArrowLeft className="h-4 w-4" />My courses</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {p && <StatusPill status={p.status} />}
      </div>
      {p && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${p.percent}%` }} /></div>
          <p className="text-xs text-muted-foreground">{p.percent}% · {p.lessons_done}/{p.lessons_total} lessons{p.quizzes_total ? ` · ${p.quizzes_passed}/${p.quizzes_total} quizzes passed` : ""}</p>
        </div>
      )}
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {state && items.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Lessons for this course will appear here soon.</CardContent></Card>}
      {state && items.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {current?.kind === "lesson" && (
              <>
                <div className="aspect-video overflow-hidden rounded-lg border bg-black">
                  {embedUrl(current.video) ? <iframe key={current.video.id} src={embedUrl(current.video)!} title={current.video.title} className="h-full w-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen /> : <div className="flex h-full items-center justify-center text-sm text-white">This lesson cannot be played here.</div>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{current.n}. {current.video.title}</p>
                  <div className="flex gap-2">
                    {statusOf(current) ? (
                      <Button variant="outline" size="sm" onClick={() => mark(current.video.id, false, false)}>Mark as not done</Button>
                    ) : null}
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => mark(current.video.id, true, true)}>{statusOf(current) ? (next ? "Next" : "Done") : next ? "Mark complete & continue" : "Mark complete"}</Button>
                  </div>
                </div>
              </>
            )}
            {current?.kind === "quiz" && (
              <>
                <QuizView key={current.quiz.id} quiz={current.quiz} onDone={() => load()} />
                {next && <Button variant="outline" onClick={() => setCurrentKey(keyOf(next))}>Continue to next</Button>}
              </>
            )}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Course content</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {groups.map((g) => {
                const open = openGroups[g.name] ?? g.items.some((it) => keyOf(it) === currentKey)
                const done = g.items.filter(statusOf).length
                return (
                  <div key={g.name} className="rounded-md border">
                    <button onClick={() => setOpenGroups({ ...openGroups, [g.name]: !open })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-muted">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="flex-1">{g.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{done}/{g.items.length}</span>
                    </button>
                    {open && (
                      <div className="space-y-1 border-t p-1">
                        {g.items.map((it) => {
                          const d = statusOf(it)
                          const active = keyOf(it) === currentKey
                          return (
                            <button key={keyOf(it)} onClick={() => setCurrentKey(keyOf(it))} className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${active ? "bg-muted font-medium" : ""}`}>
                              {d ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : it.kind === "quiz" ? <ClipboardList className="h-4 w-4 shrink-0 text-amber-600" /> : active ? <PlayCircle className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-gray-400" />}
                              <span className="flex-1">{it.kind === "lesson" ? `${it.n}. ${it.video.title}` : `Quiz: ${it.quiz.title}`}</span>
                              {it.kind === "quiz" && it.quiz.best !== null && <span className="text-xs text-muted-foreground">{it.quiz.best}%</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function LearnerCoursePage() {
  const { id } = useParams() as { id: string }
  return (
    <LearnerShell>
      {({ enrollments }) => {
        const e = enrollments.find((x) => String(x.course_id) === id)
        return e ? <Player id={id} title={e.title} /> : (
          <div className="space-y-3">
            <p>You have not bought this course yet.</p>
            <Link href={`/courses/${id}`} className="text-emerald-600 underline">View course details</Link>
          </div>
        )
      }}
    </LearnerShell>
  )
}
