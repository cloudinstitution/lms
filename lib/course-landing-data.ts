// Career and salary content shown on each course's detail page. Salary figures are INDICATIVE ranges (LPA = lakhs per annum)
// and vary with skills, city, company and experience. Edit freely.
export interface CareerRole { title: string; salary: string; blurb: string; skills: string[] }
export interface CareerStage { stage: string; role: string; salary: string; height: number }
export interface LandingData { headline: string; roles: CareerRole[]; stages: CareerStage[]; projects: string[] }

const stagesOf = (rows: [string, string, string][]): CareerStage[] => rows.map(([stage, role, salary], i) => ({ stage, role, salary, height: 28 + i * 18 }))

const WEB: LandingData = {
  headline: "What career options can this course open up?",
  roles: [
    { title: "Full Stack Developer", salary: "₹4–14 LPA", blurb: "Build complete web applications, from the user interface to APIs and databases. One of the most hired roles in product companies and startups.", skills: ["Frontend", "REST APIs", "Databases", "Git"] },
    { title: "Backend Developer", salary: "₹4–16 LPA", blurb: "Design secure, fast server-side services, business logic and integrations that power web and mobile apps.", skills: ["APIs", "Security", "SQL", "Testing"] },
    { title: "Frontend / React Developer", salary: "₹3.5–12 LPA", blurb: "Create responsive, accessible interfaces with modern component frameworks and state management.", skills: ["React", "HTML/CSS", "JavaScript", "UI"] },
    { title: "Software Engineer", salary: "₹4–18 LPA", blurb: "Join product and service teams building, testing and shipping features end to end.", skills: ["OOP", "Data structures", "Design", "Debugging"] },
    { title: "API / Integration Developer", salary: "₹4–14 LPA", blurb: "Connect systems through well-designed, documented APIs and third-party integrations.", skills: ["REST", "Auth", "Postman", "Docs"] },
    { title: "Technical Lead", salary: "₹15–35 LPA+", blurb: "With experience, lead a team, own architecture decisions and mentor other developers.", skills: ["Architecture", "Reviews", "Mentoring", "Delivery"] },
  ],
  stages: stagesOf([["Stage 01", "Fresher", "₹3–5 LPA"], ["Stage 02", "Junior Developer", "₹5–8 LPA"], ["Stage 03", "Full Stack Developer", "₹8–14 LPA"], ["Stage 04", "Senior Developer", "₹14–25 LPA"], ["Stage 05", "Tech Lead / Architect", "₹25–40 LPA"]]),
  projects: ["Full stack e-commerce application", "Role-based admin dashboard with authentication", "REST API with database and automated tests", "Deployed capstone project with CI/CD"],
}

const CLOUD: LandingData = {
  headline: "What career options can cloud skills open up?",
  roles: [
    { title: "Cloud Engineer", salary: "₹5–18 LPA", blurb: "Design, deploy and operate infrastructure and applications on public cloud platforms.", skills: ["Compute", "Networking", "Storage", "IAM"] },
    { title: "Cloud Solutions Architect", salary: "₹15–40 LPA", blurb: "Translate business needs into secure, scalable and cost-aware cloud architectures.", skills: ["Architecture", "Cost", "Security", "Migration"] },
    { title: "Cloud Administrator", salary: "₹4–12 LPA", blurb: "Manage accounts, monitoring, backups and day-to-day operations of cloud environments.", skills: ["Monitoring", "Backups", "Users", "Policies"] },
    { title: "Cloud Security Engineer", salary: "₹8–28 LPA", blurb: "Protect cloud workloads with identity controls, encryption, logging and compliance practices.", skills: ["IAM", "Encryption", "Audit", "Compliance"] },
    { title: "Site Reliability Engineer", salary: "₹10–30 LPA", blurb: "Keep services reliable and fast using automation, observability and incident response.", skills: ["Automation", "Observability", "Scripting", "SLOs"] },
    { title: "Cloud Consultant", salary: "₹12–35 LPA", blurb: "Advise companies on moving to the cloud and getting more value from it.", skills: ["Assessment", "Roadmaps", "Pricing", "Delivery"] },
  ],
  stages: stagesOf([["Stage 01", "Fresher / Trainee", "₹3–5 LPA"], ["Stage 02", "Cloud Support Engineer", "₹5–8 LPA"], ["Stage 03", "Cloud Engineer", "₹8–16 LPA"], ["Stage 04", "Senior Cloud Engineer", "₹16–28 LPA"], ["Stage 05", "Cloud Architect", "₹28–45 LPA"]]),
  projects: ["Highly available web application deployment", "Secure network and identity design", "Serverless application with managed database", "Cost-optimised, monitored production setup"],
}

const DEVOPS: LandingData = {
  headline: "What career options can DevOps skills open up?",
  roles: [
    { title: "DevOps Engineer", salary: "₹5–20 LPA", blurb: "Automate build, test and release pipelines so teams ship faster and more safely.", skills: ["CI/CD", "Docker", "Linux", "Git"] },
    { title: "Site Reliability Engineer", salary: "₹10–30 LPA", blurb: "Run reliable, observable services and respond to incidents with engineering rigor.", skills: ["Monitoring", "Automation", "Kubernetes", "Scripting"] },
    { title: "Platform Engineer", salary: "₹12–32 LPA", blurb: "Build the internal platforms and tooling that make developers productive.", skills: ["Kubernetes", "IaC", "Cloud", "Self-service"] },
    { title: "Build & Release Engineer", salary: "₹4–14 LPA", blurb: "Own versioning, builds and deployments across environments.", skills: ["Pipelines", "Artifacts", "Releases", "Scripting"] },
    { title: "DevSecOps Engineer", salary: "₹10–28 LPA", blurb: "Bake security checks into every stage of the delivery pipeline.", skills: ["Scanning", "Secrets", "Policies", "CI/CD"] },
    { title: "Infrastructure Engineer", salary: "₹6–22 LPA", blurb: "Provision and manage infrastructure as code across cloud and on-premise.", skills: ["Terraform", "Ansible", "Networking", "Linux"] },
  ],
  stages: stagesOf([["Stage 01", "Fresher / Trainee", "₹3–5 LPA"], ["Stage 02", "Junior DevOps Engineer", "₹5–9 LPA"], ["Stage 03", "DevOps Engineer", "₹9–18 LPA"], ["Stage 04", "Senior DevOps / SRE", "₹18–30 LPA"], ["Stage 05", "Platform Lead / Architect", "₹30–45 LPA"]]),
  projects: ["CI/CD pipeline from commit to production", "Containerised application on Kubernetes", "Infrastructure as code for a full environment", "Monitoring and alerting dashboard"],
}

const DESIGN: LandingData = {
  headline: "What career options can UI/UX design open up?",
  roles: [
    { title: "UI/UX Designer", salary: "₹3.5–15 LPA", blurb: "Research users, design flows and craft interfaces people enjoy using.", skills: ["Wireframes", "Prototyping", "Figma", "Research"] },
    { title: "Product Designer", salary: "₹8–28 LPA", blurb: "Own the end-to-end design of a product, from problem framing to polished experience.", skills: ["Product thinking", "Systems", "Testing", "Strategy"] },
    { title: "UX Researcher", salary: "₹5–20 LPA", blurb: "Study user behaviour with interviews and usability tests to guide product decisions.", skills: ["Interviews", "Surveys", "Analysis", "Synthesis"] },
    { title: "Visual / Interaction Designer", salary: "₹3–12 LPA", blurb: "Shape the look, motion and feel of digital interfaces.", skills: ["Typography", "Colour", "Motion", "Layout"] },
    { title: "Design System Designer", salary: "₹8–25 LPA", blurb: "Create consistent component libraries and guidelines used across products.", skills: ["Components", "Tokens", "Docs", "Accessibility"] },
    { title: "Design Lead", salary: "₹20–45 LPA+", blurb: "Lead a design team, set quality standards and partner with product and engineering.", skills: ["Leadership", "Critique", "Roadmaps", "Hiring"] },
  ],
  stages: stagesOf([["Stage 01", "Fresher / Intern", "₹2.5–4 LPA"], ["Stage 02", "Junior Designer", "₹4–7 LPA"], ["Stage 03", "UI/UX Designer", "₹7–14 LPA"], ["Stage 04", "Senior Designer", "₹14–25 LPA"], ["Stage 05", "Design Lead", "₹25–45 LPA"]]),
  projects: ["Mobile app design from research to prototype", "Website redesign with usability testing", "Design system with reusable components", "Portfolio case study"],
}

const DATA: LandingData = {
  headline: "What career options can data analytics open up?",
  roles: [
    { title: "Data Analyst", salary: "₹3.5–12 LPA", blurb: "Turn raw data into insight with SQL, spreadsheets and dashboards that teams act on.", skills: ["SQL", "Excel", "Dashboards", "Statistics"] },
    { title: "Business Analyst", salary: "₹4–15 LPA", blurb: "Bridge business questions and data, defining metrics and recommending decisions.", skills: ["Requirements", "KPIs", "Reporting", "Stakeholders"] },
    { title: "BI Developer", salary: "₹5–18 LPA", blurb: "Build reliable data models and interactive reports for the whole organisation.", skills: ["Power BI", "Modeling", "ETL", "SQL"] },
    { title: "Data Engineer", salary: "₹8–28 LPA", blurb: "Build the pipelines and warehouses that deliver clean, trusted data.", skills: ["Pipelines", "Warehouses", "Python", "Cloud"] },
    { title: "Analytics Consultant", salary: "₹8–25 LPA", blurb: "Help clients solve problems with data across industries.", skills: ["Analysis", "Storytelling", "Tools", "Delivery"] },
    { title: "Analytics Manager", salary: "₹20–40 LPA+", blurb: "Lead analytics teams and shape how the company uses data.", skills: ["Strategy", "Leadership", "Governance", "Planning"] },
  ],
  stages: stagesOf([["Stage 01", "Fresher / Trainee", "₹3–4.5 LPA"], ["Stage 02", "Junior Data Analyst", "₹4.5–7 LPA"], ["Stage 03", "Data Analyst", "₹7–12 LPA"], ["Stage 04", "Senior Analyst", "₹12–22 LPA"], ["Stage 05", "Analytics Lead", "₹22–40 LPA"]]),
  projects: ["Sales dashboard with live filters", "SQL analysis of a real-world dataset", "End-to-end reporting pipeline", "Business case study with recommendations"],
}

export function landingFor(category: string): LandingData {
  if (/cloud/i.test(category)) return CLOUD
  if (/devops/i.test(category)) return DEVOPS
  if (/design/i.test(category)) return DESIGN
  if (/data/i.test(category)) return DATA
  return WEB
}

export const WHO_CAN_LEARN = ["Tech Professionals", "Career Switchers", "Job Aspirants", "Non-Tech Professionals", "Skill Upgraders", "Students & Freshers"]
