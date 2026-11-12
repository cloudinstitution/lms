"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ApiFailure, api } from "@/lib/certificate-client"
import { ADMIN_SECTIONS, STAFF_ROLES, roleDef } from "@/lib/staff-roles"
import { Trash2 } from "lucide-react"
import { Fragment, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type StaffRow = { id: string; name: string; email: string; role: string; role_label: string; sections: string[] | null; created_at: string | null }
const err = (e: unknown) => (e instanceof ApiFailure || e instanceof Error ? e.message : "Something went wrong")
const sel = "h-10 rounded-md border bg-background px-3 text-sm"
const presetFor = (role: string) => roleDef(role)?.sections ?? []
const blank = { name: "", email: "", password: "", role: "hr", sections: presetFor("hr") }

function PagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])
  return (
    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
      {ADMIN_SECTIONS.map((p) => (
        <label key={p.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(p.key)} onChange={() => toggle(p.key)} />{p.label}</label>
      ))}
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<StaffRow[]>([])
  const [form, setForm] = useState(blank)
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<string[]>([])

  const load = useCallback(async () => {
    try { setUsers((await api("/api/admin/users")).users) } catch (e) { if (e instanceof ApiFailure && e.message.toLowerCase().includes("administrator")) setForbidden(true); else toast.error(err(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setBusy(true)
    try { await api("/api/admin/users", { method: "POST", body: form }); toast.success(`${form.name} can now log in as ${roleDef(form.role)?.label}`); setForm(blank); load() } catch (e) { toast.error(err(e)) } finally { setBusy(false) }
  }
  const savePages = async (u: StaffRow) => {
    try { await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { sections: draft } }); toast.success(`${u.name}'s pages updated — they need to log in again`); setEditing(null); load() } catch (e) { toast.error(err(e)) }
  }
  const changeRole = async (u: StaffRow, role: string) => {
    try { await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { role } }); toast.success(`${u.name} is now ${roleDef(role)?.label}`) } catch (e) { toast.error(err(e)) }
    load()
  }
  const resetPassword = async (u: StaffRow) => {
    const password = window.prompt(`New password for ${u.name} (min 6 characters)`)
    if (!password) return
    try { await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { password } }); toast.success("Password updated") } catch (e) { toast.error(err(e)) }
  }
  const remove = async (u: StaffRow) => {
    if (!window.confirm(`Delete ${u.name} (${u.email})? They will no longer be able to log in.`)) return
    try { await api(`/api/admin/users/${u.id}`, { method: "DELETE" }); toast.success("User deleted"); load() } catch (e) { toast.error(err(e)) }
  }

  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = users.filter((u) => words.every((w) => `${u.name} ${u.email} ${u.role_label}`.toLowerCase().includes(w)))

  if (forbidden) return <p className="text-muted-foreground">Only administrators can manage users and roles.</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users & Roles</h1>
        <p className="text-muted-foreground">Create staff accounts and choose what each person can open.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Create user</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="email" placeholder="Email (used to log in)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input type="text" placeholder="Password (min 6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className={sel} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, sections: presetFor(e.target.value) })}>
              {STAFF_ROLES.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{roleDef(form.role)?.description}</p>
          {form.role !== "admin" ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Pages this user can open <span className="font-normal text-muted-foreground">(the Dashboard is always open)</span></div>
              <PagePicker value={form.sections} onChange={(sections) => setForm({ ...form, sections })} />
            </div>
          ) : <p className="text-xs text-muted-foreground">Administrators can open every page.</p>}
          <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create user"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          {STAFF_ROLES.map((r) => <div key={r.role} className="rounded-md border p-3"><div className="font-medium">{r.label}</div><div className="text-xs text-muted-foreground">{r.description}</div></div>)}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="w-80" placeholder="Search by name, email or role…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <span className="text-xs text-muted-foreground">{shown.length} of {users.length}</span>}
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50"><tr>{["Name", "Email", "Role", "Pages", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{q ? `No users match "${q}".` : "No users yet."}</td></tr>}
              {shown.map((u) => (
                <Fragment key={u.id}>
                  <tr className="border-t">
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      <select className={sel} value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                        {STAFF_ROLES.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {u.sections === null ? "All pages" : u.sections.length === 0 ? "Dashboard only" : u.sections.map((k) => ADMIN_SECTIONS.find((p) => p.key === k)?.label ?? k).join(", ")}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {u.sections !== null && <><Button size="sm" variant="outline" onClick={() => { setEditing(editing === u.id ? null : u.id); setDraft(u.sections ?? []) }}>Pages</Button>{" "}</>}
                      <Button size="sm" variant="outline" onClick={() => resetPassword(u)}>Reset password</Button>{" "}
                      <Button size="icon" variant="ghost" onClick={() => remove(u)} aria-label={`Delete ${u.name}`}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                  {editing === u.id && (
                    <tr className="border-t bg-muted/30">
                      <td colSpan={5} className="space-y-3 px-3 py-3">
                        <div className="text-sm font-medium">Pages {u.name} can open</div>
                        <PagePicker value={draft} onChange={setDraft} />
                        <div className="flex gap-2"><Button size="sm" onClick={() => savePages(u)}>Save pages</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
