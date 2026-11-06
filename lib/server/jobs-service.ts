import { createHash } from "crypto"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"

/**
 * Automatic job board. Searches public job sources on a schedule (or on demand), turns each result into a normal
 * `jobs` document (the same collection admins post to and students read), and closes auto-posted jobs once expired.
 * - Re-imports are prevented by `job_imports` (an admin who deletes an auto job will not see it come back).
 * - Manually posted jobs are never touched.
 */

export type AutoSettings = { enabled: boolean; keywords: string[]; locations: string[]; sources: string[]; max_per_run: number; valid_days: number; last_run?: LastRun }
export type LastRun = { at: string; added: number; closed: number; skipped: number; by: "admin" | "schedule"; sources: Record<string, { found: number; error?: string }> }
export type RawJob = { source: string; external_id: string; title: string; company: string; location: string; type_hint: string; description: string; tags: string[]; url: string; posted_at: string }

export const SOURCES = [
  { id: "remotive", label: "Remotive (remote tech jobs, free)", needs_key: false },
  { id: "arbeitnow", label: "Arbeitnow (tech jobs, free)", needs_key: false },
  { id: "adzuna", label: "Adzuna India (set ADZUNA_APP_ID and ADZUNA_APP_KEY)", needs_key: true },
] as const

export const DEFAULT_SETTINGS: AutoSettings = {
  enabled: true,
  keywords: ["software", "developer", "python", "java", "react", "data", "cloud", "devops", "aws", "fresher", "intern"],
  locations: ["India", "Bangalore", "Bengaluru", "Remote", "Worldwide", "Anywhere"],
  sources: ["remotive", "arbeitnow", "adzuna"],
  max_per_run: 30,
  valid_days: 30,
}

const SETTINGS_ID = "auto"
const list = (v: unknown, max: number, len = 40) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[,\n]/)).map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max)
const clampInt = (v: unknown, d: number, lo: number, hi: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }

export async function getAutoSettings(): Promise<AutoSettings> {
  const snap = await getDb().collection("job_settings").doc(SETTINGS_ID).get()
  const s = snap.exists ? (snap.data() as Partial<AutoSettings>) : {}
  return { ...DEFAULT_SETTINGS, ...s, keywords: s.keywords?.length ? s.keywords : DEFAULT_SETTINGS.keywords, sources: s.sources ?? DEFAULT_SETTINGS.sources, locations: s.locations ?? DEFAULT_SETTINGS.locations }
}

export async function saveAutoSettings(input: any): Promise<AutoSettings> {
  const cur = await getAutoSettings()
  const sources = input?.sources === undefined ? cur.sources : list(input.sources, 5).filter((s) => SOURCES.some((x) => x.id === s))
  const next: AutoSettings = {
    enabled: input?.enabled === undefined ? cur.enabled : input.enabled === true,
    keywords: input?.keywords === undefined ? cur.keywords : list(input.keywords, 30),
    locations: input?.locations === undefined ? cur.locations : list(input.locations, 30),
    sources, max_per_run: clampInt(input?.max_per_run ?? cur.max_per_run, 30, 1, 100), valid_days: clampInt(input?.valid_days ?? cur.valid_days, 30, 1, 180),
  }
  if (cur.last_run) next.last_run = cur.last_run
  if (next.keywords.length === 0) throw new ApiError(400, "Add at least one keyword to search for")
  if (next.sources.length === 0) throw new ApiError(400, "Choose at least one job source")
  await getDb().collection("job_settings").doc(SETTINGS_ID).set(next)
  return next
}

// ---------- fetching ----------
async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "CloudInstitutionJobs/1.0" }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v))
const iso = (v: unknown): string => {
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(s(v))
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export const PROVIDERS: Record<string, (st: AutoSettings) => Promise<RawJob[]>> = {
  async remotive() {
    const d = await getJson("https://remotive.com/api/remote-jobs?category=software-dev&limit=100")
    return (d.jobs ?? []).map((j: any): RawJob => ({ source: "remotive", external_id: s(j.id), title: s(j.title), company: s(j.company_name), location: s(j.candidate_required_location) || "Remote", type_hint: s(j.job_type), description: s(j.description), tags: (j.tags ?? []).map(s), url: s(j.url), posted_at: iso(j.publication_date) }))
  },
  async arbeitnow() {
    const d = await getJson("https://www.arbeitnow.com/api/job-board-api")
    return (d.data ?? []).map((j: any): RawJob => ({ source: "arbeitnow", external_id: s(j.slug), title: s(j.title), company: s(j.company_name), location: j.remote ? `${s(j.location)} (Remote)`.trim() : s(j.location), type_hint: (j.job_types ?? []).join(" "), description: s(j.description), tags: (j.tags ?? []).map(s), url: s(j.url), posted_at: iso(j.created_at) }))
  },
  async adzuna(st) {
    const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY
    if (!id || !key) throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY are not set")
    const out: RawJob[] = []
    for (const kw of st.keywords.slice(0, 6)) {
      const d = await getJson(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${encodeURIComponent(id)}&app_key=${encodeURIComponent(key)}&results_per_page=30&what=${encodeURIComponent(kw)}&sort_by=date&content-type=application/json`)
      for (const j of d.results ?? []) out.push({ source: "adzuna", external_id: s(j.id), title: s(j.title), company: s(j.company?.display_name), location: s(j.location?.display_name) || "India", type_hint: `${s(j.contract_time)} ${s(j.contract_type)}`, description: s(j.description), tags: [s(j.category?.label)].filter(Boolean), url: s(j.redirect_url), posted_at: iso(j.created) })
    }
    return out
  },
}

// ---------- conversion ----------
const ENT: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&rsquo;": "'", "&ndash;": "-" }
export const htmlToText = (h: string) =>
  h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<\s*(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (m) => ENT[m.toLowerCase()] ?? " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim()

export function jobType(j: RawJob): "Full-time" | "Part-time" | "Internship" | "Contract" {
  const t = `${j.type_hint} ${j.title}`.toLowerCase()
  if (/intern/.test(t)) return "Internship"
  if (/part[ _-]?time/.test(t)) return "Part-time"
  if (/contract|freelance/.test(t)) return "Contract"
  return "Full-time"
}

export function matches(j: RawJob, st: AutoSettings): boolean {
  if (!j.title || !j.company || !/^https?:\/\//.test(j.url)) return false
  const hay = `${j.title} ${j.tags.join(" ")} ${htmlToText(j.description).slice(0, 400)}`.toLowerCase()
  if (!st.keywords.some((k) => hay.includes(k.toLowerCase()))) return false
  if (st.locations.length === 0) return true
  const loc = j.location.toLowerCase()
  return st.locations.some((l) => loc.includes(l.toLowerCase())) || (loc === "" && st.locations.some((l) => /remote|anywhere|worldwide/i.test(l)))
}

const docId = (j: RawJob) => `${j.source}_${createHash("sha1").update(`${j.source}:${j.external_id || j.url}`).digest("hex").slice(0, 20)}`
const ymd = (d: Date) => d.toISOString().slice(0, 10)

export function toJobDoc(j: RawJob, validDays: number) {
  const text = htmlToText(j.description)
  const deadline = new Date(Date.now() + validDays * 86400_000)
  return {
    title: j.title.trim().slice(0, 150), company: j.company.trim().slice(0, 100), location: j.location.trim().slice(0, 100) || "Remote", jobType: jobType(j),
    description: text.slice(0, 3000), requirements: j.tags.length ? `Skills: ${j.tags.slice(0, 12).join(", ")}` : "",
    applyLink: j.url, deadline: ymd(deadline), status: "Open", createdAt: new Date(),
    source: j.source, auto: true, external_id: j.external_id, posted_at: j.posted_at,
  }
}

// ---------- the sync ----------
export async function closeExpiredAutoJobs(): Promise<number> {
  const snap = await getDb().collection("jobs").where("auto", "==", true).get()
  const today = ymd(new Date()); let n = 0
  for (const d of snap.docs) {
    const x = d.data() as any
    if (x.status === "Open" && x.deadline && x.deadline < today) { await getDb().collection("jobs").doc(d.id).update({ status: "Closed" }); n++ }
  }
  return n
}

export async function runAutoSync(by: "admin" | "schedule", opts: { force?: boolean } = {}): Promise<LastRun & { skipped_disabled?: boolean }> {
  const st = await getAutoSettings()
  const run: LastRun = { at: new Date().toISOString(), added: 0, closed: 0, skipped: 0, by, sources: {} }
  if (!st.enabled && !opts.force) return { ...run, skipped_disabled: true }
  const found: RawJob[] = []
  for (const src of st.sources) {
    const fn = PROVIDERS[src]
    if (!fn) continue
    try { const r = await fn(st); run.sources[src] = { found: r.length }; found.push(...r) } catch (e) { run.sources[src] = { found: 0, error: e instanceof Error ? e.message : "failed" } }
  }
  // newest first, so the cap keeps the freshest postings
  found.sort((a, b) => b.posted_at.localeCompare(a.posted_at))
  const seenNow = new Set<string>()
  for (const j of found) {
    if (run.added >= st.max_per_run) break
    if (!matches(j, st)) continue
    const id = docId(j)
    if (seenNow.has(id)) continue
    seenNow.add(id)
    const imp = getDb().collection("job_imports").doc(id)
    if ((await imp.get()).exists) { run.skipped++; continue }
    await getDb().collection("jobs").doc(id).set(toJobDoc(j, st.valid_days))
    await imp.set({ source: j.source, external_id: j.external_id, title: j.title, imported_at: run.at })
    run.added++
  }
  run.closed = await closeExpiredAutoJobs()
  await getDb().collection("job_settings").doc(SETTINGS_ID).set({ ...st, last_run: run })
  return run
}
