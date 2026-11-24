"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ApiFailure, api } from "@/lib/certificate-client"
import { MOU_PLACEHOLDERS, fillMouTemplate } from "@/lib/server/mou-email"
import { MOU_ISSUERS, issuerById } from "@/lib/mou-issuers"
import { parseCompanySheet, type MouSheetProblem, type SheetCompany } from "@/lib/mou-sheet"
import { Download, Eye, FileSpreadsheet, Mail, PenLine, Trash2, Upload } from "lucide-react"
import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean)
const blank = () => ({ company: "", address: "", name: "", designation: "", email: "", phone: "", business: "", mou_date: todayIst(), send_email: true })
const key = (c: SheetCompany) => `${c.company.toLowerCase()}|${c.email}`

export default function MouTab() {
  const [mous, setMous] = useState<any[]>([])
  const [issuer, setIssuer] = useState<string>(MOU_ISSUERS[0].id)
  const I = issuerById(issuer)
  const [signer, setSigner] = useState({ name: "", title: "", digital: true, hasSig: false })
  const [f, setF] = useState(blank())
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [saved, setSaved] = useState(false)
  const [tpl, setTpl] = useState<{ custom: boolean; name: string; updated_at: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState("")
  const [viewing, setViewing] = useState<{ subject: string; text: string } | null>(null)
  const [sheet, setSheet] = useState<{ file: string; companies: SheetCompany[]; problems: MouSheetProblem[]; picked: Set<string>; headerFound: boolean; found: string[] } | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; failed: { name: string; error: string }[]; emailFailed: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadList = useCallback(async () => { try { setMous((await api("/api/admin/hr/mou")).mous) } catch (e) { toast.error(err(e)) } }, [])
  const apply = (d: any) => {
    setTpl(d.template); setSubject(d.draft.subject); setBody(d.draft.body); setSaved(d.draft.saved)
    setSigner({ name: d.settings.signer_name, title: d.settings.signer_title, digital: d.settings.digital, hasSig: d.settings.has_signature })
  }
  const loadIssuer = useCallback(async (id: string) => { try { apply(await api(`/api/admin/hr/mou/issuer?issuer=${id}`)) } catch (e) { toast.error(err(e)) } }, [])
  const load = useCallback(async () => { await Promise.all([loadList(), loadIssuer(issuer)]) }, [loadList, loadIssuer, issuer])
  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { loadIssuer(issuer) }, [loadIssuer, issuer])

  const saveSigner = async (extra: Record<string, unknown> = {}) => {
    try {
      apply(await api("/api/admin/hr/mou/issuer", { method: "PUT", body: { issuer, signer_name: signer.name, signer_title: signer.title, digital: signer.digital, ...extra } }))
      toast.success(`Saved — new ${I.name} MOUs are signed by ${signer.name}`)
    } catch (e) { toast.error(err(e)) }
  }
  const sigRef = useRef<HTMLInputElement>(null)
  const uploadSignature = async (file: File) => {
    const buf = new Uint8Array(await file.arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    await saveSigner({ signature: btoa(bin) })
  }

  const set = (k: keyof ReturnType<typeof blank>) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const sample = { company: f.company || "Company name", name: f.name || "Sir/Madam", designation: f.designation || "Authorised Signatory", address: f.address, date: f.mou_date, id: "CI-MOU-2026-001", org: I.name, signer: signer.name, signer_title: signer.title }

  const create = async () => {
    if (f.company.trim().length < 2) return toast.error("Enter the company name")
    if (f.email.trim() && !EMAIL_OK.test(f.email.trim())) return toast.error("That email address isn't valid")
    setBusy(true)
    try {
      const d = await api("/api/admin/hr/mou", { method: "POST", body: { ...f, issuer_id: issuer, signer_name: signer.name, signer_title: signer.title, digital_signature: signer.digital, mail_subject: subject, mail_body: body } })
      if (d.email?.sent) toast.success(`MOU ${d.mou.mou_id} emailed to ${d.mou.email}`)
      else if (d.email?.skipped) toast.success(`MOU ${d.mou.mou_id} saved (${d.email.reason === "no email address" ? "no email address, so not emailed" : "not emailed"}). Use the Word button to download it.`)
      else toast.warning(`MOU ${d.mou.mou_id} saved, but the email failed: ${d.email?.error ?? "unknown error"}`, { duration: 9000 })
      setF(blank()); loadList()
    } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }
  const saveDraft = async () => { try { await api("/api/admin/hr/mou/draft", { method: "PUT", body: { issuer, subject, body } }); setSaved(true); toast.success("Saved as the default email draft") } catch (e) { toast.error(err(e)) } }
  const resetDraft = async () => { try { const d = await api("/api/admin/hr/mou/draft", { method: "PUT", body: { issuer, reset: true } }); setSubject(d.draft.subject); setBody(d.draft.body); setSaved(false); toast.success("Back to the built-in draft") } catch (e) { toast.error(err(e)) } }

  // template (Word file)
  const downloadBlob = async (url: string, name: string) => {
    const res = await fetch(url); if (!res.ok) throw new Error("Could not create the file")
    const u = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u)
  }
  const uploadTemplate = async (file: File) => {
    try {
      const buf = new Uint8Array(await file.arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      await api("/api/admin/hr/mou/template", { method: "PUT", body: { issuer, filename: file.name, data: btoa(bin) } }); toast.success("MOU template replaced — new MOUs use it from now on"); load()
    } catch (e) { toast.error(err(e)) }
  }
  const resetTemplate = async () => { if (!confirm("Go back to the built-in MOU template?")) return; try { await api(`/api/admin/hr/mou/template?issuer=${issuer}`, { method: "DELETE" }); toast.success("Using the built-in template"); load() } catch (e) { toast.error(err(e)) } }

  // list actions
  const resend = async (m: any) => { try { const d = await api(`/api/admin/hr/mou/${m.id}/send`, { method: "POST" }); d.email.sent ? toast.success(`Emailed to ${m.email}`) : toast.error(d.email.error ?? "The email could not be sent"); loadList() } catch (e) { toast.error(err(e)) } }
  const view = async (m: any) => { try { setViewing(await api(`/api/admin/hr/mou/${m.id}/preview`)) } catch (e) { toast.error(err(e)) } }
  const remove = async (m: any) => { if (!confirm(`Delete MOU ${m.mou_id} for ${m.company}?`)) return; try { await api(`/api/admin/hr/mou/${m.id}`, { method: "DELETE" }); loadList() } catch (e) { toast.error(err(e)) } }

  const [edit, setEdit] = useState<{ id: string; mou_id: string; company: string; address: string; name: string; designation: string; email: string; phone: string } | null>(null)
  const saveEdit = async () => {
    if (!edit) return
    if (edit.email.trim() && !EMAIL_OK.test(edit.email.trim())) return toast.error("That email address isn't valid")
    try { const { id, mou_id, ...body } = edit; void mou_id; await api(`/api/admin/hr/mou/${id}`, { method: "PATCH", body }); toast.success("Company details updated — the Word/PDF and emails use them now"); setEdit(null); loadList() } catch (e) { toast.error(err(e)) }
  }
  const [dl, setDl] = useState({ from: "", to: "", format: "pdf" as "docx" | "pdf" | "both" })
  const inRange = (m: any) => (!dl.from || m.mou_date >= dl.from) && (!dl.to || m.mou_date <= dl.to)
  const downloadAll = async () => {
    const ids = shown.filter(inRange).map((m) => m.id)
    if (ids.length === 0) return toast.error("No MOUs for that date range")
    if (dl.from && dl.to && dl.from > dl.to) return toast.error("The start date is after the end date")
    setBusy(true)
    try {
      const res = await fetch("/api/admin/hr/mou/download", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids, format: dl.format }) })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not create the zip")
      const u = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = u; a.download = `MOUs-${dl.from || "all"}${dl.to ? `_to_${dl.to}` : ""}-${dl.format}.zip`; a.click(); URL.revokeObjectURL(u)
      toast.success(`Downloaded ${ids.length} MOU${ids.length === 1 ? "" : "s"} as a zip`)
    } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }
  const dayPick = (kind: "today" | "week" | "month" | "all") => {
    const t = todayIst(), d = new Date(`${t}T00:00:00Z`)
    if (kind === "today") setDl({ ...dl, from: t, to: t })
    else if (kind === "week") { const w = new Date(d); w.setUTCDate(d.getUTCDate() - 6); setDl({ ...dl, from: w.toISOString().slice(0, 10), to: t }) }
    else if (kind === "month") setDl({ ...dl, from: `${t.slice(0, 7)}-01`, to: t })
    else setDl({ ...dl, from: "", to: "" })
  }

  // sheet
  const existing = new Set(mous.map((m) => `${String(m.company).toLowerCase()}|${m.email}`))
  const readSheet = async (file: File) => {
    try {
      const XLSX = await import("xlsx")
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const grid = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" }) as unknown[][]
      const r = parseCompanySheet(grid)
      if (r.companies.length === 0 && r.problems.length === 0) return toast.error("That file looks empty")
      setSheet({ file: file.name, ...r, picked: new Set(r.companies.filter((c) => !existing.has(key(c))).map(key)) }); setProgress(null)
    } catch { toast.error("Couldn't read that file. Use an .xlsx, .xls or .csv with Company, Address, Designation, Name and Email columns.") }
  }
  const downloadSample = async () => {
    const XLSX = await import("xlsx")
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Company", "Address", "Designation", "Name", "Email", "Phone", "Business (optional)"], ["Acme Technologies Pvt Ltd", "12, MG Road, Bengaluru 560001", "HR Manager", "Rahul Sharma", "hr@acme.example", "+91 98765 43210", "software development"]]), "Companies")
    XLSX.writeFile(wb, "MOU-companies-sample.xlsx")
  }
  const bulkCreate = async () => {
    if (!sheet) return
    const list = sheet.companies.filter((c) => sheet.picked.has(key(c)))
    if (list.length === 0) return toast.error("Tick at least one company")
    const mailable = list.filter((c) => c.email).length
    if (f.send_email && !confirm(`Create ${list.length} MOU${list.length === 1 ? "" : "s"} and email ${mailable} of them now?${mailable < list.length ? ` (${list.length - mailable} have no email address and won't be emailed.)` : ""}`)) return
    setBusy(true); setProgress({ done: 0, total: list.length, failed: [], emailFailed: 0 })
    const failed: { name: string; error: string }[] = []; let emailFailed = 0
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      try {
        const d = await api("/api/admin/hr/mou", { method: "POST", body: { ...c, issuer_id: issuer, signer_name: signer.name, signer_title: signer.title, digital_signature: signer.digital, mou_date: f.mou_date, send_email: f.send_email, mail_subject: subject, mail_body: body } })
        if (f.send_email && c.email && !d.email?.sent) emailFailed++
      } catch (e) { failed.push({ name: c.company, error: err(e) }) }
      setProgress({ done: i + 1, total: list.length, failed: [...failed], emailFailed })
    }
    setBusy(false); loadList(); setSheet(null)
    const ok = list.length - failed.length
    if (failed.length === 0 && emailFailed === 0) toast.success(`${ok} MOU${ok === 1 ? "" : "s"} created${f.send_email ? " and emailed" : ""}`)
    else toast.warning(`${ok} created. ${failed.length ? `${failed.length} could not be created. ` : ""}${emailFailed ? `${emailFailed} emails failed — use Send in the list below to retry.` : ""}`, { duration: 12000 })
  }

  const shown = mous.filter((m) => { const hay = [m.mou_id, m.company, m.name, m.designation, m.email, m.address].join(" ").toLowerCase(); return words(q).every((w) => hay.includes(w)) })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Issued by &amp; digital signature</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Issuing company">
            {MOU_ISSUERS.map((x) => <Button key={x.id} role="tab" aria-selected={issuer === x.id} size="sm" variant={issuer === x.id ? "default" : "outline"} onClick={() => setIssuer(x.id)}>{x.name}</Button>)}
          </div>
          <p className="text-sm text-muted-foreground">New MOUs are issued by <b>{I.name}</b> with its letterhead, email sender name and reply address ({I.email}). Each issuer keeps its own signer, email draft and template.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Who signs (name)<Input autoComplete="off" name="mou-signer" value={signer.name} onChange={(e) => setSigner({ ...signer, name: e.target.value })} /></label>
            <label className="text-xs text-muted-foreground">Designation<Input autoComplete="off" name="mou-signer-title" value={signer.title} onChange={(e) => setSigner({ ...signer, title: e.target.value })} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={signer.digital} onChange={(e) => setSigner({ ...signer, digital: e.target.checked })} />Digitally sign and stamp the MOU for {I.name} ({signer.name || "signer"}) before sending</label>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => saveSigner()}><PenLine className="mr-1 h-4 w-4" />Save signer</Button>
            <Button size="sm" variant="outline" onClick={() => sigRef.current?.click()}><Upload className="mr-1 h-4 w-4" />{signer.hasSig ? "Replace signature image" : "Upload signature image"}</Button>
            {signer.hasSig && <Button size="sm" variant="ghost" onClick={() => saveSigner({ remove_signature: true })}>Remove image</Button>}
            <input ref={sigRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) uploadSignature(file).catch((x) => toast.error(err(x))) }} />
          </div>
          <p className="text-xs text-muted-foreground">The MOU carries {I.name}'s seal and a line “Digitally signed by {signer.name || "…"}, {signer.title || "…"} — date (MOU ID)”. {signer.hasSig ? "Your uploaded signature image is shown above that line." : "Without an uploaded signature image the name is written in a signature style; upload a PNG/JPG of the real signature (under 300 KB) to use it instead."} This is a visual signature that shows the MOU was issued and approved by {I.name}; it is not a cryptographic e-sign certificate.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">MOU template</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Currently using: <b>{tpl?.custom ? `your uploaded template (${tpl.name})` : `the built-in MOU (${I.name} wording, letterhead and signature)`}</b>. Each company's MOU is made from it as a Word file, with the letterhead and layout unchanged.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadBlob(`/api/admin/hr/mou/template?issuer=${issuer}`, tpl?.name || "MOU-template.docx").catch((e) => toast.error(err(e)))}><Download className="mr-1 h-4 w-4" />Download template</Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" />Upload a different template (.docx)</Button>
            {tpl?.custom && <Button size="sm" variant="ghost" onClick={resetTemplate}>Use the built-in one</Button>}
            <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) uploadTemplate(file) }} />
          </div>
          <p className="text-xs text-muted-foreground">These placeholders in the Word file are replaced for each company: <code className="rounded bg-muted px-1">[Company Name]</code> <code className="rounded bg-muted px-1">[Company Address]</code> <code className="rounded bg-muted px-1">[Name]</code> <code className="rounded bg-muted px-1">[Designation]</code> <code className="rounded bg-muted px-1">[Email]</code> <code className="rounded bg-muted px-1">[Phone]</code> and the date (<code className="rounded bg-muted px-1">[Date]</code>, or the "entered into on …" date). Anything not provided becomes a blank line to write in by hand. Keep the file under 700 KB.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">New MOU</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground sm:col-span-2">Company name *<Input autoComplete="off" name="mou-company" placeholder="e.g. Acme Technologies Pvt Ltd" value={f.company} onChange={set("company")} /></label>
            <label className="text-xs text-muted-foreground">MOU date<Input type="date" value={f.mou_date} onChange={set("mou_date")} /></label>
            <label className="text-xs text-muted-foreground sm:col-span-3">Company address<Input autoComplete="off" name="mou-address" placeholder="Office address" value={f.address} onChange={set("address")} /></label>
            <label className="text-xs text-muted-foreground">Representative name<Input autoComplete="off" name="mou-rep" placeholder="Person who will sign" value={f.name} onChange={set("name")} /></label>
            <label className="text-xs text-muted-foreground">Designation<Input autoComplete="off" name="mou-designation" placeholder="e.g. HR Manager" value={f.designation} onChange={set("designation")} /></label>
            <label className="text-xs text-muted-foreground">Email <span className="text-muted-foreground/80">(the MOU is sent here)</span>
              <Input type="email" autoComplete="off" name="mou-email" placeholder="e.g. hr@company.com" value={f.email} onChange={set("email")} aria-invalid={f.email !== "" && !EMAIL_OK.test(f.email.trim())} />
              {f.email !== "" && !EMAIL_OK.test(f.email.trim()) && <span className="text-red-600">Enter a valid email address</span>}
            </label>
            <label className="text-xs text-muted-foreground">Phone (optional)<Input autoComplete="off" name="mou-phone" value={f.phone} onChange={set("phone")} /></label>
            <label className="text-xs text-muted-foreground sm:col-span-2">Company is engaged in (optional)<Input autoComplete="off" name="mou-business" placeholder="e.g. software development" value={f.business} onChange={set("business")} /></label>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Email draft <span className="font-normal text-muted-foreground">{saved ? "(your saved default)" : "(built-in default)"}</span></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={saveDraft}>Save as default</Button><Button size="sm" variant="ghost" onClick={resetDraft}>Reset to built-in</Button></div>
            </div>
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Edit freely — paste your own wording. These fill in for each company: {MOU_PLACEHOLDERS.map((p) => <code key={p} className="mx-0.5 rounded bg-muted px-1">{`{${p}}`}</code>)}. The filled MOU (Word file) is always attached.</p>
            <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Preview with the details above</summary>
              <div className="mt-2 space-y-1 rounded-md bg-muted/40 p-3"><div className="font-medium">{fillMouTemplate(subject, sample)}</div><pre className="whitespace-pre-wrap font-sans text-sm">{fillMouTemplate(body, sample)}</pre></div>
            </details>
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.send_email} onChange={(e) => setF({ ...f, send_email: e.target.checked })} />Email the MOU to the company now (needs an email address)</label>
          <Button onClick={create} disabled={busy}>{busy ? "Creating…" : f.send_email ? "Create & email MOU" : "Create MOU"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Upload a sheet of companies</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Upload an Excel (.xlsx, .xls) or CSV with columns <b>Company</b>, <b>Address</b>, <b>Designation</b>, <b>Name</b> and <b>Email</b> (Phone and Business are optional). Each company gets its own MOU and email, using the MOU date and email draft set above.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
              <FileSpreadsheet className="h-4 w-4" />Choose Excel / CSV file
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) readSheet(file) }} />
            </label>
            <Button size="sm" variant="ghost" onClick={downloadSample}><Download className="mr-1 h-4 w-4" />Sample sheet</Button>
          </div>
          {sheet && (
            <div className="space-y-3">
              <div className="text-sm"><b>{sheet.file}</b>: {sheet.companies.length} compan{sheet.companies.length === 1 ? "y" : "ies"} found{sheet.problems.length ? `, ${sheet.problems.length} row${sheet.problems.length === 1 ? "" : "s"} skipped` : ""}.{sheet.found.length > 0 && <span className="text-muted-foreground"> Columns read: {sheet.found.join(", ")}.</span>}{!sheet.headerFound && " (No headings found — add a heading row.)"}</div>
              {sheet.companies.length > 0 && (
                <div className="max-h-80 overflow-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted"><tr><th className="px-3 py-2"><input type="checkbox" aria-label="Select all" checked={sheet.companies.every((c) => sheet.picked.has(key(c)))} onChange={(e) => setSheet({ ...sheet, picked: new Set(e.target.checked ? sheet.companies.map(key) : []) })} /></th>{["Company", "Address", "Name · Designation", "Email", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                    <tbody>{sheet.companies.map((c) => (
                      <tr key={key(c)} className="border-t align-top">
                        <td className="px-3 py-1.5"><input type="checkbox" aria-label={`Select ${c.company}`} checked={sheet.picked.has(key(c))} onChange={() => { const n = new Set(sheet.picked); n.has(key(c)) ? n.delete(key(c)) : n.add(key(c)); setSheet({ ...sheet, picked: n }) }} /></td>
                        <td className="px-3 py-1.5 font-medium">{c.company}</td><td className="px-3 py-1.5 text-xs text-muted-foreground">{c.address}</td>
                        <td className="px-3 py-1.5 text-xs">{[c.name, c.designation].filter(Boolean).join(" · ")}</td><td className="px-3 py-1.5">{c.email}</td>
                        <td className="px-3 py-1.5 text-xs text-amber-600">{[!c.email ? "No email — Word file only" : "", existing.has(key(c)) ? "Already has an MOU" : ""].filter(Boolean).join(" · ")}</td>
                      </tr>))}
                    </tbody>
                  </table>
                </div>
              )}
              {sheet.problems.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                  <div className="font-medium text-amber-700">Why {sheet.problems.length} row{sheet.problems.length === 1 ? " was" : "s were"} skipped</div>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {Object.entries(sheet.problems.reduce<Record<string, MouSheetProblem[]>>((g, p) => { (g[p.reason] ??= []).push(p); return g }, {})).map(([reason, list]) => (
                      <li key={reason}><b>{list.length} × {reason}</b>{list[0].text || list[0].row ? ` — e.g. row ${list[0].row}${list[0].text ? ` (${list[0].text})` : ""}` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={bulkCreate} disabled={busy || sheet.picked.size === 0}>{busy ? "Working…" : `${f.send_email ? "Create & email" : "Create"} ${sheet.picked.size} MOU${sheet.picked.size === 1 ? "" : "s"}`}</Button>
                <Button variant="ghost" onClick={() => setSheet(null)} disabled={busy}>Cancel</Button>
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
        <Input className="w-80" placeholder="Search by ID, company, name, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <span className="text-xs text-muted-foreground">{shown.length} of {mous.length}</span>}
      </div>
      <div className="space-y-2 rounded-md border p-3">
        <div className="text-sm font-medium">Download many MOUs at once</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">MOU date from<Input type="date" className="w-40" value={dl.from} onChange={(e) => setDl({ ...dl, from: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">to<Input type="date" className="w-40" value={dl.to} onChange={(e) => setDl({ ...dl, to: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Format
            <select className="block h-9 rounded-md border bg-background px-2 text-sm" value={dl.format} onChange={(e) => setDl({ ...dl, format: e.target.value as "docx" | "pdf" | "both" })}>
              <option value="pdf">PDF</option><option value="docx">Word (.docx)</option><option value="both">PDF + Word</option>
            </select>
          </label>
          <Button disabled={busy || shown.filter(inRange).length === 0} onClick={downloadAll}><Download className="mr-1 h-4 w-4" />{busy ? "Preparing…" : `Download ${shown.filter(inRange).length} (zip)`}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Quick pick:
          {([["today", "Today"], ["week", "Last 7 days"], ["month", "This month"], ["all", "All dates"]] as const).map(([k, l]) => <Button key={k} size="sm" variant="ghost" className="h-7 px-2" onClick={() => dayPick(k)}>{l}</Button>)}
          <span>Uses the search above too. With several dates, the zip has one folder per date. PDFs take longer to prepare.</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50"><tr>{["ID", "Company", "Contact", "Issued by", "Date", "Email", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">{q ? `No MOUs match "${q}".` : "No MOUs yet."}</td></tr>}
            {shown.map((m) => (
              <Fragment key={m.id}>
                <tr className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{m.mou_id}</td>
                  <td className="px-3 py-2"><div className="font-medium">{m.company}</div>{m.address ? <div className="max-w-xs text-xs text-muted-foreground">{m.address}</div> : <button className="text-xs text-amber-600 underline" onClick={() => setEdit({ id: m.id, mou_id: m.mou_id, company: m.company, address: "", name: m.name ?? "", designation: m.designation ?? "", email: m.email ?? "", phone: m.phone ?? "" })}>No address — add it</button>}</td>
                  <td className="px-3 py-2 text-xs">{[m.name, m.designation].filter(Boolean).join(" · ")}<div className="text-muted-foreground">{m.email}</div></td>
                  <td className="px-3 py-2 text-xs">{issuerById(m.issuer_id).name}<div className="text-muted-foreground">{m.digital_signature === false ? "Unsigned" : `Signed: ${m.signer_name || issuerById(m.issuer_id).signer_name}`}</div></td>
                  <td className="px-3 py-2 whitespace-nowrap">{m.mou_date}</td>
                  <td className="px-3 py-2 text-xs">{m.email_status === "sent" ? <span className="text-green-600">Sent</span> : m.email_status === "failed" ? <span className="text-red-600" title={m.email_error}>Failed</span> : <span className="text-muted-foreground">{m.email ? "Not sent" : "No email"}</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(`/api/admin/hr/mou/${m.id}/docx`, `MOU-${m.mou_id}.docx`).catch((e) => toast.error(err(e)))}><Download className="mr-1 h-4 w-4" />Word</Button>{" "}
                    <Button size="sm" variant="outline" onClick={() => downloadBlob(`/api/admin/hr/mou/${m.id}/pdf`, `MOU-${m.mou_id}.pdf`).catch((e) => toast.error(err(e)))}><Download className="mr-1 h-4 w-4" />PDF</Button>{" "}
                    <Button size="sm" variant="outline" onClick={() => view(m)}><Eye className="mr-1 h-4 w-4" />Email</Button>{" "}
                    <Button size="sm" variant="outline" disabled={!m.email} onClick={() => resend(m)}><Mail className="mr-1 h-4 w-4" />{m.email_status === "sent" ? "Resend" : "Send"}</Button>{" "}
                    <Button size="sm" variant="outline" onClick={() => setEdit({ id: m.id, mou_id: m.mou_id, company: m.company, address: m.address ?? "", name: m.name ?? "", designation: m.designation ?? "", email: m.email ?? "", phone: m.phone ?? "" })}>Edit</Button>{" "}
                    <Button size="icon" variant="ghost" onClick={() => remove(m)} aria-label={`Delete ${m.mou_id}`}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Edit {edit.mou_id}</CardTitle><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted-foreground sm:col-span-3">Company name<Input value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground sm:col-span-3">Company address<Input autoFocus value={edit.address} placeholder="Office address" onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">Representative<Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">Designation<Input value={edit.designation} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">Phone<Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground sm:col-span-3">Email<Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
            </div>
            <Button onClick={saveEdit}>Save changes</Button>
          </CardContent>
        </Card>
      )}
      {viewing && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Email for this company</CardTitle><Button size="sm" variant="ghost" onClick={() => setViewing(null)}>Close</Button></CardHeader>
          <CardContent className="space-y-1"><div className="font-medium">{viewing.subject}</div><pre className="whitespace-pre-wrap font-sans text-sm">{viewing.text}</pre></CardContent>
        </Card>
      )}
    </div>
  )
}
