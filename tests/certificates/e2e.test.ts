/**
 * End-to-end tests: real route handlers + real services + real PDF/QR rendering,
 * running against in-memory Firestore/Storage fakes (see fake-backends.ts).
 * Run:  npm run test:certificates
 */
import { test, before, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import * as nextServer from "next/server"
const NextRequest: any = (nextServer as any).NextRequest
import jsQR from "jsqr"
import { PNG } from "pngjs"
import { FakeBucket, FakeDb } from "./fake-backends"

process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-123456"
process.env.NEXT_PUBLIC_SITE_URL = "https://lms.cloudinstitution.test"
const ORIGIN = "https://lms.cloudinstitution.test"

let db: FakeDb
let bucket: FakeBucket

// Route modules (imported after env is set)
let R: Record<string, any>
before(async () => {
  const imp = (p: string) => import(`../../app/api/${p}/route`)
  R = {
    resume: await imp("session/resume"), login: await imp("session/login"), logout: await imp("session/logout"), me: await imp("session/me"),
    courses: await imp("student/courses"), uploadUrls: await imp("projects/upload-urls"), submit: await imp("projects/submit"),
    myProjects: await imp("student/projects"), myFile: await imp("student/projects/[id]/files/[fileId]"),
    notifs: await imp("student/notifications"), notifRead: await imp("student/notifications/[id]/read"),
    myCerts: await imp("student/certificates"), myCert: await imp("student/certificates/[certificateId]"),
    myCertPdf: await imp("student/certificates/[certificateId]/download"), myCertQr: await imp("student/certificates/[certificateId]/qr"),
    verify: await imp("certificate/verify/[key]"), verifyPdf: await imp("certificate/verify/[key]/download"),
    aProjects: await imp("admin/projects"), aProject: await imp("admin/projects/[id]"), aFile: await imp("admin/projects/[id]/files/[fileId]"),
    accept: await imp("admin/projects/[id]/accept"), reject: await imp("admin/projects/[id]/reject"), resubmit: await imp("admin/projects/[id]/resubmit"),
    aCerts: await imp("admin/certificates"), aCertPdf: await imp("admin/certificates/[certificateId]/download"),
    revoke: await imp("admin/certificates/[certificateId]/revoke"), reactivate: await imp("admin/certificates/[certificateId]/reactivate"),
  }
})

beforeEach(() => {
  db = new FakeDb()
  bucket = new FakeBucket()
  ;(globalThis as any).__LMS_BACKENDS__ = { db, bucket }
  delete process.env.CERT_PUBLIC_DOWNLOAD
  delete process.env.CERT_VERIFY_TOKEN_ONLY
  db.seed("students", "docJohn", { studentId: "CI2026001", name: "John Doe", username: "john@x.com", password: "pw-john", courseID: [1, 2], courseName: ["AWS Cloud Practitioner", "DevOps"], status: "Active" })
  db.seed("students", "docPriya", { studentId: "CI2026002", name: "Priya Nair", username: "priya@x.com", password: "pw-priya", courseID: [1], courseName: ["AWS Cloud Practitioner"], status: "Active" })
  db.seed("students", "docGone", { studentId: "CI2026003", name: "Inactive Ian", username: "ian@x.com", password: "pw-ian", courseID: [1], courseName: ["AWS Cloud Practitioner"], status: "Inactive" })
  db.seed("project_tasks", "t1", { course_id: 1, course_name: "AWS Cloud Practitioner", title: "Serverless Image Pipeline", description: "Build it", category: "Cloud", due_date: null, resource_url: null, active: true, created_by_name: "Asha Admin", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" })
  db.seed("project_tasks", "t2", { course_id: 2, course_name: "DevOps", title: "CI/CD Pipeline", description: "Build it", category: "DevOps", due_date: null, resource_url: null, active: true, created_by_name: "Asha Admin", created_at: "2026-01-02T00:00:00.000Z", updated_at: "2026-01-02T00:00:00.000Z" })
  db.seed("admin", "docAdmin", { name: "Asha Admin", username: "admin@x.com", password: "pw-admin", roleId: 1 })
  db.seed("admin", "docTeacher", { name: "Tom Teacher", username: "teacher@x.com", password: "pw-teacher", roleId: 2 })
  // reset rate limiter state by varying IP per test
  ipCounter++
})

let ipCounter = 0
type Init = { method?: string; cookie?: string; body?: unknown; origin?: string | null; ip?: string }
function mk(url: string, init: Init = {}) {
  const headers: Record<string, string> = { host: new URL(ORIGIN).host, "x-forwarded-for": init.ip ?? `10.0.${ipCounter % 250}.${(ipCounter >> 8) + 1}` }
  if (init.cookie) headers.cookie = init.cookie
  if (init.origin !== null && init.method && init.method !== "GET") headers.origin = init.origin ?? ORIGIN
  if (init.body !== undefined) headers["content-type"] = "application/json"
  return new NextRequest(new URL(url, ORIGIN), { method: init.method ?? "GET", headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined })
}
const call = async (mod: any, method: string, url: string, init: Init = {}, params?: Record<string, string>) =>
  mod[method](mk(url, { ...init, method }), { params: Promise.resolve(params ?? {}) }) as Promise<Response>
const json = async (r: Response) => ({ status: r.status, body: await r.json() as any })

async function login(username: string, password: string): Promise<string> {
  const res = await call(R.login, "POST", "/api/session/login", { body: { username, password }, ip: `192.168.${ipCounter % 250}.${Math.floor(Math.random() * 200)}` })
  assert.equal(res.status, 200, "login should succeed")
  const sc = res.headers.get("set-cookie")!
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/)
  return sc.split(";")[0]
}
const tok = (cert: any): string => String(cert.verify_url).split("/").pop()!
const john = () => login("john@x.com", "pw-john")
const priya = () => login("priya@x.com", "pw-priya")
const admin = () => login("admin@x.com", "pw-admin")
const teacher = () => login("teacher@x.com", "pw-teacher")

/** Full two-step upload flow; returns the created project view. */
async function submitFlow(cookie: string, over: Record<string, unknown> = {}, studentDocId = "docJohn") {
  const up = await json(await call(R.uploadUrls, "POST", "/api/projects/upload-urls", {
    cookie, body: { files: [{ name: "report.pdf", size: 1234, type: "application/pdf", kind: "project" }, { name: "data.csv", size: 99, type: "text/csv", kind: "supporting" }] },
  }))
  assert.equal(up.status, 200, JSON.stringify(up.body))
  for (const s of up.body.slots) bucket.put(s.path, 500, s.content_type)
  const res = await json(await call(R.submit, "POST", "/api/projects/submit", {
    cookie,
    body: {
      task_id: "t1", project_description: "Lambda + S3 pipeline",
      files: up.body.slots.map((s: any) => ({ path: s.path, kind: s.kind })), ...over,
    },
  }))
  return res
}
const acceptIt = async (adminCookie: string, id: string, body: unknown = {}) => json(await call(R.accept, "PUT", `/api/admin/projects/${id}/accept`, { cookie: adminCookie, body }, { id }))
const submitAndAccept = async (cookie?: string) => {
  const c = cookie ?? (await john())
  const s = await submitFlow(c); assert.equal(s.status, 201, JSON.stringify(s.body))
  const a = await admin()
  const r = await acceptIt(a, s.body.project.id); assert.equal(r.status, 200, JSON.stringify(r.body))
  return { c, a, project: s.body.project, cert: r.body.certificate, res: r }
}

/* ------------------------------ session ------------------------------ */
test("session: login, me, logout, bad credentials, inactive, demoted", async () => {
  assert.equal((await call(R.login, "POST", "/api/session/login", { body: { username: "john@x.com", password: "nope" }, ip: "1.1.1.1" })).status, 401)
  assert.equal((await call(R.login, "POST", "/api/session/login", { body: { username: "ian@x.com", password: "pw-ian" }, ip: "1.1.1.2" })).status, 401)
  assert.equal((await call(R.login, "POST", "/api/session/login", { body: { username: "john@x.com" }, ip: "1.1.1.3" })).status, 400)
  const c = await john()
  const me = await json(await call(R.me, "GET", "/api/session/me", { cookie: c }))
  assert.equal(me.status, 200); assert.equal(me.body.user?.role ?? me.body.role, "student")
  assert.equal((await call(R.me, "GET", "/api/session/me")).status, 401)
  // tampered cookie
  assert.equal((await call(R.me, "GET", "/api/session/me", { cookie: c.slice(0, -3) + "abc" })).status, 401)
  // deactivated student loses access immediately
  db.seed("students", "docJohn", { ...db.get("students", "docJohn")!, status: "Inactive" })
  assert.equal((await call(R.courses, "GET", "/api/student/courses", { cookie: c })).status, 401)
  // demoted admin loses admin access immediately
  const a = await admin()
  assert.equal((await call(R.aCerts, "GET", "/api/admin/certificates", { cookie: a })).status, 200)
  db.seed("admin", "docAdmin", { ...db.get("admin", "docAdmin")!, roleId: 2 })
  assert.equal((await call(R.aCerts, "GET", "/api/admin/certificates", { cookie: a })).status, 401)
  const lo = await call(R.logout, "POST", "/api/session/logout", { cookie: c })
  assert.match(lo.headers.get("set-cookie") ?? "", /Max-Age=0/)
})

test("session resume: already-logged-in LMS user gets a session without a password", async () => {
  const r = await call(R.resume, "POST", "/api/session/resume", { body: { kind: "student", id: "docPriya" }, ip: "7.7.7.1" })
  assert.equal(r.status, 200)
  const c = r.headers.get("set-cookie")!.split(";")[0]
  const courses = await json(await call(R.courses, "GET", "/api/student/courses", { cookie: c }))
  assert.equal(courses.status, 200); assert.ok(courses.body.courses.length >= 1)
  assert.equal((await call(R.resume, "POST", "/api/session/resume", { body: { kind: "student", id: "nope" }, ip: "7.7.7.2" })).status, 401)
  assert.equal((await call(R.resume, "POST", "/api/session/resume", { body: { kind: "student", id: "docGone" }, ip: "7.7.7.3" })).status, 401)
  assert.equal((await call(R.resume, "POST", "/api/session/resume", { body: { kind: "staff", id: "docPriya" }, ip: "7.7.7.4" })).status, 401)
  const a = await call(R.resume, "POST", "/api/session/resume", { body: { kind: "staff", id: "docAdmin" }, ip: "7.7.7.5" })
  assert.equal(a.status, 200)
})

test("assigned projects: admin creates per course, students see only their course, validation, delete hides when used", async () => {
  const T = { tasks: await import("../../app/api/admin/project-tasks/route"), task: await import("../../app/api/admin/project-tasks/[id]/route"), mine: await import("../../app/api/student/project-tasks/route") }
  db.seed("courses", "c1", { title: "Data Science", courseID: 5 })
  const a = await admin(), j = await john(), p = await priya()
  const body = { course_id: 5, course_name: "Data Science", title: "Churn Model", description: "Predict churn", category: "ML", due_date: "2026-12-31", resource_url: "https://example.com/brief" }
  assert.equal((await call(T.tasks, "POST", "/api/admin/project-tasks", { cookie: j, body })).status, 403) // students cannot assign
  assert.equal((await call(T.tasks, "POST", "/api/admin/project-tasks", { cookie: a, body: { ...body, title: " " } })).status, 400)
  assert.equal((await call(T.tasks, "POST", "/api/admin/project-tasks", { cookie: a, body: { ...body, resource_url: "javascript:alert(1)" } })).status, 400)
  const made = await json(await call(T.tasks, "POST", "/api/admin/project-tasks", { cookie: a, body }))
  assert.equal(made.status, 201)
  const adminList = await json(await call(T.tasks, "GET", "/api/admin/project-tasks", { cookie: a }))
  assert.ok(adminList.body.tasks.length >= 3); assert.ok(adminList.body.courses.some((c: any) => c.name === "Data Science"))
  const mineJ = await json(await call(T.mine, "GET", "/api/student/project-tasks", { cookie: j }))
  assert.deepEqual(mineJ.body.tasks.map((t: any) => t.id).sort(), ["t1", "t2"]) // John: AWS + DevOps, not Data Science
  const mineP = await json(await call(T.mine, "GET", "/api/student/project-tasks", { cookie: p }))
  assert.deepEqual(mineP.body.tasks.map((t: any) => t.id), ["t1"])
  // submitting a task of another course is refused; a missing task id too
  assert.equal((await submitFlow(p, { task_id: "t2" }, "docPriya")).status, 403)
  assert.equal((await submitFlow(p, { task_id: undefined }, "docPriya")).status, 400)
  // hidden tasks disappear for students; deleting a task with submissions only hides it
  const id = made.body.task.id
  await call(T.task, "PUT", `/api/admin/project-tasks/${id}`, { cookie: a, body: { active: false } }, { id })
  assert.equal((await json(await call(T.task, "PUT", `/api/admin/project-tasks/${id}`, { cookie: a, body: { active: true } }, { id }))).body.task.active, true)
  assert.equal((await submitFlow(j, {}, "docJohn")).status, 201)
  const del = await json(await call(T.task, "DELETE", "/api/admin/project-tasks/t1", { cookie: a }, { id: "t1" }))
  assert.equal(del.body.hidden, true)
  assert.equal((await json(await call(T.task, "DELETE", `/api/admin/project-tasks/${id}`, { cookie: a }, { id }))).body.deleted, true)
})

test("assigned projects match the student's course by name (punctuation/case-insensitive), never by a guessed id", async () => {
  const mine = await import("../../app/api/student/project-tasks/route")
  db.seed("students", "docNoId", { studentId: "CI2026030", name: "Nia", username: "nia@x.com", password: "pw", courseName: ["aws cloud-practitioner"], status: "Active" }) // no courseID at all
  const c = await login("nia@x.com", "pw")
  const r = await json(await call(mine, "GET", "/api/student/project-tasks", { cookie: c }))
  assert.deepEqual(r.body.tasks.map((t: any) => t.id), ["t1"]) // not t2 (DevOps, course_id 2 == guessed index)
  assert.equal(r.body.tasks[0].student_course, "aws cloud-practitioner")
})

test("files kept in Firestore (Storage unreachable from the browser): submit verifies them and download streams the bytes", async () => {
  const c = await john()
  const up = await json(await call(R.uploadUrls, "POST", "/api/projects/upload-urls", { cookie: c, body: { files: [{ name: "shot.png", size: 11, type: "image/png", kind: "project" }] } }))
  const slot = up.body.slots[0]
  const key = encodeURIComponent(slot.path)
  const payload = Buffer.from("hello world")
  db.seed("file_chunks", `${key}__0`, { file_key: key, index: 0, data: payload.subarray(0, 6).toString("base64") })
  db.seed("file_chunks", `${key}__1`, { file_key: key, index: 1, data: payload.subarray(6).toString("base64") })
  // not complete yet: no metadata => submit must refuse
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { task_id: "t1", files: [{ path: slot.path, kind: "project" }] } })).status, 400)
  db.seed("stored_files", key, { path: slot.path, size: 11, content_type: "image/png", chunks: 2 })
  const s = await json(await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { task_id: "t1", files: [{ path: slot.path, kind: "project" }] } }))
  assert.equal(s.status, 201, JSON.stringify(s.body))
  const pid = s.body.project.id, fid = s.body.project.files[0].id
  const dl = await call(R.myFile, "GET", `/api/student/projects/${pid}/files/${fid}`, { cookie: c }, { id: pid, fileId: fid })
  assert.equal(dl.status, 200); assert.equal(dl.headers.get("content-type"), "image/png")
  assert.equal(Buffer.from(await dl.arrayBuffer()).toString(), "hello world")
  // another student cannot read it
  const p = await priya()
  assert.equal((await call(R.myFile, "GET", `/api/student/projects/${pid}/files/${fid}`, { cookie: p }, { id: pid, fileId: fid })).status, 404)
})

test("csrf: cross-origin state change is blocked", async () => {
  const c = await john()
  const r = await call(R.uploadUrls, "POST", "/api/projects/upload-urls", { cookie: c, origin: "https://evil.example", body: { files: [] } })
  assert.equal(r.status, 403)
})

/* ------------------------------ scenarios ------------------------------ */
test("1. upload valid project → status Submitted, stored with files", async () => {
  const c = await john()
  const s = await submitFlow(c)
  assert.equal(s.status, 201, JSON.stringify(s.body))
  assert.equal(s.body.project.status, "Submitted")
  assert.equal(s.body.project.files.length, 2)
  assert.equal(s.body.project.student_id, "CI2026001")
  const list = await json(await call(R.myProjects, "GET", "/api/student/projects", { cookie: c }))
  assert.equal(list.body.projects.length, 1)
})

test("1b. upload validation: type, size, missing file, not-uploaded, foreign path, not enrolled", async () => {
  db.seed("project_tasks", "t9", { course_id: 9, course_name: "Other Course", title: "X", description: "d", category: "Other", due_date: null, resource_url: null, active: true, created_by_name: "A", created_at: "2026-01-03T00:00:00.000Z", updated_at: "2026-01-03T00:00:00.000Z" })
  const c = await john()
  const bad = async (files: any[]) => (await call(R.uploadUrls, "POST", "/api/projects/upload-urls", { cookie: c, body: { files } })).status
  assert.equal(await bad([{ name: "evil.exe", size: 10, kind: "project" }]), 400)
  assert.equal(await bad([{ name: "big.zip", size: 501 * 1024 * 1024, kind: "project" }]), 400)
  assert.equal(await bad([{ name: "ok.zip", size: 500 * 1024 * 1024, kind: "project" }]), 200) // 500 MB is allowed
  assert.equal(await bad([]), 400)
  // submit without uploading
  const up = await json(await call(R.uploadUrls, "POST", "/api/projects/upload-urls", { cookie: c, body: { files: [{ name: "a.pdf", size: 10, kind: "project" }] } }))
  const slot = up.body.slots[0]
  const base = { task_id: "t1", project_description: "D" }
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, files: [{ path: slot.path, kind: "project" }] } })).status, 400) // never PUT
  bucket.put(slot.path, 10)
  // foreign student's path
  const foreign = slot.path.replace("docJohn", "docPriya"); bucket.put(foreign, 10)
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, files: [{ path: foreign, kind: "project" }] } })).status, 400)
  // path traversal
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, files: [{ path: "project-submissions/docJohn/../docPriya/x/a.pdf", kind: "project" }] } })).status, 400)
  // missing / unknown project
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, task_id: undefined, files: [{ path: slot.path, kind: "project" }] } })).status, 400)
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, task_id: "nope", files: [{ path: slot.path, kind: "project" }] } })).status, 404)
  // not enrolled in course 9
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, task_id: "t9", files: [{ path: slot.path, kind: "project" }] } })).status, 403)
  // only supporting files
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, files: [{ path: slot.path, kind: "supporting" }] } })).status, 400)
  // happy path afterwards
  assert.equal((await call(R.submit, "POST", "/api/projects/submit", { cookie: c, body: { ...base, files: [{ path: slot.path, kind: "project" }] } })).status, 201)
})

test("1c. client cannot set status / certificate fields on submit", async () => {
  const c = await john()
  const s = await submitFlow(c, { status: "Accepted", certificate_id: "HACK", student_id: "CI9999999", student_name: "Mallory" })
  assert.equal(s.status, 201)
  assert.equal(s.body.project.status, "Submitted")
  assert.equal(s.body.project.student_name, "John Doe")
  assert.equal(db.all("certificates").length, 0)
})

test("1d. only one active project per student", async () => {
  const c = await john()
  assert.equal((await submitFlow(c)).status, 201)
  const again = await submitFlow(c)
  assert.equal(again.status, 409)
})

test("2/3. admin sees pending list, opens → Under Review", async () => {
  const c = await john(); const s = await submitFlow(c)
  const a = await admin()
  const list = await json(await call(R.aProjects, "GET", "/api/admin/projects", { cookie: a }))
  assert.equal(list.status, 200); assert.equal(list.body.projects.length, 1)
  const opened = await json(await call(R.aProject, "GET", `/api/admin/projects/${s.body.project.id}`, { cookie: a }, { id: s.body.project.id }))
  assert.equal(opened.body.project.status, "Under Review")
})

test("4. accept → certificate created, id == student id, token, QR url, notification", async () => {
  const { cert, project, c } = await submitAndAccept()
  assert.equal(cert.certificate_id, "CI2026001")
  assert.equal(cert.status, "Valid")
  assert.ok(tok(cert).length >= 32)
  assert.equal(project.status, "Submitted")
  const mine = await json(await call(R.myProjects, "GET", "/api/student/projects", { cookie: c }))
  assert.equal(mine.body.projects[0].status, "Accepted")
  const n = await json(await call(R.notifs, "GET", "/api/student/notifications", { cookie: c }))
  assert.ok(n.body.notifications.some((x: any) => x.title === "Project Approved!"))
  assert.equal(db.all("certificate_tokens").length, 1)
})

test("5. reject requires remarks; notification sent; student may resubmit", async () => {
  const c = await john(); const s = await submitFlow(c); const a = await admin(); const id = s.body.project.id
  assert.equal((await call(R.reject, "PUT", `/api/admin/projects/${id}/reject`, { cookie: a, body: {} }, { id })).status, 400)
  assert.equal((await call(R.reject, "PUT", `/api/admin/projects/${id}/reject`, { cookie: a, body: { remarks: "   " } }, { id })).status, 400)
  const r = await json(await call(R.reject, "PUT", `/api/admin/projects/${id}/reject`, { cookie: a, body: { remarks: "Missing architecture diagram" } }, { id }))
  assert.equal(r.body.project.status, "Rejected")
  assert.equal(r.body.project.admin_remarks, "Missing architecture diagram")
  const n = await json(await call(R.notifs, "GET", "/api/student/notifications", { cookie: c }))
  assert.ok(n.body.notifications.some((x: any) => x.title === "Project Requires Changes" && x.message.includes("Missing architecture diagram")))
  assert.equal(db.all("certificates").length, 0)
})

test("6. request resubmission → student resubmits same project → Submitted again, then accepted", async () => {
  const c = await john(); const s = await submitFlow(c); const a = await admin(); const id = s.body.project.id
  assert.equal((await call(R.resubmit, "PUT", `/api/admin/projects/${id}/resubmit`, { cookie: a, body: {} }, { id })).status, 400)
  const r = await json(await call(R.resubmit, "PUT", `/api/admin/projects/${id}/resubmit`, { cookie: a, body: { remarks: "Add README" } }, { id }))
  assert.equal(r.body.project.status, "Resubmission Required")
  const again = await submitFlow(c, { project_id: id, project_description: "Added README" })
  assert.equal(again.status, 201, JSON.stringify(again.body))
  assert.equal(again.body.project.id, id)
  assert.equal(again.body.project.status, "Submitted")
  assert.equal(db.all("projects").length, 1)
  assert.equal((await acceptIt(a, id)).status, 200)
  assert.equal(db.get("certificates", "cert_CI2026001")!.project_title, "Serverless Image Pipeline")
  // cannot resubmit an accepted project
  assert.equal((await submitFlow(c, { project_id: id })).status, 409)
})

test("7. no certificate for a non-accepted project; student cannot reach others'", async () => {
  const c = await john(); await submitFlow(c)
  const list = await json(await call(R.myCerts, "GET", "/api/student/certificates", { cookie: c }))
  assert.deepEqual(list.body.certificates, [])
  assert.equal((await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: c }, { certificateId: "CI2026001" })).status, 404)
})

test("8. accepted student sees certificate and downloads a real PDF", async () => {
  const { c } = await submitAndAccept()
  const list = await json(await call(R.myCerts, "GET", "/api/student/certificates", { cookie: c }))
  assert.equal(list.body.certificates.length, 1)
  const pdf = await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: c }, { certificateId: "CI2026001" })
  assert.equal(pdf.status, 200)
  assert.equal(pdf.headers.get("content-type"), "application/pdf")
  assert.match(pdf.headers.get("content-disposition")!, /CI2026001\.pdf/)
  const buf = Buffer.from(await pdf.arrayBuffer())
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-")
  const certsBefore = JSON.stringify(db.all("certificates"))
  await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: c }, { certificateId: "CI2026001" })
  assert.equal(JSON.stringify(db.all("certificates")), certsBefore, "downloading must not change anything")
})

test("9. PDF content: text fields + QR decodes to the verify URL (token only)", async () => {
  const { c, cert } = await submitAndAccept()
  const pdf = await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: c }, { certificateId: "CI2026001" })
  const dir = mkdtempSync(path.join(tmpdir(), "certpdf-"))
  const f = path.join(dir, "c.pdf"); writeFileSync(f, Buffer.from(await pdf.arrayBuffer()))
  const text = execFileSync("pdftotext", ["-layout", f, "-"]).toString()
  for (const needle of ["CLOUD INSTITUTION", "John Doe", "AWS Cloud Practitioner", "COURSE COMPLETION", "successfully completing the course", "CI2026001"]) {
    assert.ok(text.includes(needle), `PDF should contain "${needle}"`)
  }
  execFileSync("pdftoppm", ["-r", "200", "-png", f, path.join(dir, "p")])
  const png = PNG.sync.read(readFileSync(path.join(dir, "p-1.png")))
  const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  assert.ok(qr, "QR must be detectable in the rendered PDF")
  assert.equal(qr!.data, `${ORIGIN}/certificate/verify/${tok(cert)}`)
  assert.ok(!/John|CI2026/.test(qr!.data), "QR must hold no personal data")
})

test("10. QR endpoint returns a PNG for the owner only", async () => {
  const { c, cert } = await submitAndAccept(); const p = await priya()
  const r = await call(R.myCertQr, "GET", "/api/student/certificates/CI2026001/qr", { cookie: c }, { certificateId: "CI2026001" })
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png")
  const png = PNG.sync.read(Buffer.from(await r.arrayBuffer()))
  assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)!.data, `${ORIGIN}/certificate/verify/${tok(cert)}`)
  assert.equal((await call(R.myCertQr, "GET", "/api/student/certificates/CI2026001/qr", { cookie: p }, { certificateId: "CI2026001" })).status, 403)
})

test("11. public verify by token: VALID with only public fields; no login needed", async () => {
  const { cert } = await submitAndAccept()
  const v = await json(await call(R.verify, "GET", `/api/certificate/verify/${tok(cert)}`, {}, { key: tok(cert) }))
  assert.equal(v.status, 200); assert.equal(v.body.status, "VALID")
  assert.equal(v.body.student_name, "John Doe"); assert.equal(v.body.organization, "Cloud Institution")
  assert.equal(v.body.is_owner, false)
  for (const k of ["student_email", "student_doc_id", "certificate_token", "project_id"]) assert.ok(!(k in v.body), `${k} must not leak`)
})

test("12. verify unknown → NOT_FOUND 404 'Certificate Not Found / Invalid Certificate'", async () => {
  const v = await json(await call(R.verify, "GET", "/api/certificate/verify/does-not-exist", {}, { key: "does-not-exist" }))
  assert.equal(v.status, 404); assert.equal(v.body.status, "NOT_FOUND")
  assert.equal(v.body.message, "Certificate Not Found / Invalid Certificate")
})

test("13. revoke → verify shows REVOKED (no personal data) at once; download blocked; reactivate restores", async () => {
  const { c, a, cert } = await submitAndAccept()
  const rv = await json(await call(R.revoke, "PUT", "/api/admin/certificates/CI2026001/revoke", { cookie: a, body: { reason: "Plagiarism" } }, { certificateId: "CI2026001" }))
  assert.equal(rv.body.certificate.status, "Revoked")
  const v = await json(await call(R.verify, "GET", `/api/certificate/verify/${tok(cert)}`, {}, { key: tok(cert) }))
  assert.equal(v.body.status, "REVOKED"); assert.equal(v.body.message, "Certificate Revoked")
  assert.ok(!("student_name" in v.body))
  assert.equal((await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: c }, { certificateId: "CI2026001" })).status, 403)
  // student still sees it in the list, flagged as revoked
  const list = await json(await call(R.myCerts, "GET", "/api/student/certificates", { cookie: c }))
  assert.equal(list.body.certificates[0].status, "Revoked")
  await call(R.reactivate, "PUT", "/api/admin/certificates/CI2026001/reactivate", { cookie: a }, { certificateId: "CI2026001" })
  const v2 = await json(await call(R.verify, "GET", `/api/certificate/verify/${tok(cert)}`, {}, { key: tok(cert) }))
  assert.equal(v2.body.status, "VALID")
  assert.equal((await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: c }, { certificateId: "CI2026001" })).status, 200)
  // token & id unchanged by revoke/reactivate
  assert.equal(db.get("certificates", "cert_CI2026001")!.certificate_token, tok(cert))
})

test("14. logged-in owner scanning own QR is told it's theirs; others are not", async () => {
  const { c, cert } = await submitAndAccept(); const p = await priya()
  const own = await json(await call(R.verify, "GET", `/api/certificate/verify/${tok(cert)}`, { cookie: c }, { key: tok(cert) }))
  assert.equal(own.body.is_owner, true); assert.equal(own.body.owner_url, "/student/certificates/CI2026001")
  const other = await json(await call(R.verify, "GET", `/api/certificate/verify/${tok(cert)}`, { cookie: p }, { key: tok(cert) }))
  assert.equal(other.body.is_owner, false); assert.equal(other.body.owner_url, null)
})

test("15. RBAC: students can't use admin APIs; anonymous gets 401; teacher can review but not manage certificates", async () => {
  const c = await john(); const t = await teacher(); const a = await admin()
  const s = await submitFlow(c); const id = s.body.project.id
  assert.equal((await call(R.aProjects, "GET", "/api/admin/projects", { cookie: c })).status, 403)
  assert.equal((await call(R.aProjects, "GET", "/api/admin/projects")).status, 401)
  assert.equal((await call(R.accept, "PUT", `/api/admin/projects/${id}/accept`, { cookie: c, body: {} }, { id })).status, 403)
  assert.equal((await call(R.aCerts, "GET", "/api/admin/certificates", { cookie: c })).status, 403)
  assert.equal((await call(R.aCerts, "GET", "/api/admin/certificates", { cookie: t })).status, 403)
  assert.equal((await call(R.aProjects, "GET", "/api/admin/projects", { cookie: t })).status, 200)
  assert.equal((await acceptIt(t, id)).status, 200)
  assert.equal((await call(R.revoke, "PUT", "/api/admin/certificates/CI2026001/revoke", { cookie: t, body: {} }, { certificateId: "CI2026001" })).status, 403)
  assert.equal((await call(R.revoke, "PUT", "/api/admin/certificates/CI2026001/revoke", { cookie: a, body: {} }, { certificateId: "CI2026001" })).status, 200)
  // admin-only student endpoints reject staff
  assert.equal((await call(R.courses, "GET", "/api/student/courses", { cookie: a })).status, 403)
})

test("16. a student cannot read another student's certificate/project files", async () => {
  const { cert } = await submitAndAccept(); const p = await priya()
  assert.equal((await call(R.myCert, "GET", "/api/student/certificates/CI2026001", { cookie: p }, { certificateId: "CI2026001" })).status, 403)
  assert.equal((await call(R.myCertPdf, "GET", "/api/student/certificates/CI2026001/download", { cookie: p }, { certificateId: "CI2026001" })).status, 403)
  const projectId = db.all("projects")[0].id
  const fileId = (db.all("projects")[0] as any).files[0].id
  assert.equal((await call(R.myFile, "GET", `/api/student/projects/${projectId}/files/${fileId}`, { cookie: p }, { id: projectId, fileId })).status, 404)
  assert.ok(cert)
})

test("17. file downloads redirect (302) to short-lived signed URLs for owner and admin", async () => {
  const c = await john(); const s = await submitFlow(c); const a = await admin()
  const id = s.body.project.id; const fileId = s.body.project.files[0].id
  const r = await call(R.myFile, "GET", `/api/student/projects/${id}/files/${fileId}`, { cookie: c }, { id, fileId })
  assert.equal(r.status, 302); assert.match(r.headers.get("location")!, /^https:\/\/fake-storage\.test\/read\/project-submissions\/docJohn\//)
  const r2 = await call(R.aFile, "GET", `/api/admin/projects/${id}/files/${fileId}`, { cookie: a }, { id, fileId })
  assert.equal(r2.status, 302)
})

test("18. several projects per student: a further project is accepted but no second certificate is issued", async () => {
  const { c, a } = await submitAndAccept()
  // same project cannot be submitted twice
  assert.equal((await submitFlow(c)).status, 409)
  // force a second project into the db (e.g. legacy data) and try to accept it
  db.seed("projects", "legacy2", { ...db.all("projects")[0], id: undefined, status: "Submitted", certificate_id: null, project_title: "Another" })
  const r = await acceptIt(a, "legacy2")
  assert.equal(r.status, 200)
  assert.equal(db.all("certificates").length, 1); assert.equal(db.all("certificate_tokens").length, 1)
  assert.equal(db.get("projects", "legacy2")!.status, "Accepted")
  const { toProjectView } = await import("../../lib/server/projects-service")
  const v = toProjectView("legacy2", db.get("projects", "legacy2") as any, db.all("certificates")[0] as any)
  assert.equal(v.certificate_available, true, "any accepted project offers the same certificate")
})

test("19. concurrent accepts → exactly one certificate, one token; every call succeeds idempotently", async () => {
  const c = await john(); const s = await submitFlow(c); const a = await admin(); const id = s.body.project.id
  const results = await Promise.all(Array.from({ length: 12 }, () => acceptIt(a, id)))
  assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.status)))
  assert.equal(results.filter((r) => r.body.created).length, 1)
  assert.equal(new Set(results.map((r) => r.body.certificate.certificate_token)).size, 1)
  assert.equal(db.all("certificates").length, 1); assert.equal(db.all("certificate_tokens").length, 1)
  const n = db.all("student_notifications").filter((x: any) => x.title === "Project Approved!")
  assert.equal(n.length, 1, "exactly one approval notification")
})

test("20. accepting twice is idempotent; reject after accept is refused", async () => {
  const { a, project, cert } = await submitAndAccept()
  const again = await acceptIt(a, project.id)
  assert.equal(again.status, 200); assert.equal(again.body.created, false)
  assert.equal(tok(again.body.certificate), tok(cert))
  const rj = await call(R.reject, "PUT", `/api/admin/projects/${project.id}/reject`, { cookie: a, body: { remarks: "x" } }, { id: project.id })
  assert.equal(rj.status, 409)
})

test("21. odd student IDs work as certificate codes (slash, space, unicode-free symbols)", async () => {
  for (const [i, sid] of ["CI/2026/007", "ci 2026 008", "A.B-9_#1"].entries()) {
    db.seed("students", `d${i}`, { studentId: sid, name: `Stu ${i}`, username: `s${i}@x.com`, password: "pw", courseID: [1], courseName: ["AWS Cloud Practitioner"], status: "Active" })
    const c = await login(`s${i}@x.com`, "pw")
    const s = await submitFlow(c, {}, `d${i}`); assert.equal(s.status, 201, JSON.stringify(s.body))
    const a = await admin(); const r = await acceptIt(a, s.body.project.id)
    assert.equal(r.status, 200); assert.equal(r.body.certificate.certificate_id, sid)
    const key = encodeURIComponent(sid)
    const dl = await call(R.myCertPdf, "GET", `/api/student/certificates/${key}/download`, { cookie: c }, { certificateId: key })
    assert.equal(dl.status, 200, `download for ${sid}`)
    assert.ok(!/[/ ]/.test(dl.headers.get("content-disposition")!.split("filename=")[1].replace(/"/g, "")))
  }
})

test("22. token-only verify setting stops enumeration by student ID", async () => {
  const { cert } = await submitAndAccept()
  const byId = await json(await call(R.verify, "GET", "/api/certificate/verify/CI2026001", {}, { key: "CI2026001" }))
  assert.equal(byId.body.status, "VALID") // default: ID lookup allowed (manual verification)
  process.env.CERT_VERIFY_TOKEN_ONLY = "true"
  const blocked = await json(await call(R.verify, "GET", "/api/certificate/verify/CI2026001", {}, { key: "CI2026001" }))
  assert.equal(blocked.status, 404)
  const ok = await json(await call(R.verify, "GET", `/api/certificate/verify/${tok(cert)}`, {}, { key: tok(cert) }))
  assert.equal(ok.body.status, "VALID")
})

test("23. public PDF download is off by default, on with CERT_PUBLIC_DOWNLOAD", async () => {
  const { cert } = await submitAndAccept()
  const k = tok(cert)
  assert.equal((await call(R.verifyPdf, "GET", `/api/certificate/verify/${k}/download`, {}, { key: k })).status, 403)
  process.env.CERT_PUBLIC_DOWNLOAD = "true"
  const r = await call(R.verifyPdf, "GET", `/api/certificate/verify/${k}/download`, {}, { key: k })
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "application/pdf")
})

test("24. admin list: counts, search and filters on certificates", async () => {
  const { a } = await submitAndAccept()
  db.seed("students", "docP2", { studentId: "CI2026010", name: "Zed Zebra", username: "z@x.com", password: "pw", courseID: [2], courseName: ["DevOps"], status: "Active" })
  const z = await login("z@x.com", "pw")
  const s = await json(await call(R.uploadUrls, "POST", "/api/projects/upload-urls", { cookie: z, body: { files: [{ name: "a.pdf", size: 5, kind: "project" }] } }))
  bucket.put(s.body.slots[0].path, 5)
  const sub = await json(await call(R.submit, "POST", "/api/projects/submit", { cookie: z, body: { task_id: "t2", project_description: "d", files: [{ path: s.body.slots[0].path, kind: "project" }] } }))
  await acceptIt(a, sub.body.project.id)
  const list = async (q: string) => (await json(await call(R.aCerts, "GET", `/api/admin/certificates${q}`, { cookie: a }))).body.certificates
  assert.equal((await list("")).length, 2)
  assert.equal((await list("?q=zebra")).length, 1)
  assert.equal((await list("?q=CI2026001")).length, 1)
  assert.equal((await list("?q=pipeline")).length, 2) // "Serverless Image Pipeline" and "CI/CD Pipeline"
  assert.equal((await list("?course_id=2")).length, 1)
  assert.equal((await list("?status=Revoked")).length, 0)
  assert.equal((await list("?from=2999-01-01")).length, 0)
  await call(R.revoke, "PUT", "/api/admin/certificates/CI2026001/revoke", { cookie: a, body: {} }, { certificateId: "CI2026001" })
  assert.equal((await list("?status=Revoked")).length, 1)
  const pl = await json(await call(R.aProjects, "GET", "/api/admin/projects", { cookie: a }))
  assert.equal(pl.body.counts.accepted ?? pl.body.counts.Accepted, 2)
  const dl = await call(R.aCertPdf, "GET", "/api/admin/certificates/CI2026010/download", { cookie: a }, { certificateId: "CI2026010" })
  assert.equal(dl.status, 200)
})

test("25. notifications can be marked read, only by their owner", async () => {
  const { c } = await submitAndAccept(); const p = await priya()
  const n = (await json(await call(R.notifs, "GET", "/api/student/notifications", { cookie: c }))).body.notifications[0]
  assert.equal(n.read, false)
  assert.notEqual((await call(R.notifRead, "PUT", `/api/student/notifications/${n.id}/read`, { cookie: p }, { id: n.id })).status, 200)
  assert.equal((await call(R.notifRead, "PUT", `/api/student/notifications/${n.id}/read`, { cookie: c }, { id: n.id })).status, 200)
  assert.equal((await json(await call(R.notifs, "GET", "/api/student/notifications", { cookie: c }))).body.notifications[0].read, true)
})

test("26. certificate issue date uses the configured time zone", async () => {
  const { todayInConfiguredZone } = await import("../../lib/server/certificates-service")
  const at = new Date("2026-03-09T21:00:00Z") // 02:30 on the 10th in India
  process.env.CERT_TIMEZONE = "Asia/Kolkata"; assert.equal(todayInConfiguredZone(at), "2026-03-10")
  process.env.CERT_TIMEZONE = "UTC"; assert.equal(todayInConfiguredZone(at), "2026-03-09")
  delete process.env.CERT_TIMEZONE
})

test("27. student with no course on record can pick from the institute course list", async () => {
  db.seed("students", "docNoCourse", { studentId: "CI2026020", name: "Pooja", username: "pooja@x.com", password: "pw", status: "Active" })
  db.seed("courses", "c1", { title: "AWS Solutions Architect", courseID: 7 })
  const c = await login("pooja@x.com", "pw")
  const list = await json(await call(R.courses, "GET", "/api/student/courses", { cookie: c }))
  assert.deepEqual(list.body.courses, [{ id: 7, name: "AWS Solutions Architect" }])
  db.seed("project_tasks", "t7", { course_id: 7, course_name: "AWS Solutions Architect", title: "SA Project", description: "d", category: "Cloud", due_date: null, resource_url: null, active: true, created_by_name: "A", created_at: "2026-01-04T00:00:00.000Z", updated_at: "2026-01-04T00:00:00.000Z" })
  const s = await submitFlow(c, { task_id: "t7" }, "docNoCourse")
  assert.equal(s.status, 201, JSON.stringify(s.body))
  assert.equal(s.body.project.course_name, "AWS Solutions Architect")
  const bad = await submitFlow(c, { task_id: "t1" }, "docNoCourse")
  assert.equal(bad.status, 403)
})
