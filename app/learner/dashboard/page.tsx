"use client"

import BuyButton from "@/components/learner/buy-button"
import LearnerShell, { type Activity } from "@/components/learner/learner-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { rupees } from "@/lib/learner-client"
import { ChevronLeft, ChevronRight, Flame, PlayCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
const pad = (n: number) => String(n).padStart(2, "0")

function Calendar({ activity }: { activity?: Activity }) {
  const now = new Date()
  const [m, setM] = useState({ y: now.getFullYear(), mo: now.getMonth() })
  const days = new Set(activity?.days ?? [])
  const first = (new Date(m.y, m.mo, 1).getDay() + 6) % 7 // Monday first
  const count = new Date(m.y, m.mo + 1, 0).getDate()
  const cells = [...Array(first).fill(0), ...Array.from({ length: count }, (_, i) => i + 1)]
  const key = (d: number) => `${m.y}-${pad(m.mo + 1)}-${pad(d)}`
  const move = (by: number) => setM((x) => { const d = new Date(x.y, x.mo + by, 1); return { y: d.getFullYear(), mo: d.getMonth() } })
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => move(-1)} aria-label="Previous month" className="rounded p-1 text-purple-700 hover:bg-purple-50"><ChevronLeft className="h-5 w-5" /></button>
        <div className="text-lg font-medium">{new Date(m.y, m.mo, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
        <button onClick={() => move(1)} aria-label="Next month" className="rounded p-1 text-purple-700 hover:bg-purple-50"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="py-1 font-medium text-slate-400">{d}</div>)}
        {cells.map((d, i) => d === 0 ? <div key={i} /> : (
          <div key={i} className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${days.has(key(d)) ? "bg-emerald-500 font-semibold text-white" : "bg-purple-50 text-slate-600"} ${key(d) === activity?.today ? "ring-2 ring-amber-500" : ""}`}>{d}</div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Days you studied</p>
    </div>
  )
}

export default function LearnerDashboard() {
  const [catalog, setCatalog] = useState<any[]>([])
  const [q, setQ] = useState("")
  useEffect(() => { fetch("/api/catalog").then((r) => r.json()).then((d) => setCatalog(d.courses || [])).catch(() => {}) }, [])

  return (
    <LearnerShell wide>
      {({ learner, enrollments, activity }) => {
        const owned = new Set(enrollments.map((e) => e.course_id))
        const more = catalog.filter((c) => !owned.has(c.id))
        const shown = enrollments.filter((e) => !q || e.title.toLowerCase().includes(q.toLowerCase()))
        return (
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Welcome, {learner.name.split(" ")[0]}</h1>
                <p className="text-muted-foreground">Pick up where you left off.</p>
              </div>

              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">Enrolled Courses</h2>
                  <Input placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
                </div>
                {enrollments.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">You have not bought a course yet. Pick one below to get started.</p>}
                {enrollments.length > 0 && shown.length === 0 && <p className="text-sm text-muted-foreground">No course matches your search.</p>}
                <div className="grid gap-4 md:grid-cols-2">
                  {shown.map((e) => {
                    const p = e.progress ?? { status: "Not started", percent: 0 }
                    return (
                      <div key={e.course_id} className="rounded-2xl border p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xl font-bold text-white">{e.title.charAt(0)}</div>
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold">{e.title}</div>
                            <div className="text-xs text-muted-foreground">{e.duration} · {e.level}</div>
                          </div>
                        </div>
                        <div className="mt-4 text-sm">Enrolled on {fmtDate(e.enrolled_at)}</div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${p.percent}%` }} /></div>
                          <span className="text-sm font-semibold text-emerald-600">{p.percent}%</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Course Progress</span>
                          <span className={`rounded-full px-2 py-0.5 font-medium ${p.status === "Completed" ? "bg-emerald-100 text-emerald-800" : p.status === "In progress" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>{p.status}</span>
                        </div>
                        <Link href={`/learner/courses/${e.course_id}`}>
                          <Button className="mt-4 h-12 w-full gap-2 bg-gradient-to-r from-purple-700 to-fuchsia-700 text-base hover:opacity-90">
                            {p.status === "In progress" ? "Continue Learning" : p.status === "Completed" ? "Review Course" : "Start Learning"}<PlayCircle className="h-5 w-5" />
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </section>

              {more.length > 0 && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-6 w-6 text-purple-700" />Recommended for You</h2>
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {more.map((c) => (
                      <div key={c.id} className="flex flex-col rounded-2xl border bg-white p-4">
                        <div className="font-semibold">{c.title}</div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                        <div className="mt-2 text-xs text-muted-foreground">{c.duration} · {c.level}</div>
                        <div className="mt-auto flex gap-2 pt-4">
                          <BuyButton courseId={c.id} className="flex-1 bg-purple-700 text-white hover:bg-purple-800" label={`Buy now · ${rupees(c.price)}`} />
                          <Link href={`/courses/${c.id}`}><Button variant="outline">Details</Button></Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center gap-1 text-sm"><Flame className="h-5 w-5 text-orange-500" />Learning Streak!</div>
                  <div className="mt-1 text-2xl font-bold">{activity?.current_streak ?? 0} <span className="text-base">{(activity?.current_streak ?? 0) === 1 ? "Day" : "Days"}</span></div>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-sm">Longest Streak!</div>
                  <div className="mt-1 text-2xl font-bold">{activity?.longest_streak ?? 0} <span className="text-base">{(activity?.longest_streak ?? 0) === 1 ? "Day" : "Days"}</span></div>
                </div>
              </div>
              <Calendar activity={activity} />
            </aside>
          </div>
        )
      }}
    </LearnerShell>
  )
}
