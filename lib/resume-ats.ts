/**
 * ATS resume tailoring. Pure functions (no DOM, no network): given a student's resume profile and a job posting,
 * pick the job's keywords, work out which ones the student really has, reorder the resume so the relevant parts lead,
 * and score the result. It never invents skills: a keyword only appears in the resume if the student listed it,
 * used it in a project/experience entry, or ticked "I have this".
 */

export type Edu = { degree: string; institution: string; year: string; score: string }
export type Proj = { name: string; tech: string; points: string[] }
export type Exp = { role: string; company: string; period: string; points: string[] }
export type ResumeProfile = {
  name: string; email: string; phone: string; location: string; linkedin: string; github: string
  summary: string; skills: string[]; education: Edu[]; projects: Proj[]; experience: Exp[]; certifications: string[]
}
export type JobInfo = { title: string; company: string; description: string; requirements?: string }

export const emptyProfile = (): ResumeProfile => ({ name: "", email: "", phone: "", location: "", linkedin: "", github: "", summary: "", skills: [], education: [{ degree: "", institution: "", year: "", score: "" }], projects: [], experience: [], certifications: [] })

// canonical skill -> aliases (all lower case). Multi-word terms are matched as phrases.
const SKILLS: Record<string, string[]> = {
  "Python": ["python", "python3"], "Django": ["django"], "Flask": ["flask"], "FastAPI": ["fastapi"], "JavaScript": ["javascript", "js", "es6"], "TypeScript": ["typescript"],
  "React": ["react", "reactjs", "react.js"], "Node.js": ["node.js", "nodejs", "node js"], "Express": ["express.js", "expressjs"], "Angular": ["angular"], "Vue": ["vue", "vue.js"],
  "HTML": ["html", "html5"], "CSS": ["css", "css3"], "Bootstrap": ["bootstrap"], "Tailwind CSS": ["tailwind", "tailwind css"], "Java": ["java"], "Spring Boot": ["spring boot", "springboot"],
  "C++": ["c++"], "C#": ["c#"], "SQL": ["sql"], "MySQL": ["mysql"], "PostgreSQL": ["postgresql", "postgres"], "MongoDB": ["mongodb", "mongo"], "Firebase": ["firebase"], "Redis": ["redis"],
  "REST APIs": ["rest api", "rest apis", "restful", "restful api", "restful apis"], "GraphQL": ["graphql"], "Git": ["git"], "GitHub": ["github"], "Docker": ["docker"], "Kubernetes": ["kubernetes", "k8s"],
  "AWS": ["aws", "amazon web services"], "Azure": ["azure", "microsoft azure"], "GCP": ["gcp", "google cloud"], "Linux": ["linux", "ubuntu", "red hat", "rhel", "centos"], "Bash": ["bash", "shell scripting", "shell script"],
  "Networking": ["networking", "tcp/ip", "dns", "dhcp", "vpn", "firewall", "load balancer"], "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment"],
  "Jenkins": ["jenkins"], "Terraform": ["terraform"], "Ansible": ["ansible"], "DevOps": ["devops"], "Monitoring": ["prometheus", "grafana", "nagios", "cloudwatch"],
  "Machine Learning": ["machine learning", "ml"], "Deep Learning": ["deep learning"], "NLP": ["nlp", "natural language processing"], "Generative AI": ["generative ai", "genai", "gen ai", "llm", "llms", "large language models"],
  "TensorFlow": ["tensorflow"], "PyTorch": ["pytorch"], "Scikit-learn": ["scikit-learn", "sklearn", "scikit learn"], "Pandas": ["pandas"], "NumPy": ["numpy"], "OpenCV": ["opencv", "computer vision"],
  "Power BI": ["power bi", "powerbi"], "Tableau": ["tableau"], "Excel": ["advanced excel", "ms excel", "microsoft excel"], "Data Visualization": ["data visualization", "data visualisation", "dashboards", "dashboard"],
  "Data Analysis": ["data analysis", "data analytics", "analytics", "data analyst"], "Statistics": ["statistics", "statistical analysis"], "ETL": ["etl", "data pipelines", "data pipeline"], "Spark": ["spark", "pyspark"],
  "Data Structures": ["data structures", "algorithms", "dsa"], "OOP": ["oop", "object oriented", "object-oriented"], "Agile": ["agile", "scrum"], "Troubleshooting": ["troubleshooting", "incident management"],
  "Technical Support": ["technical support", "customer support", "ticketing", "service desk"], "Windows Server": ["windows server", "active directory"], "Virtualization": ["virtualization", "vmware", "virtualbox", "hyper-v"],
  "System Administration": ["system administration", "sysadmin", "system administrator", "server administration"], "Cloud Computing": ["cloud computing", "cloud"], "Serverless": ["lambda", "serverless"],
  "EC2": ["ec2"], "S3": ["s3"], "IAM": ["iam"], "VPC": ["vpc"], "Microservices": ["microservices", "microservice"], "Testing": ["unit testing", "software testing", "pytest", "jest", "selenium", "test automation"],
  "Communication": ["communication skills"], "Problem Solving": ["problem solving", "problem-solving"],
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
const ALIAS = new Map<string, string>()
// plain English words that are also skill names are only matched through their explicit aliases
const AMBIGUOUS = new Set(["Express", "Excel", "Communication", "Monitoring", "Testing", "Troubleshooting", "Problem Solving"])
for (const [canon, al] of Object.entries(SKILLS)) for (const a of [...(AMBIGUOUS.has(canon) ? [] : [canon.toLowerCase()]), ...al]) ALIAS.set(a, canon)
// longest alias first so "spring boot" wins over "spring"
const ALIAS_RES = [...ALIAS.keys()].sort((a, b) => b.length - a.length).map((a) => ({ a, re: new RegExp(`(?<![a-z0-9+#.])${esc(a)}(?![a-z0-9+#])`, "i") }))

/** Skills found in free text, as canonical names with how many times each appears. */
export function skillsIn(text: string): Map<string, number> {
  const out = new Map<string, number>()
  let rest = ` ${text.toLowerCase()} `
  for (const { a } of ALIAS_RES) {
    const re = new RegExp(`(?<![a-z0-9+#.])${esc(a)}(?![a-z0-9+#])`, "gi")
    const m = rest.match(re)
    if (m) { const c = ALIAS.get(a)!; out.set(c, (out.get(c) ?? 0) + m.length); rest = rest.replace(re, " ") }
  }
  return out
}

export const canon = (s: string) => ALIAS.get(s.trim().toLowerCase()) ?? s.trim()

export type Family = "fullstack" | "data" | "ai" | "cloud" | "linux" | "devops" | "support" | "general"
/** "Python Full Stack Developer (Fresher) - Bangalore" -> "Python Full Stack Developer" */
export const roleName = (title: string) => title.replace(/\(.*?\)|\[.*?\]/g, " ").replace(/\s[-–|,@].*$/, "").replace(/\s+/g, " ").trim() || title.trim()

export function roleFamily(title: string): Family {
  const t = title.toLowerCase()
  if (/full[ -]?stack|web developer|mern|mean|frontend|front-end|backend|back-end|python developer|software (developer|engineer)/.test(t)) return "fullstack"
  if (/\b(ai|ml|machine learning|data scien|genai|nlp)\b/.test(t)) return "ai"
  if (/data (analy|engineer)|business analyst|bi developer|analytics/.test(t)) return "data"
  if (/devops|sre|site reliability/.test(t)) return "devops"
  if (/cloud support|support engineer|technical support|service desk|helpdesk/.test(t)) return "support"
  if (/cloud|aws|azure/.test(t)) return "cloud"
  if (/linux|system admin|sysadmin|server admin|infrastructure/.test(t)) return "linux"
  return "general"
}

export type Keyword = { word: string; weight: number }
/** The job's keywords, most important first. Title mentions count most, then requirements, then the description. */
export function jobKeywords(job: JobInfo, limit = 16): Keyword[] {
  const w = new Map<string, number>()
  const add = (text: string, mult: number) => { for (const [k, c] of skillsIn(text)) w.set(k, (w.get(k) ?? 0) + Math.min(c, 3) * mult) }
  add(job.title, 5); add(job.requirements ?? "", 3); add(job.description, 1)
  return [...w.entries()].map(([word, weight]) => ({ word, weight })).sort((a, b) => b.weight - a.weight || a.word.localeCompare(b.word)).slice(0, limit)
}

const textOfProj = (p: Proj) => `${p.name} ${p.tech} ${p.points.join(" ")}`
const textOfExp = (e: Exp) => `${e.role} ${e.company} ${e.points.join(" ")}`
const score = (text: string, kws: Set<string>) => { let n = 0; for (const k of skillsIn(text).keys()) if (kws.has(k)) n++; return n }
const clean = (a: string[]) => a.map((x) => x.trim()).filter(Boolean)

export type Tailored = {
  resume: ResumeProfile & { headline: string }
  keywords: Keyword[]; matched: string[]; missing: string[]
  ats: { score: number; keyword_score: number; structure_score: number; tips: string[] }
}

/** extra = keywords the student confirmed they have (ticked "I have this") — they are added to the skills list. */
export function tailorResume(profile: ResumeProfile, job: JobInfo, extra: string[] = []): Tailored {
  const keywords = jobKeywords(job)
  const kwSet = new Set(keywords.map((k) => k.word))
  const projects = profile.projects.filter((p) => p.name.trim()).map((p) => ({ ...p, points: clean(p.points) }))
  const experience = profile.experience.filter((e) => e.role.trim() || e.company.trim()).map((e) => ({ ...e, points: clean(e.points) }))

  // evidence = skills the student listed + skills visible in their projects / experience + ticked extras
  const listed = new Map<string, string>() // canonical -> display
  for (const s of [...clean(profile.skills), ...clean(extra)]) listed.set(canon(s), canon(s) === s.trim() || ALIAS.has(s.trim().toLowerCase()) ? canon(s) : s.trim())
  const shown = new Set(listed.keys())
  const evidence = new Set(shown)
  for (const p of projects) for (const k of skillsIn(textOfProj(p)).keys()) evidence.add(k)
  for (const e of experience) for (const k of skillsIn(textOfExp(e)).keys()) evidence.add(k)
  for (const k of skillsIn(profile.summary).keys()) evidence.add(k)

  const matched = keywords.filter((k) => evidence.has(k.word)).map((k) => k.word)
  const missing = keywords.filter((k) => !evidence.has(k.word)).map((k) => k.word)

  // skills: the job's matching keywords first (in the job's order), then everything else the student listed
  const skills: string[] = []
  const seen = new Set<string>()
  for (const k of matched) if (!seen.has(k)) { seen.add(k); skills.push(k) }
  for (const [c, display] of listed) if (!seen.has(c)) { seen.add(c); skills.push(display) }

  const byRelevance = <T,>(items: T[], text: (t: T) => string) => items.map((it, i) => ({ it, i, s: score(text(it), kwSet) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.it)
  const pts = (points: string[]) => byRelevance(points, (p) => p).slice(0, 4)
  const projOut = byRelevance(projects, textOfProj).slice(0, 4).map((p) => ({ ...p, points: pts(p.points) }))
  const expOut = byRelevance(experience, textOfExp).slice(0, 4).map((e) => ({ ...e, points: pts(e.points) }))

  // summary: a line aimed at this role + the student's own words
  const top = matched.slice(0, 4)
  const topText = top.length ? top.slice(0, -1).join(", ") + (top.length > 1 ? " and " : "") + top[top.length - 1] : "core technical skills"
  const role = roleName(job.title)
  const fam = roleFamily(job.title)
  const focus: Record<Family, string> = { fullstack: "building and shipping complete web applications", data: "turning raw data into clear, decision-ready insights", ai: "building and evaluating practical machine learning solutions", cloud: "designing, deploying and securing cloud infrastructure", linux: "administering and troubleshooting Linux servers", devops: "automating builds, deployments and infrastructure", support: "resolving technical issues quickly and communicating clearly with users", general: "delivering quality work in a team" }
  const lead = expOut.length
    ? `${role} candidate with experience as ${expOut[0].role || "a professional"}${expOut[0].company ? ` at ${expOut[0].company}` : ""}, skilled in ${topText}, with a focus on ${focus[fam]}.`
    : `Motivated ${role} candidate with hands-on training and project experience in ${topText}, focused on ${focus[fam]}. Eager to contribute to ${job.company || "your team"} and grow in a real-world role.`
  const own = profile.summary.trim()
  const summary = (own && !own.toLowerCase().includes(role.toLowerCase()) ? `${lead} ${own}` : own || lead).slice(0, 520)

  const resume = { ...profile, headline: role, summary, skills, projects: projOut, experience: expOut, certifications: clean(profile.certifications), education: profile.education.filter((e) => e.degree.trim() || e.institution.trim()) }

  // ATS score = keyword coverage (60) + structure (40)
  const total = keywords.reduce((n, k) => n + k.weight, 0)
  const got = keywords.filter((k) => evidence.has(k.word)).reduce((n, k) => n + k.weight, 0)
  const keyword_score = total ? Math.round((got / total) * 60) : 30
  const tips: string[] = []
  let structure = 0
  const chk = (ok: boolean, pts: number, tip: string) => { if (ok) structure += pts; else tips.push(tip) }
  chk(Boolean(profile.name.trim()) && /\S+@\S+\.\S+/.test(profile.email) && profile.phone.replace(/\D/g, "").length >= 10, 8, "Add your name, a valid email and a 10-digit phone number.")
  chk(skills.length >= 6, 8, "List at least 6 skills.")
  chk(resume.education.length > 0, 8, "Add your education.")
  chk(projOut.length + expOut.length > 0, 8, "Add at least one project or work experience entry.")
  chk(projOut.concat(expOut as any).some((x: any) => x.points.length >= 2), 4, "Give each project or job 2–4 bullet points that say what you built and the result.")
  chk(Boolean(profile.linkedin.trim() || profile.github.trim()), 4, "Add your GitHub or LinkedIn link.")
  if (missing.length) tips.push(`Skills this job asks for that your resume doesn't show: ${missing.slice(0, 6).join(", ")}. Add only the ones you truly have.`)
  return { resume, keywords, matched, missing, ats: { score: keyword_score + structure, keyword_score, structure_score: structure, tips } }
}
