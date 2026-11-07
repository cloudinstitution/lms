import { createHash } from "crypto"
import { getDb } from "./firebase-admin"
import { ApiError } from "./http"

/**
 * Automatic job board. Searches public job sources on a schedule (or on demand), turns each result into a normal
 * `jobs` document (the same collection admins post to and students read), and closes auto-posted jobs once expired.
 * - Re-imports are prevented by `job_imports` (an admin who deletes an auto job will not see it come back).
 * - Manually posted jobs are never touched.
 */

export type AutoSettings = { include_remote?: boolean; v?: number; sources_v?: number; freshers_only?: boolean; enabled: boolean; keywords: string[]; locations: string[]; sources: string[]; max_per_run: number; valid_days: number; last_run?: LastRun }
export type LastRun = { at: string; added: number; closed: number; skipped: number; matched?: number; not_set_up?: string[]; by: "admin" | "schedule"; sources: Record<string, { found: number; matched?: number; error?: string }> }
export type RawJob = { remote?: boolean; portal?: string; source: string; external_id: string; title: string; company: string; location: string; type_hint: string; description: string; tags: string[]; url: string; posted_at: string }

export const SOURCES = [
  { id: "remotive", label: "Remotive (remote tech jobs, free)", needs_key: false },
  { id: "jobicy", label: "Jobicy (remote jobs open to India, free)", needs_key: false },
  { id: "arbeitnow", label: "Arbeitnow (tech jobs, free)", needs_key: false },
  { id: "adzuna", label: "Adzuna India (set ADZUNA_APP_ID and ADZUNA_APP_KEY)", needs_key: true },
  { id: "jsearch", label: "JSearch — LinkedIn, Naukri, Indeed, Glassdoor… (set JSEARCH_API_KEY)", needs_key: true },
  { id: "jooble", label: "Jooble — Naukri and many other portals (set JOOBLE_API_KEY)", needs_key: true },
] as const

/** Environment variables each optional source needs; a source without its keys is skipped quietly. */
export const SOURCE_KEYS: Record<string, string[]> = { adzuna: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"], jsearch: ["JSEARCH_API_KEY"], jooble: ["JOOBLE_API_KEY"] }
export const sourceReady = (id: string) => (SOURCE_KEYS[id] ?? []).every((k) => Boolean(process.env[k]))

export const PROFILE_VERSION = 3 // bump when the default keywords/locations change; older saved search terms are then replaced

export const DEFAULT_SETTINGS: AutoSettings = {
  v: PROFILE_VERSION,
  include_remote: true, // also post remote jobs that are open to India / anywhere
  freshers_only: false, // false = both freshers and experienced roles, posted in equal numbers
  enabled: true,
  // One group per course we teach; a job must have one of these phrases in its title or skill tags.
  keywords: ["full stack", "fullstack", "python developer", "python", "ai engineer", "machine learning", "data analyst", "data analytics", "business analyst", "cloud engineer", "cloud support", "cloud", "aws", "azure", "devops", "linux", "system administrator", "sysadmin"],
  // India only
  locations: ["India", "Bangalore", "Bengaluru", "Mumbai", "Pune", "Hyderabad", "Chennai", "Delhi", "Gurgaon", "Gurugram", "Noida", "Kolkata", "Kochi", "Ahmedabad", "Coimbatore"],
  sources: ["remotive", "jobicy", "arbeitnow", "adzuna", "jsearch", "jooble"],
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
  const SOURCES_V = 3 // v2 added JSearch and Jooble, v3 Jobicy: older saved source lists get them added
  const savedSources = s.sources ?? DEFAULT_SETTINGS.sources
  const sources = (s.sources_v ?? 1) < SOURCES_V ? [...new Set([...savedSources, "jobicy", "jsearch", "jooble"])] : savedSources
  const old = (s.v ?? 1) < PROFILE_VERSION // settings saved before the course-based, India-only profile
  return { ...DEFAULT_SETTINGS, ...s, v: PROFILE_VERSION, sources_v: SOURCES_V, include_remote: s.include_remote !== false, freshers_only: old ? DEFAULT_SETTINGS.freshers_only : s.freshers_only === true, keywords: !old && s.keywords?.length ? s.keywords : DEFAULT_SETTINGS.keywords, sources, locations: !old && s.locations ? s.locations : DEFAULT_SETTINGS.locations }
}

export async function saveAutoSettings(input: any): Promise<AutoSettings> {
  const cur = await getAutoSettings()
  const sources = input?.sources === undefined ? cur.sources : list(input.sources, 5).filter((s) => SOURCES.some((x) => x.id === s))
  const next: AutoSettings = {
    v: PROFILE_VERSION, sources_v: 3,
    include_remote: input?.include_remote === undefined ? cur.include_remote !== false : input.include_remote === true,
    freshers_only: input?.freshers_only === undefined ? cur.freshers_only === true : input.freshers_only === true,
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
async function getJson(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<any> {
  const res = await fetch(url, { method: init.method, body: init.body, headers: { accept: "application/json", "user-agent": "CloudInstitutionJobs/1.0", ...init.headers }, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v))
const iso = (v: unknown): string => {
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(s(v))
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

/** These sources were searched for India only, so a bare city name ("Chennai") is tagged "…, India". */
const inIndia = (loc: string) => (/india/i.test(loc) ? loc : loc ? `${loc}, India` : "India")

export const PROVIDERS: Record<string, (st: AutoSettings) => Promise<RawJob[]>> = {
  async remotive() {
    const d = await getJson("https://remotive.com/api/remote-jobs?category=software-dev&limit=100")
    return (d.jobs ?? []).map((j: any): RawJob => ({ source: "remotive", external_id: s(j.id), title: s(j.title), company: s(j.company_name), location: s(j.candidate_required_location) || "Remote", type_hint: s(j.job_type), description: s(j.description), tags: (j.tags ?? []).map(s), url: s(j.url), posted_at: iso(j.publication_date), remote: true }))
  },
  /** Jobicy lists remote jobs and can filter to those open to India. Its job level (Junior/Senior…) is passed on so freshers are recognised. */
  async jobicy() {
    const d = await getJson("https://jobicy.com/api/v2/remote-jobs?count=50&geo=india&industry=dev")
    return (d.jobs ?? []).map((j: any): RawJob => ({ source: "jobicy", external_id: s(j.id), title: s(j.jobTitle), company: s(j.companyName), location: `${s(j.jobGeo) || "Anywhere"}, India (Remote)`, type_hint: Array.isArray(j.jobType) ? j.jobType.join(" ") : s(j.jobType), description: `${/junior|entry/i.test(s(j.jobLevel)) ? "Fresher / entry level. " : ""}${s(j.jobDescription) || s(j.jobExcerpt)}`, tags: [s(j.jobLevel)].filter(Boolean), url: s(j.url), posted_at: iso(j.pubDate), remote: true }))
  },
  async arbeitnow() {
    const d = await getJson("https://www.arbeitnow.com/api/job-board-api")
    return (d.data ?? []).map((j: any): RawJob => ({ source: "arbeitnow", remote: j.remote === true, external_id: s(j.slug), title: s(j.title), company: s(j.company_name), location: j.remote ? `${s(j.location)} (Remote)`.trim() : s(j.location), type_hint: (j.job_types ?? []).join(" "), description: s(j.description), tags: (j.tags ?? []).map(s), url: s(j.url), posted_at: iso(j.created_at) }))
  },
  async adzuna(st) {
    const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY
    if (!id || !key) throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY are not set")
    const out: RawJob[] = []
    for (const kw of st.keywords.slice(0, 12)) {
      const d = await getJson(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${encodeURIComponent(id)}&app_key=${encodeURIComponent(key)}&results_per_page=30&what=${encodeURIComponent(kw)}&sort_by=date&content-type=application/json`)
      for (const j of d.results ?? []) out.push({ source: "adzuna", external_id: s(j.id), title: s(j.title), company: s(j.company?.display_name), location: inIndia(s(j.location?.display_name)), type_hint: `${s(j.contract_time)} ${s(j.contract_type)}`, description: s(j.description), tags: [s(j.category?.label)].filter(Boolean), url: s(j.redirect_url), posted_at: iso(j.created) })
    }
    return out
  },
  /** JSearch (RapidAPI) returns Google-for-Jobs listings from LinkedIn, Naukri, Indeed, Glassdoor and others, each with the portal's apply link. */
  async jsearch(st) {
    const key = process.env.JSEARCH_API_KEY
    if (!key) throw new Error("JSEARCH_API_KEY is not set")
    const out: RawJob[] = []
    const queries = [...new Set(st.keywords.filter((k) => k.includes(" ") || k.length > 4))].slice(0, 6) // few, specific queries: the free plan is small
    for (const kw of queries) {
      const d = await getJson(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(`${kw}${st.freshers_only === true ? " fresher" : ""} in India`)}&page=1&num_pages=1&country=in&date_posted=month`, { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" } })
      for (const j of d.data ?? []) {
        const months = Number(j.job_required_experience?.required_experience_in_months)
        const exp = j.job_required_experience?.no_experience_required ? "No experience required." : Number.isFinite(months) && months > 0 ? `Experience: ${Math.round((months / 12) * 10) / 10 >= 1 ? Math.round(months / 12) : "<1"} years.` : ""
        out.push({ source: "jsearch", remote: j.job_is_remote === true, portal: s(j.job_publisher), external_id: s(j.job_id), title: s(j.job_title), company: s(j.employer_name), location: [j.job_city, j.job_state, s(j.job_country).toUpperCase() === "IN" ? "India" : j.job_country].filter(Boolean).map(s).join(", ") || (j.job_is_remote ? "India (Remote)" : "India"), type_hint: s(j.job_employment_type), description: `${exp}\n${s(j.job_description)}`, tags: (j.job_required_skills ?? []).map(s), url: s(j.job_apply_link), posted_at: iso(j.job_posted_at_datetime_utc) })
      }
    }
    return out
  },
  /** Jooble searches Naukri and many other portals; each result links to the original posting. */
  async jooble(st) {
    const key = process.env.JOOBLE_API_KEY
    if (!key) throw new Error("JOOBLE_API_KEY is not set")
    const out: RawJob[] = []
    for (const kw of st.keywords.slice(0, 8)) {
      const d = await getJson(`https://jooble.org/api/${encodeURIComponent(key)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keywords: kw, location: "India", page: "1" }) })
      for (const j of d.jobs ?? []) out.push({ source: "jooble", portal: s(j.source), external_id: s(j.id), title: s(j.title), company: s(j.company), location: inIndia(s(j.location)), type_hint: s(j.type), description: s(j.snippet), tags: [], url: s(j.link), posted_at: iso(j.updated) })
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

const SENIOR_TITLE = /\b(senior|sr|lead|principal|staff|manager|head|director|architect|vp|chief|consultant|specialist)\b/i
const FRESHER_WORDS = /\b(fresher|freshers|trainee|intern|internship|junior|jr|entry[ -]level|graduate|graduates|associate|apprentice|campus)\b|\b0\s*(?:-|to|–)\s*[1-3]\s*(?:years?|yrs?)/i

/** The lowest number of years of experience the posting asks for, or null when it does not say. */
export function minYearsRequired(text: string): number | null {
  let min: number | null = null
  for (const sentence of text.split(/[.\n;•]/)) {
    if (!/experience/i.test(sentence)) continue
    for (const m of sentence.matchAll(/(\d{1,2})\s*(?:\+|(?:[-–]|to)\s*\d{1,2})?\s*(?:years?|yrs?)/gi)) { const n = Number(m[1]); if (min === null || n < min) min = n }
  }
  return min
}

/** Suitable for freshers: not a senior title, and not asking for 3 or more years of experience. */
export function fresherFriendly(j: RawJob): boolean {
  if (SENIOR_TITLE.test(j.title)) return false
  if (FRESHER_WORDS.test(`${j.title} ${j.tags.join(" ")}`)) return true
  const y = minYearsRequired(htmlToText(j.description))
  return y === null || y < 3
}

/**
 * A remote job a student in India could take: it is remote, and its location is not tied to a specific other place.
 * "Remote", "Worldwide", "Anywhere", "APAC", "Asia", "India" pass; "USA only", "Berlin (Remote)", "EMEA" do not.
 */
export function isOpenRemote(j: Pick<RawJob, "remote" | "location" | "title" | "tags">): boolean {
  const loc = j.location.toLowerCase()
  const remote = j.remote === true || /remote|work from home|wfh|anywhere|worldwide|distributed/.test(loc) || /\b(remote|work from home|wfh)\b/i.test(`${j.title} ${j.tags.join(" ")}`)
  if (!remote) return false
  if (/india|worldwide|anywhere|global|apac|asia|international|open to all/.test(loc)) return true
  const rest = loc.replace(/\(?remote\)?|work from home|wfh|fully|hybrid|100%|only|\bjob\b/g, " ").replace(/[^a-z]+/g, " ").trim()
  return rest === ""
}

export function matches(j: RawJob, st: AutoSettings): boolean {
  if (!j.title || !j.company || !/^https?:\/\//.test(j.url)) return false
  if (st.freshers_only === true && !fresherFriendly(j)) return false
  const hay = `${j.title} ${j.tags.join(" ")}`.toLowerCase() // title and skill tags only, so a passing mention in a description does not count
  if (!st.keywords.some((k) => hay.includes(k.toLowerCase()))) return false
  if (st.locations.length === 0) return true
  const loc = j.location.toLowerCase()
  if (st.locations.some((l) => loc.includes(l.toLowerCase()))) return true
  return st.include_remote !== false && isOpenRemote(j)
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
    remote: j.remote === true || isOpenRemote(j), level: fresherFriendly(j) ? "Fresher" : "Experienced", source: j.source, portal: j.portal || j.source, auto: true, external_id: j.external_id, posted_at: j.posted_at,
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

/** Closes open auto-posted jobs that no longer fit the current keywords/locations (e.g. after the search terms change). */
export async function closeMismatchedAutoJobs(st: AutoSettings): Promise<number> {
  const snap = await getDb().collection("jobs").where("auto", "==", true).get()
  let n = 0
  for (const d of snap.docs) {
    const x = d.data() as any
    if (x.status !== "Open") continue
    const raw: RawJob = { source: x.source ?? "", external_id: x.external_id ?? "", title: x.title ?? "", company: x.company ?? "x", location: x.location ?? "", type_hint: "", remote: x.remote === true, description: x.description ?? "", tags: String(x.requirements ?? "").replace(/^Skills:\s*/, "").split(",").map((t) => t.trim()).filter(Boolean), url: x.applyLink || "https://x", posted_at: "" }
    if (!matches(raw, st)) { await getDb().collection("jobs").doc(d.id).update({ status: "Closed" }); n++ }
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
    if (!sourceReady(src) && SOURCE_KEYS[src]) { (run.not_set_up ??= []).push(src); continue } // optional source: skipped until its keys are set
    try { const r = await fn(st); run.sources[src] = { found: r.length }; found.push(...r) } catch (e) { run.sources[src] = { found: 0, error: e instanceof Error ? e.message : "failed" } }
  }
  // fresher-labelled jobs first, then newest, so the per-run cap keeps the best postings for freshers
  const boost = (j: RawJob) => (FRESHER_WORDS.test(`${j.title} ${j.tags.join(" ")} ${j.description.slice(0, 600)}`) ? 1 : 0)
  found.sort((a, b) => boost(b) - boost(a) || b.posted_at.localeCompare(a.posted_at))
  const seenNow = new Set<string>()
  const fresh: RawJob[] = [], exp: RawJob[] = []
  run.matched = 0
  for (const j of found) {
    if (!matches(j, st)) continue
    run.matched++
    if (run.sources[j.source]) run.sources[j.source].matched = (run.sources[j.source].matched ?? 0) + 1
    const id = docId(j)
    if (seenNow.has(id)) continue
    seenNow.add(id)
    ;(fresherFriendly(j) ? fresh : exp).push(j)
  }
  // alternate fresher / experienced so both kinds are posted in equal numbers (the longer list fills any gap)
  const ordered: RawJob[] = []
  for (let i = 0; i < Math.max(fresh.length, exp.length); i++) { if (fresh[i]) ordered.push(fresh[i]); if (exp[i]) ordered.push(exp[i]) }
  for (const j of ordered) {
    if (run.added >= st.max_per_run) break
    const id = docId(j)
    const imp = getDb().collection("job_imports").doc(id)
    if ((await imp.get()).exists) { run.skipped++; continue }
    await getDb().collection("jobs").doc(id).set(toJobDoc(j, st.valid_days))
    await imp.set({ source: j.source, external_id: j.external_id, title: j.title, imported_at: run.at })
    run.added++
  }
  run.closed = (await closeExpiredAutoJobs()) + (await closeMismatchedAutoJobs(st))
  await getDb().collection("job_settings").doc(SETTINGS_ID).set({ ...st, last_run: run })
  return run
}

let running: Promise<unknown> | null = null
const STALE_MS = 12 * 3600_000

/** Runs the search only when automatic search is on and the last attempt is over 12 hours old. Safe to call from any page load. */
export async function runAutoSyncIfStale(): Promise<{ ran: boolean; added: number }> {
  if (running) return { ran: false, added: 0 }
  const st = await getAutoSettings()
  if (!st.enabled) return { ran: false, added: 0 }
  if (st.last_run && Date.now() - new Date(st.last_run.at).getTime() < STALE_MS) return { ran: false, added: 0 }
  const p = runAutoSync("schedule")
  running = p
  try { const r = (await p) as LastRun; return { ran: true, added: r.added } } finally { running = null }
}
