import { emptyProfile, skillsIn, type ResumeProfile } from "./resume-ats"

/**
 * Turns the plain text of an uploaded resume into resume-profile fields. Best effort: resumes come in every layout,
 * so the student always reviews the result in the form before it is used.
 */

type Section = "header" | "summary" | "skills" | "education" | "projects" | "experience" | "certifications" | "other"
const HEADINGS: [Section, RegExp][] = [
  ["summary", /^(professional |career )?(summary|objective|profile|about( me)?|career objective|personal statement)$/],
  ["skills", /^((key|core|technical|it|professional) )?(skills|competencies|technologies|tools( & technologies| and technologies)?|technical (proficiency|expertise)|skill set|skills (&|and) tools)$/],
  ["education", /^(education(al)?( qualifications?| background| details)?|academics?|academic (qualifications?|background|profile)|qualifications?)$/],
  ["projects", /^((academic|personal|key|major|mini|technical|selected) )?projects?( work| experience)?$/],
  ["experience", /^((work|professional|relevant|industrial|internship|employment|career) )?(experience|history|internships?|training)( & internships?| and internships?)?$|^(internships?|employment)$/],
  ["certifications", /^(certifications?|certificates?|licenses?( & certifications?)?|courses?( & certifications?)?|courses completed|training (&|and) certifications?|achievements? (&|and) certifications?)$/],
  ["other", /^(achievements?|awards?|honou?rs|interests?|hobbies|languages|references?|declaration|personal (details|information)|extra[- ]?curricular( activities)?|activities|strengths|volunteer(ing)?)$/],
]
const headingOf = (line: string): Section | null => {
  const t = line.trim().replace(/[:：\-–_|•*#]+$/g, "").replace(/^[•*#\-–\s]+/, "").trim().toLowerCase()
  if (!t || t.length > 40 || /[.,@]/.test(t)) return null
  for (const [s, re] of HEADINGS) if (re.test(t)) return s
  return null
}

const BULLET = /^\s*([•●○▪■◦▫➢➤*\-–—]|\d{1,2}[.)])\s+/
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const PHONE = /(?:\+?91[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}/
const URLISH = (host: string) => new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${host}\\.com\\/[A-Za-z0-9_\\-./%]+`, "i")
const DEGREE = /\b(b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|b\.?\s?com|b\.?\s?a\b|bca|bba|mca|m\.?\s?tech|m\.?\s?sc|m\.?\s?com|mba|b\.?\s?s\b|m\.?\s?s\b|bachelor|master|diploma|b\.?\s?voc|ph\.?d|post[- ]?graduate|intermediate|higher secondary|hsc|ssc|sslc|12th|10th|puc|pre[- ]?university|class (x|xii|10|12)|engineering|degree)\b/i
const SCHOOL = /\b(college|university|institute|school|academy|polytechnic|iit|nit|vidyalaya|campus)\b/i
const YEAR = /\b(?:19|20)\d{2}\b(?:\s*[-–to]+\s*(?:(?:19|20)\d{2}|present|ongoing))?/i
const SCORE = /(?:cgpa|gpa)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*\/\s*10)?|\b(\d{1,2}(?:\.\d{1,2})?\s*(?:%|\/\s?10|cgpa|gpa)|\d{2,3}(?:\.\d+)?\s*%)/i
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?"
const PERIOD = new RegExp(`(?:${MONTH}\\s*)?(?:19|20)\\d{2}\\s*(?:[-–—]|to)\\s*(?:(?:${MONTH}\\s*)?(?:(?:19|20)\\d{2})|present|current|ongoing|till date)|${MONTH}\\s*(?:19|20)\\d{2}`, "i")
const ROLEWORD = /\b(intern|trainee|developer|engineer|analyst|administrator|admin|support|associate|manager|executive|assistant|consultant|designer|tester|lead|officer|scientist|apprentice|programmer)\b/i
const CITY = /\b(bengaluru|bangalore|mumbai|pune|hyderabad|chennai|delhi|new delhi|gurgaon|gurugram|noida|kolkata|kochi|cochin|ahmedabad|coimbatore|mysuru|mysore|jaipur|indore|trivandrum|thiruvananthapuram|visakhapatnam|vizag|lucknow|chandigarh|nagpur)\b[^|\n]{0,25}/i

const clean = (s: string) => s.replace(/[ \t]+/g, " ").replace(/\s+/g, " ").trim()
const stripBullet = (s: string) => clean(s.replace(BULLET, ""))
const isBullet = (s: string) => BULLET.test(s)

export function parseResumeText(raw: string): ResumeProfile {
  const out = emptyProfile()
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/[ \t]+/g, " ").trimEnd()).filter((l) => l.trim())
  const text = lines.join("\n")

  // ---- contact details (anywhere, first hit) ----
  out.email = text.match(EMAIL)?.[0] ?? ""
  const withoutEmail = text.replace(EMAIL, " ")
  const ph = withoutEmail.split("\n").slice(0, 15).join("\n").match(PHONE)?.[0]
  out.phone = ph && ph.replace(/\D/g, "").length >= 10 ? clean(ph) : ""
  out.linkedin = text.match(URLISH("linkedin"))?.[0] ?? ""
  out.github = text.match(URLISH("github"))?.[0] ?? ""

  // ---- split into sections ----
  const sections: Record<Section, string[]> = { header: [], summary: [], skills: [], education: [], projects: [], experience: [], certifications: [], other: [] }
  let cur: Section = "header"
  for (const l of lines) { const h = headingOf(l); if (h) { cur = h; continue } sections[cur].push(l) }

  // ---- name + location from the header block ----
  for (const l of sections.header.slice(0, 8)) {
    const t = clean(l)
    if (!out.name && t.length <= 40 && /^[A-Za-z][A-Za-z .'-]+$/.test(t) && t.split(" ").length >= 2 && t.split(" ").length <= 4 && !headingOf(t)) out.name = t.replace(/\b([A-Za-z])([A-Za-z]*)\b/g, (_, a, b) => (b === b.toUpperCase() && b.length > 1 ? a + b.toLowerCase() : a + b)).replace(/^(\w)/, (c) => c.toUpperCase())
  }
  if (!out.name) { const f = clean(lines[0] ?? ""); if (f && f.length <= 40 && !EMAIL.test(f) && !/\d/.test(f)) out.name = f }
  out.location = clean(sections.header.slice(0, 10).join(" ").match(CITY)?.[0] ?? "").replace(/[,;|]+$/, "")

  // ---- summary ----
  out.summary = clean(sections.summary.map(stripBullet).join(" ")).slice(0, 600)

  // ---- skills ----
  const skillTokens: string[] = []
  for (const l of sections.skills) {
    const body = stripBullet(l).replace(/^[A-Za-z &/]{2,30}:\s*/, "") // drop labels such as "Languages:"
    for (const tok of body.split(/[,;|•●▪·]|\s{2,}|\s\/\s/)) { const t = clean(tok).replace(/[.]+$/, ""); if (t && t.length <= 40 && !/^(and|etc)$/i.test(t)) skillTokens.push(t) }
  }
  const seen = new Set<string>()
  out.skills = skillTokens.filter((s) => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 40)
  if (out.skills.length === 0) out.skills = [...skillsIn(text).keys()].slice(0, 25) // no skills section: use known skills found in the text

  // ---- education ----
  const edu: ResumeProfile["education"] = []
  type EduRow = ResumeProfile["education"][number]
  let e = null as EduRow | null
  const startEdu = () => { const row: EduRow = { degree: "", institution: "", year: "", score: "" }; edu.push(row); e = row }
  for (const l of sections.education) {
    const t = stripBullet(l)
    const hasDegree = DEGREE.test(t) && !SCHOOL.test(t.replace(DEGREE, ""))
    const hasDegreeLoose = DEGREE.test(t)
    const prev = e as EduRow | null
    if (!prev || (hasDegree && prev.degree) || (hasDegreeLoose && prev.degree && prev.institution)) startEdu()
    const cur2 = e as unknown as EduRow
    const yr = t.match(YEAR)?.[0]; if (yr && !cur2.year) cur2.year = clean(yr)
    const scm = t.match(SCORE); if (scm && !cur2.score) cur2.score = scm[1] ? `${scm[1]} CGPA` : clean(scm[2])
    const rest = clean(t.replace(YEAR, " ").replace(SCORE, " ").replace(/\b(cgpa|gpa|percentage|score|marks)\b\s*[:\-]?/gi, " ").replace(/[|•,–-]+\s*$/g, ""))
    if (!rest) continue
    if (SCHOOL.test(rest) && !cur2.institution) { if (hasDegreeLoose && !cur2.degree) { const parts = rest.split(/\s*[|,–-]\s*/); const di = parts.find((p) => DEGREE.test(p) && !SCHOOL.test(p)); cur2.degree = di ?? ""; cur2.institution = parts.filter((p) => p !== di).join(", ") } else cur2.institution = rest }
    else if (!cur2.degree && hasDegreeLoose) cur2.degree = rest
    else if (!cur2.institution) cur2.institution = rest
    else if (!cur2.degree) cur2.degree = rest
  }
  out.education = edu.filter((x) => x.degree || x.institution).slice(0, 5)
  if (out.education.length === 0) out.education = emptyProfile().education

  // ---- projects & experience: header line(s) then bullet points ----
  type Item = { head: string[]; points: string[]; tech: string }
  const groups = (ls: string[]): Item[] => {
    const items: Item[] = []; let it: Item | null = null
    for (const l of ls) {
      const t = stripBullet(l)
      if (isBullet(l) || (it && it.head.length > 0 && t.length > 90)) { if (!it) { it = { head: [], points: [], tech: "" }; items.push(it) } it.points.push(t); continue }
      const tech = t.match(/^(technolog(?:y|ies)(?: used)?|tech(?:nology)? stack|tools?(?: used)?|stack|built with|environment)\s*[:\-–]\s*(.+)$/i)
      if (tech && it) { it.tech = clean(tech[2]); continue }
      // a continuation of the previous bullet (wrapped line)
      if (it && it.points.length > 0 && /^[a-z(]/.test(t) && !PERIOD.test(t)) { it.points[it.points.length - 1] += " " + t; continue }
      if (!it || it.points.length > 0 || (it.head.length >= 2 && !PERIOD.test(t))) { it = { head: [], points: [], tech: "" }; items.push(it) }
      it.head.push(t)
    }
    return items.filter((x) => x.head.length || x.points.length)
  }
  out.projects = groups(sections.projects).slice(0, 6).map((g) => {
    let name = g.head[0] ?? "Project", tech = g.tech
    const split = name.split(/\s+[|–—]\s+|\s+-\s+|:\s+(?=[A-Z])/)
    if (split.length > 1 && !tech) { name = split[0]; tech = split.slice(1).join(", ") }
    if (!tech && g.head[1]) tech = g.head[1].replace(/^[^:]{0,20}:\s*/, "")
    return { name: clean(name), tech: clean(tech), points: g.points.slice(0, 6) }
  }).filter((p) => p.name)
  out.experience = groups(sections.experience).slice(0, 5).map((g) => {
    const headText = g.head.join(" | ")
    const period = clean(headText.match(PERIOD)?.[0] ?? "")
    const parts = clean(headText.replace(PERIOD, " ").replace(/[()]/g, " ")).split(/\s*(?:\|| at |@|,|\s[–—-]\s)\s*/i).map(clean).filter(Boolean)
    let role = parts[0] ?? "", company = parts.slice(1).join(", ")
    if (parts.length >= 2 && !ROLEWORD.test(role) && ROLEWORD.test(parts[1])) { role = parts[1]; company = [parts[0], ...parts.slice(2)].join(", ") }
    return { role, company, period, points: g.points.slice(0, 6) }
  }).filter((x) => x.role || x.company)

  // ---- certifications ----
  out.certifications = sections.certifications.map(stripBullet).filter((c) => c.length > 3 && c.length <= 140).slice(0, 12)
  return out
}

/** How much of a typical resume was recognised (0–1): used to tell the student to double-check the form. */
export const parseConfidence = (p: ResumeProfile) => [p.name, p.email, p.phone, p.skills.length > 0, p.education.some((e) => e.degree || e.institution), p.projects.length + p.experience.length > 0].filter(Boolean).length / 6
