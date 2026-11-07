"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { db } from "@/lib/firebase"
import { emptyProfile, tailorResume, type JobInfo, type ResumeProfile } from "@/lib/resume-ats"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { CheckCircle2, Download, FileCheck2, Plus, Trash2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"

const LS = (id: string) => `resume_profile_${id}`

/** Lets a student build an ATS-friendly resume tailored to one job, then attach it to the application. */
export default function ResumeBuilder({ job, student, sourceFile, onUse, onClose }: { job: JobInfo; student: { id: string; name?: string; email?: string; phone?: string }; sourceFile?: File | null; onUse: (file: File) => void; onClose: () => void }) {
  const [p, setP] = useState<ResumeProfile>(() => ({ ...emptyProfile(), name: student.name ?? "", email: student.email ?? "", phone: student.phone ?? "" }))
  const [skillsText, setSkillsText] = useState("")
  const [extra, setExtra] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [reading, setReading] = useState(false)
  const [readNote, setReadNote] = useState("")

  // load the saved profile (Firestore, then this browser)
  useEffect(() => {
    let alive = true
    ;(async () => {
      let saved: Partial<ResumeProfile> | null = null
      try { const s = await getDoc(doc(db, "student_resumes", student.id)); if (s.exists()) saved = s.data() as Partial<ResumeProfile> } catch {}
      if (!saved) { try { const raw = localStorage.getItem(LS(student.id)); if (raw) saved = JSON.parse(raw) } catch {} }
      if (!alive) return
      if (saved) { const merged = { ...emptyProfile(), ...saved } as ResumeProfile; setP({ ...merged, name: merged.name || student.name || "", email: merged.email || student.email || "", phone: merged.phone || student.phone || "" }); setSkillsText((merged.skills ?? []).join(", ")) }
      setReady(true)
      if (sourceFile) readResume(sourceFile) // the student already uploaded a resume: start from it
    })()
    return () => { alive = false }
  }, [student.id, student.name, student.email, student.phone])

  /** Reads an existing resume (PDF/DOCX) and fills the form from it; the student then checks and edits. */
  const readResume = async (file: File) => {
    setReading(true); setReadNote("")
    try {
      const fd = new FormData(); fd.append("resume", file)
      const res = await fetch("/api/student/resume/parse", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || "We couldn't read that file")
      const n: ResumeProfile = d.profile
      setP((cur) => ({
        ...cur, name: n.name || cur.name, email: n.email || cur.email, phone: n.phone || cur.phone, location: n.location || cur.location, linkedin: n.linkedin || cur.linkedin, github: n.github || cur.github,
        summary: n.summary || cur.summary, education: n.education.some((e) => e.degree || e.institution) ? n.education : cur.education,
        projects: n.projects.length ? n.projects : cur.projects, experience: n.experience.length ? n.experience : cur.experience, certifications: n.certifications.length ? n.certifications : cur.certifications,
      }))
      setSkillsText((cur) => { const have = new Set(cur.split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean)); const add = n.skills.filter((s) => !have.has(s.toLowerCase())); return [cur.trim(), ...add].filter(Boolean).join(", ") })
      setReadNote(d.confidence < 0.7 ? "We read most of your resume, but some parts may be missing — please check every section below." : "We filled the form from your resume. Please check each section, then build your ATS resume.")
      toast.success("Resume read")
    } catch (e) { const m = e instanceof Error ? e.message : "We couldn't read that file"; setReadNote(m); toast.error(m) } finally { setReading(false) }
  }

  const profile = useMemo(() => ({ ...p, skills: skillsText.split(/[,\n]/).map((x) => x.trim()).filter(Boolean) }), [p, skillsText])
  const t = useMemo(() => tailorResume(profile, job, extra), [profile, job, extra])
  const set = (k: keyof ResumeProfile) => (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value })

  const save = async () => {
    const toSave = { ...profile, updatedAt: new Date().toISOString() }
    try { localStorage.setItem(LS(student.id), JSON.stringify(toSave)) } catch {}
    try { await setDoc(doc(db, "student_resumes", student.id), toSave) } catch { /* saved in this browser only */ }
  }
  const missingBasics = () => (!profile.name.trim() ? "Enter your name" : !/\S+@\S+\.\S+/.test(profile.email) ? "Enter a valid email" : profile.skills.length + extra.length === 0 ? "Add your skills" : "")
  const make = async (mode: "download" | "use") => {
    const problem = missingBasics()
    if (problem) return toast.error(problem)
    try {
      const pdf = await import("@/lib/resume-pdf")
      await save()
      if (mode === "download") pdf.downloadResume(t.resume, job.company)
      else { onUse(pdf.resumeFile(t.resume, job.company)); toast.success("Resume attached to your application"); onClose() }
    } catch { toast.error("Could not create the resume PDF") }
  }

  const scoreColor = t.ats.score >= 75 ? "text-emerald-600" : t.ats.score >= 50 ? "text-amber-600" : "text-red-600"
  const list = <K extends "education" | "projects" | "experience">(k: K) => p[k] as any[]
  const upd = (k: "education" | "projects" | "experience", i: number, patch: any) => setP({ ...p, [k]: list(k).map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const add = (k: "education" | "projects" | "experience", blank: any) => setP({ ...p, [k]: [...list(k), blank] })
  const del = (k: "education" | "projects" | "experience", i: number) => setP({ ...p, [k]: list(k).filter((_, j) => j !== i) })
  const pointsText = (pts: string[]) => pts.join("\n")
  const toPoints = (v: string) => v.split("\n")

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-4 w-full max-w-4xl rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">ATS resume for {job.title}</h2><p className="text-sm text-slate-500">{job.company} — the resume is reordered to match this job. Only skills you list or confirm are shown.</p></div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="mt-4 grid gap-4 rounded-md border p-4 sm:grid-cols-[auto_1fr]">
          <div className="text-center"><div className={`text-4xl font-bold ${scoreColor}`}>{t.ats.score}</div><div className="text-xs text-slate-500">ATS score / 100</div></div>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Matches this job:</span> {t.matched.length ? t.matched.map((k) => <span key={k} className="mr-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"><CheckCircle2 className="h-3 w-3" />{k}</span>) : <span className="text-slate-500">nothing yet — add your skills below</span>}</div>
            {t.missing.length > 0 && (
              <div><span className="font-medium">The job also asks for</span> <span className="text-xs text-slate-500">(tick only the ones you truly know):</span>
                <div className="mt-1 flex flex-wrap gap-2">{t.missing.map((k) => <label key={k} className="flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs"><input type="checkbox" checked={extra.includes(k)} onChange={(e) => setExtra(e.target.checked ? [...extra, k] : extra.filter((x) => x !== k))} />{k}</label>)}</div></div>
            )}
            {t.ats.tips.filter((x) => !x.startsWith("Skills this job asks")).map((tip) => <p key={tip} className="text-xs text-amber-700">• {tip}</p>)}
          </div>
        </div>

        {!ready ? <p className="mt-4 text-sm text-slate-500">Loading your saved details…</p> : (
          <div className="mt-4 space-y-5">
            <section className="rounded-md border border-dashed border-purple-300 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
              <label className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-purple-900 dark:text-purple-200">Already have a resume? Upload it and we'll rebuild it as an ATS resume for this job.</span>
                <span className="rounded-md bg-purple-600 px-3 py-1.5 text-white">{reading ? "Reading…" : "Upload PDF / DOCX"}</span>
                <input type="file" accept=".pdf,.docx" className="hidden" disabled={reading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) readResume(f) }} />
              </label>
              {readNote && <p className="mt-2 text-xs text-purple-900 dark:text-purple-200">{readNote}</p>}
            </section>
            <section className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Full name" value={p.name} onChange={set("name")} /><Input placeholder="Email" value={p.email} onChange={set("email")} />
              <Input placeholder="Phone" value={p.phone} onChange={set("phone")} /><Input placeholder="Location (e.g. Bengaluru, India)" value={p.location} onChange={set("location")} />
              <Input placeholder="LinkedIn URL (optional)" value={p.linkedin} onChange={set("linkedin")} /><Input placeholder="GitHub URL (optional)" value={p.github} onChange={set("github")} />
            </section>
            <section><label className="text-sm font-medium">Skills <span className="font-normal text-slate-500">(comma separated — e.g. Python, Django, SQL, Git, Linux)</span></label><Textarea value={skillsText} onChange={(e) => setSkillsText(e.target.value)} /></section>
            <section><label className="text-sm font-medium">About you <span className="font-normal text-slate-500">(optional, 1–2 lines — a line aimed at this job is added automatically)</span></label><Textarea value={p.summary} onChange={set("summary")} /></section>

            <section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Education</h3><Button size="sm" variant="outline" onClick={() => add("education", { degree: "", institution: "", year: "", score: "" })}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
              {p.education.map((e, i) => (<div key={i} className="grid gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]"><Input placeholder="Degree / course" value={e.degree} onChange={(x) => upd("education", i, { degree: x.target.value })} /><Input placeholder="College / institute" value={e.institution} onChange={(x) => upd("education", i, { institution: x.target.value })} /><Input placeholder="Year" value={e.year} onChange={(x) => upd("education", i, { year: x.target.value })} /><Input placeholder="CGPA / %" value={e.score} onChange={(x) => upd("education", i, { score: x.target.value })} /><Button variant="ghost" size="icon" onClick={() => del("education", i)}><Trash2 className="h-4 w-4" /></Button></div>))}
            </section>

            <section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Projects</h3><Button size="sm" variant="outline" onClick={() => add("projects", { name: "", tech: "", points: [""] })}><Plus className="mr-1 h-4 w-4" />Add project</Button></div>
              {p.projects.map((x, i) => (<div key={i} className="space-y-2 rounded-md border p-3"><div className="flex gap-2"><Input placeholder="Project name" value={x.name} onChange={(e) => upd("projects", i, { name: e.target.value })} /><Input placeholder="Technologies used" value={x.tech} onChange={(e) => upd("projects", i, { tech: e.target.value })} /><Button variant="ghost" size="icon" onClick={() => del("projects", i)}><Trash2 className="h-4 w-4" /></Button></div><Textarea placeholder={"What you built and the result — one point per line\n(e.g. Built a REST API with Django used by 50 students)"} value={pointsText(x.points)} onChange={(e) => upd("projects", i, { points: toPoints(e.target.value) })} /></div>))}
            </section>

            <section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Work experience / internships <span className="font-normal text-slate-500">(skip if none)</span></h3><Button size="sm" variant="outline" onClick={() => add("experience", { role: "", company: "", period: "", points: [""] })}><Plus className="mr-1 h-4 w-4" />Add</Button></div>
              {p.experience.map((x, i) => (<div key={i} className="space-y-2 rounded-md border p-3"><div className="grid gap-2 sm:grid-cols-[2fr_2fr_1.5fr_auto]"><Input placeholder="Role" value={x.role} onChange={(e) => upd("experience", i, { role: e.target.value })} /><Input placeholder="Company" value={x.company} onChange={(e) => upd("experience", i, { company: e.target.value })} /><Input placeholder="Jun 2025 – Aug 2025" value={x.period} onChange={(e) => upd("experience", i, { period: e.target.value })} /><Button variant="ghost" size="icon" onClick={() => del("experience", i)}><Trash2 className="h-4 w-4" /></Button></div><Textarea placeholder="What you did — one point per line" value={pointsText(x.points)} onChange={(e) => upd("experience", i, { points: toPoints(e.target.value) })} /></div>))}
            </section>

            <section><label className="text-sm font-medium">Certifications <span className="font-normal text-slate-500">(one per line)</span></label><Textarea value={p.certifications.join("\n")} onChange={(e) => setP({ ...p, certifications: e.target.value.split("\n") })} /></section>

            <section className="rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-800/50"><div className="mb-1 font-medium">Preview for {job.company || "this job"} (what the ATS will read)</div>
              <p className="font-semibold">{t.resume.name || "Your Name"} — {t.resume.headline}</p><p className="mt-1 text-slate-600 dark:text-slate-300">{t.resume.summary}</p><p className="mt-1"><b>Skills:</b> {t.resume.skills.join(", ") || "—"}</p>
              {t.resume.projects.length > 0 && <p className="mt-1"><b>Projects (most relevant first):</b> {t.resume.projects.map((x) => x.name).join(" · ")}</p>}</section>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => make("download")}><Download className="mr-1 h-4 w-4" />Download PDF</Button>
              <Button className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => make("use")}><FileCheck2 className="mr-1 h-4 w-4" />Use this resume for my application</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
