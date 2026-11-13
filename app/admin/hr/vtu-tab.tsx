"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ApiFailure, api } from "@/lib/certificate-client"
import { VTU_PLACEHOLDERS, fillVtuTemplate } from "@/lib/server/vtu-email"
import { parseStudentSheet, type SheetProblem, type SheetStudent } from "@/lib/vtu-sheet"
import { Download, Eye, FileSpreadsheet, Mail, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")
const sel = "h-10 rounded-md border bg-background px-3 text-sm"
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const PROGRAMS = ["Data Analytics", "Python Full Stack Development", "Java Full Stack Development", "AI & Machine Learning", "Cloud Computing (AWS)", "Microsoft Azure", "DevOps", "UI/UX Design", "Web Development", "Cyber Security"]
const blank = () => ({ candidate_name: "", candidate_email: "", usn: "", college: "", program: PROGRAMS[0], programOther: "", weeks: "15", offer_date: todayIst(), coordinator_name: "Poornima", coordinator_title: "Program Coordinator", send_email: true })
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean)

export default function VtuTab() {
  const [offers, setOffers] = useState<any[]>([])
  const [f, setF] = useState(blank())
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState("")
  const [sheet, setSheet] = useState<{ file: string; students: SheetStudent[]; problems: SheetProblem[]; picked: Set<string>; headerFound: boolean } | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; failed: { name: string; error: string }[]; emailFailed: number } | null>(null)
  const [viewing, setViewing] = useState<{ id: string; subject: string; text: string } | null>(null)

  const load = useCallback(async () => {
    try { const d = await api("/api/admin/hr/vtu"); setOffers(d.offers); return d.template as { subject: string; body: string; saved: boolean } } catch (e) { toast.error(err(e)) }
  }, [])
  useEffect(() => { load().then((t) => { if (t) { setSubject(t.subject); setBody(t.body); setSaved(t.saved) } }) }, [load])

  const set = (k: keyof ReturnType<typeof blank>) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const program = f.program === "__other" ? f.programOther.trim() : f.program
  const sample = { name: f.candidate_name || "Student name", program: program || "Program", weeks: f.weeks || "15", date: f.offer_date, id: "CI-VTU-2026-001", coordinator: f.coordinator_name || "Coordinator" }

  const create = async () => {
    if (f.candidate_name.trim().length < 2) return toast.error("Enter the student's name")
    if (!EMAIL_OK.test(f.candidate_email.trim())) { document.getElementById("vtu-email")?.focus(); return toast.error("Enter the student's email ID (for example name@gmail.com) in the email box — the letter is sent there") }
    setBusy(true)
    try {
      const d = await api("/api/admin/hr/vtu", { method: "POST", body: { ...f, program, mail_subject: subject, mail_body: body } })
      if (d.email?.skipped) toast.success(`Offer ${d.offer.vtu_id} saved (not emailed)`)
      else if (d.email?.sent) toast.success(`Offer ${d.offer.vtu_id} emailed to ${d.offer.candidate_email}`)
      else toast.warning(`Offer ${d.offer.vtu_id} saved, but the email failed: ${d.email?.error ?? "unknown error"}`, { duration: 9000 })
      setF(blank()); load()
    } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }
  const saveDraft = async () => {
    try { await api("/api/admin/hr/vtu/template", { method: "PUT", body: { subject, body } }); setSaved(true); toast.success("Saved as the default email draft") } catch (e) { toast.error(err(e)) }
  }
  const resetDraft = async () => {
    try { const d = await api("/api/admin/hr/vtu/template", { method: "PUT", body: { reset: true } }); setSubject(d.template.subject); setBody(d.template.body); setSaved(false); toast.success("Back to the built-in draft") } catch (e) { toast.error(err(e)) }
  }
  const resend = async (o: any) => {
    try { const d = await api(`/api/admin/hr/vtu/${o.id}/send`, { method: "POST" }); d.email.sent ? toast.success(`Emailed to ${o.candidate_email}`) : toast.error(d.email.error ?? "The email could not be sent"); load() } catch (e) { toast.error(err(e)) }
  }
  const view = async (o: any) => { try { const d = await api(`/api/admin/hr/vtu/${o.id}/preview`); setViewing({ id: o.id, subject: d.subject, text: d.text }) } catch (e) { toast.error(err(e)) } }
  const download = async (o: any) => {
    try {
      const res = await fetch(`/api/admin/hr/vtu/${o.id}/pdf`); if (!res.ok) throw new Error("Could not create the PDF")
      const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = url; a.download = `VTU-Internship-Offer-${o.vtu_id}.pdf`; a.click(); URL.revokeObjectURL(url)
    } catch (e) { toast.error(err(e)) }
  }
  const remove = async (o: any) => { if (!confirm(`Delete VTU offer ${o.vtu_id} for ${o.candidate_name}?`)) return; try { await api(`/api/admin/hr/vtu/${o.id}`, { method: "DELETE" }); load() } catch (e) { toast.error(err(e)) } }

  const existing = new Set(offers.filter((o) => o.program === program).map((o) => String(o.candidate_email).toLowerCase()))
  const readSheet = async (file: File) => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][]
      const r = parseStudentSheet(grid)
      if (r.students.length === 0 && r.problems.length === 0) return toast.error("That file looks empty")
      setSheet({ file: file.name, ...r, picked: new Set(r.students.filter((x) => !existing.has(x.email)).map((x) => x.email)) })
      setProgress(null)
    } catch { toast.error("Couldn't read that file. Use an .xlsx, .xls or .csv with Name and Email columns.") }
  }
  const downloadSample = async () => {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Name", "Email", "USN", "College"], ["Student One", "student.one@gmail.com", "1VE22CS001", "ABC Engineering College"], ["Student Two", "student.two@gmail.com", "1VE22CS002", "ABC Engineering College"]]), "Students")
    XLSX.writeFile(wb, "VTU-students-sample.xlsx")
  }
  const bulkCreate = async () => {
    if (!sheet) return
    if (!program) return toast.error("Choose the program above first")
    const list = sheet.students.filter((x) => sheet.picked.has(x.email))
    if (list.length === 0) return toast.error("Tick at least one student")
    if (f.send_email && !confirm(`Create ${list.length} offer letters and email each student now?`)) return
    setBusy(true); setProgress({ done: 0, total: list.length, failed: [], emailFailed: 0 })
    const failed: { name: string; error: string }[] = []; let emailFailed = 0
    for (let i = 0; i < list.length; i++) {
      const st = list[i]
      try {
        const d = await api("/api/admin/hr/vtu", { method: "POST", body: { ...f, program, candidate_name: st.name, candidate_email: st.email, usn: st.usn || f.usn, college: st.college || f.college, mail_subject: subject, mail_body: body } })
        if (f.send_email && !d.email?.sent) emailFailed++
      } catch (e) { failed.push({ name: st.name, error: err(e) }) }
      setProgress({ done: i + 1, total: list.length, failed: [...failed], emailFailed })
    }
    setBusy(false); load()
    const ok = list.length - failed.length
    if (failed.length === 0 && emailFailed === 0) toast.success(`${ok} offer letter${ok === 1 ? "" : "s"} created${f.send_email ? " and emailed" : ""}`)
    else toast.warning(`${ok} created. ${failed.length ? `${failed.length} could not be created. ` : ""}${emailFailed ? `${emailFailed} emails failed — use Send in the list below to retry.` : ""}`, { duration: 12000 })
    setSheet(null)
  }

  const shown = offers.filter((o) => { const hay = [o.vtu_id, o.candidate_name, o.candidate_email, o.usn, o.college, o.program].join(" ").toLowerCase(); return words(q).every((w) => hay.includes(w)) })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">New VTU internship offer letter</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">Student name *<Input name="vtu-student-name" autoComplete="off" placeholder="e.g. Varshitha K" value={f.candidate_name} onChange={set("candidate_name")} /></label>
            <label className="text-xs text-muted-foreground">Student email ID * <span className="text-muted-foreground/80">(the letter is sent here)</span>
              <Input id="vtu-email" name="vtu-student-email" type="email" inputMode="email" autoComplete="off" placeholder="e.g. student@gmail.com" value={f.candidate_email} onChange={set("candidate_email")} aria-invalid={f.candidate_email !== "" && !EMAIL_OK.test(f.candidate_email.trim())} />
              {f.candidate_email !== "" && !EMAIL_OK.test(f.candidate_email.trim()) && <span className="text-red-600">Enter a valid email address, like name@gmail.com</span>}
            </label>
            <label className="text-xs text-muted-foreground">USN (optional)<Input name="vtu-usn" autoComplete="off" placeholder="e.g. 1VE22CS101" value={f.usn} onChange={set("usn")} /></label>
            <label className="text-xs text-muted-foreground sm:col-span-2">College (optional)<Input name="vtu-college" autoComplete="off" placeholder="College name" value={f.college} onChange={set("college")} /></label>
            <label className="text-xs text-muted-foreground">Program
              <select className={sel + " w-full"} value={f.program} onChange={set("program")}>{PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}<option value="__other">Other (type it)…</option></select>
            </label>
            {f.program === "__other" && <Input placeholder="Program name" value={f.programOther} onChange={set("programOther")} />}
            <label className="text-xs text-muted-foreground">Duration (weeks)<Input type="number" min={1} max={52} value={f.weeks} onChange={set("weeks")} /></label>
            <label className="text-xs text-muted-foreground">Offer date<Input type="date" value={f.offer_date} onChange={set("offer_date")} /></label>
            <label className="text-xs text-muted-foreground">Coordinator name<Input value={f.coordinator_name} onChange={set("coordinator_name")} /></label>
            <label className="text-xs text-muted-foreground">Coordinator title<Input value={f.coordinator_title} onChange={set("coordinator_title")} /></label>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Email draft <span className="font-normal text-muted-foreground">{saved ? "(your saved default)" : "(built-in default)"}</span></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={saveDraft}>Save as default</Button><Button size="sm" variant="ghost" onClick={resetDraft}>Reset to built-in</Button></div>
            </div>
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Edit freely. These fill in automatically for each student: {VTU_PLACEHOLDERS.map((p) => <code key={p} className="mx-0.5 rounded bg-muted px-1">{`{${p}}`}</code>)}. The offer letter PDF is always attached.</p>
            <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Preview with the details above</summary>
              <div className="mt-2 space-y-1 rounded-md bg-muted/40 p-3"><div className="font-medium">{fillVtuTemplate(subject, sample)}</div><pre className="whitespace-pre-wrap font-sans text-sm">{fillVtuTemplate(body, sample)}</pre></div>
            </details>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.send_email} onChange={(e) => setF({ ...f, send_email: e.target.checked })} />Email the letter to the student now</label>
          <Button onClick={create} disabled={busy}>{busy ? "Creating…" : f.send_email ? "Create & email offer letter" : "Create offer letter"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Upload a sheet of students</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Upload an Excel (.xlsx, .xls) or CSV file with a <b>Name</b> and an <b>Email</b> column (USN and College are optional). Every student gets a letter using the program, weeks, date, coordinator and email draft set above.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
              <FileSpreadsheet className="h-4 w-4" />Choose Excel / CSV file
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) readSheet(file) }} />
            </label>
            <Button size="sm" variant="ghost" onClick={downloadSample}><Download className="mr-1 h-4 w-4" />Sample sheet</Button>
          </div>
          {sheet && (
            <div className="space-y-3">
              <div className="text-sm"><b>{sheet.file}</b>: {sheet.students.length} student{sheet.students.length === 1 ? "" : "s"} found{sheet.problems.length ? `, ${sheet.problems.length} row${sheet.problems.length === 1 ? "" : "s"} skipped` : ""}.{!sheet.headerFound && " (No Name/Email headings found — guessed the columns, please check.)"}</div>
              {sheet.students.length > 0 && (
                <div className="max-h-72 overflow-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted"><tr><th className="px-3 py-2"><input type="checkbox" aria-label="Select all" checked={sheet.students.every((x) => sheet.picked.has(x.email))} onChange={(e) => setSheet({ ...sheet, picked: new Set(e.target.checked ? sheet.students.map((x) => x.email) : []) })} /></th>{["Name", "Email", "USN", "College", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                    <tbody>{sheet.students.map((x) => (
                      <tr key={x.email} className="border-t">
                        <td className="px-3 py-1.5"><input type="checkbox" aria-label={`Select ${x.name}`} checked={sheet.picked.has(x.email)} onChange={() => { const n = new Set(sheet.picked); n.has(x.email) ? n.delete(x.email) : n.add(x.email); setSheet({ ...sheet, picked: n }) }} /></td>
                        <td className="px-3 py-1.5">{x.name}</td><td className="px-3 py-1.5">{x.email}</td><td className="px-3 py-1.5">{x.usn}</td><td className="px-3 py-1.5">{x.college}</td>
                        <td className="px-3 py-1.5 text-xs text-amber-600">{existing.has(x.email) ? `Already has a ${program} offer` : ""}</td>
                      </tr>))}
                    </tbody>
                  </table>
                </div>
              )}
              {sheet.problems.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-amber-600">{sheet.problems.length} skipped row{sheet.problems.length === 1 ? "" : "s"}</summary><ul className="mt-1 list-disc pl-5 text-muted-foreground">{sheet.problems.map((p) => <li key={p.row}>Row {p.row}: {p.reason}{p.text ? ` (${p.text})` : ""}</li>)}</ul></details>}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={bulkCreate} disabled={busy || sheet.picked.size === 0}>{busy ? "Working…" : `${f.send_email ? "Create & email" : "Create"} ${sheet.picked.size} offer letter${sheet.picked.size === 1 ? "" : "s"}`}</Button>
                <Button variant="ghost" onClick={() => setSheet(null)} disabled={busy}>Cancel</Button>
                <span className="text-xs text-muted-foreground">Program: {program || "— choose above"} · {f.weeks} weeks · {f.send_email ? "emails are sent now" : "not emailed"}</span>
              </div>
            </div>
          )}
          {progress && (
            <div className="space-y-1 text-sm">
              <div className="h-2 w-full overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
              <div>{progress.done} of {progress.total} done{progress.failed.length ? ` · ${progress.failed.length} failed` : ""}{progress.emailFailed ? ` · ${progress.emailFailed} emails not sent` : ""}</div>
              {progress.failed.map((x, i) => <div key={i} className="text-xs text-red-600">{x.name}: {x.error}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Input className="w-80" placeholder="Search by ID, name, email, USN, program…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <span className="text-xs text-muted-foreground">{shown.length} of {offers.length}</span>}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50"><tr>{["ID", "Student", "Program", "Weeks", "Date", "Email", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">{q ? `No offers match "${q}".` : "No VTU offers yet."}</td></tr>}
            {shown.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{o.vtu_id}</td>
                <td className="px-3 py-2"><div>{o.candidate_name}</div><div className="text-xs text-muted-foreground">{[o.usn, o.candidate_email].filter(Boolean).join(" · ")}</div></td>
                <td className="px-3 py-2">{o.program}</td>
                <td className="px-3 py-2">{o.weeks}</td>
                <td className="px-3 py-2 whitespace-nowrap">{o.offer_date}</td>
                <td className="px-3 py-2 text-xs">{o.email_status === "sent" ? <span className="text-green-600">Sent</span> : o.email_status === "failed" ? <span className="text-red-600" title={o.email_error}>Failed</span> : <span className="text-muted-foreground">Not sent</span>}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  <Button size="sm" variant="outline" onClick={() => download(o)}><Download className="mr-1 h-4 w-4" />PDF</Button>{" "}
                  <Button size="sm" variant="outline" onClick={() => view(o)}><Eye className="mr-1 h-4 w-4" />Email</Button>{" "}
                  <Button size="sm" variant="outline" onClick={() => resend(o)}><Mail className="mr-1 h-4 w-4" />{o.email_status === "sent" ? "Resend" : "Send"}</Button>{" "}
                  <Button size="icon" variant="ghost" onClick={() => remove(o)} aria-label={`Delete ${o.vtu_id}`}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewing && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Email sent to this student</CardTitle><Button size="sm" variant="ghost" onClick={() => setViewing(null)}>Close</Button></CardHeader>
          <CardContent className="space-y-1"><div className="font-medium">{viewing.subject}</div><pre className="whitespace-pre-wrap font-sans text-sm">{viewing.text}</pre></CardContent>
        </Card>
      )}
    </div>
  )
}
