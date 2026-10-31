"use client"

import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { landingFor, WHO_CAN_LEARN } from "@/lib/course-landing-data"

/** Career options, salary growth, who can learn, key facts and syllabus/projects tabs for a course detail page. */
export default function CourseLanding({ course }: { course: any }) {
  const data = landingFor(course.category)
  const [open, setOpen] = useState(0)
  const [tab, setTab] = useState<"syllabus" | "projects">("syllabus")
  const [openModule, setOpenModule] = useState<number | null>(0)
  const role = data.roles[open]
  const lessons = course.curriculum.reduce((n: number, m: any) => n + (m.lessons || 0), 0)

  const facts = [
    [course.duration, "Course Duration"],
    ["Simple English", "Course language"],
    ["IT & Non IT", "Anyone can learn"],
    ["Self Paced", "Recorded Lectures"],
    [course.level, "With Projects"],
    ["Lifetime", "Course Access"],
  ]

  return (
    <div>
      {/* Career options */}
      <section className="bg-emerald-50/60 py-12 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold">{data.headline}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {data.roles.map((r, i) => (
                <button key={r.title} onClick={() => setOpen(i)} className={`flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-sm shadow-sm dark:bg-slate-800 ${open === i ? "border-emerald-600 ring-1 ring-emerald-600" : ""}`}>
                  <span><span className="mr-3 text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><span className="font-medium">{r.title}</span></span>
                  <span className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">{r.salary}<ChevronDown className={`h-4 w-4 transition-transform ${open === i ? "rotate-180" : ""}`} /></span>
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-700 to-teal-900 p-6 text-white">
              <h3 className="text-xl font-bold">{role.title}</h3>
              <div className="my-1 text-3xl font-extrabold">{role.salary}</div>
              <p className="mt-3 text-sm text-emerald-50">{role.blurb}</p>
              <div className="mt-5 text-xs uppercase tracking-wider text-emerald-200">Core skills</div>
              <div className="mt-2 flex flex-wrap gap-2">{role.skills.map((s) => <span key={s} className="rounded-full bg-white/15 px-3 py-1 text-xs">{s}</span>)}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Indicative salary ranges. Actual pay varies with skills, experience, company and location.</p>
        </div>
      </section>

      {/* Growth */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-2xl font-bold">How does your career grow with {course.title}?</h2>
          <div className="flex items-end gap-3 sm:gap-5" style={{ height: 260 }}>
            {data.stages.map((s, i) => (
              <div key={s.stage} className="flex flex-1 flex-col items-center justify-end">
                <div className="mb-1 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 sm:text-sm">{s.salary}</div>
                <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400" style={{ height: `${s.height * 2}px`, opacity: 0.55 + i * 0.11 }} />
                <div className="mt-2 h-px w-full bg-border" />
                <div className="mt-2 text-center text-[10px] uppercase text-muted-foreground">{s.stage}</div>
                <div className="text-center text-xs font-medium sm:text-sm">{s.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who can learn */}
      <section className="bg-emerald-950 py-12 text-white">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-center text-2xl font-bold">Who can learn {course.title}?</h2>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
            {WHO_CAN_LEARN.map((w) => <div key={w} className="rounded-lg bg-white/10 px-4 py-5 text-center text-sm font-medium">{w}</div>)}
          </div>
        </div>
      </section>

      {/* Facts + syllabus */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="mx-auto mb-3 max-w-xl text-center text-3xl font-bold">Here's everything you need to learn to get started</h2>
          {course.fullDescription && <p className="mx-auto mb-8 max-w-3xl text-center text-sm text-muted-foreground">{course.fullDescription}</p>}
          <div className="mx-auto mb-8 grid max-w-4xl grid-cols-2 divide-x rounded-lg border sm:grid-cols-3 lg:grid-cols-6">
            {facts.map(([a, b]) => <div key={b} className="p-3 text-center"><div className="text-sm font-bold">{a}</div><div className="text-xs text-muted-foreground">{b}</div></div>)}
          </div>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border">
            <div className="grid grid-cols-2 text-center text-sm font-medium">
              <button onClick={() => setTab("syllabus")} className={`py-3 ${tab === "syllabus" ? "bg-white text-emerald-800 dark:bg-slate-900" : "bg-emerald-700 text-white"}`}>View Syllabus</button>
              <button onClick={() => setTab("projects")} className={`py-3 ${tab === "projects" ? "bg-white text-emerald-800 dark:bg-slate-900" : "bg-emerald-700 text-white"}`}>View Projects ({data.projects.length})</button>
            </div>
            {tab === "syllabus" && course.curriculum.map((m: any, i: number) => (
              <div key={i} className="border-t">
                <button onClick={() => setOpenModule(openModule === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <span><span className="block text-sm font-semibold">{i + 1}. {m.module}</span><span className="text-xs text-muted-foreground">{m.lessons} lessons · {m.duration}</span></span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openModule === i ? "rotate-180" : ""}`} />
                </button>
                {openModule === i && <div className="flex flex-wrap gap-2 px-4 pb-4">{m.topics.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>}
              </div>
            ))}
            {tab === "projects" && data.projects.map((p, i) => <div key={p} className="border-t px-4 py-3 text-sm"><span className="mr-2 font-semibold text-emerald-700">{i + 1}.</span>{p}</div>)}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{lessons} lessons across {course.curriculum.length} modules</p>
        </div>
      </section>
    </div>
  )
}
