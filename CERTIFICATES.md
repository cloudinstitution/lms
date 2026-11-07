# Project Submission, Approval & Certificates

Students submit a project → an admin/teacher reviews it → on **Accept** the system issues a PDF certificate
(code = the student's ID, e.g. `CI2026001`) with a QR code that opens a public verification page.

## Flow
| Step | Where |
|---|---|
| Student submits (title, description, category, files) | `/student/projects` |
| Reviewer accepts / rejects / requests resubmission (remarks mandatory for the last two) | `/admin/projects` (admin + teacher) |
| Certificate issued automatically on Accept (record, ID, token, QR, PDF) | server, one transaction |
| Student views / downloads | `/student/certificates` |
| Anyone verifies (QR) → VALID / Revoked / Not Found | `/certificate/verify/<token>` |
| Admin searches, filters, downloads, revokes, reactivates | `/admin/certificates` (admin only) |

## Setup
1. `npm install`
2. Copy the new variables from `.env.example` into your environment. **`SESSION_SECRET` and `NEXT_PUBLIC_SITE_URL` are required in production.**
   `FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY` (already used by your other server routes) must be set.
3. Allow browser uploads to the Storage bucket: edit `storage-cors.json` (your domain) then
   `gsutil cors set storage-cors.json gs://<your-bucket>`
4. **Firestore rules** – the new collections must not be readable/writable from the browser (the server uses the Admin SDK, which bypasses rules):
   ```
   match /projects/{id}              { allow read, write: if false; }
   match /certificates/{id}          { allow read, write: if false; }
   match /certificate_tokens/{id}    { allow read, write: if false; }
   match /student_notifications/{id} { allow read, write: if false; }
   ```
   Storage rules: deny all client access to `project-submissions/**`.
5. Run the tests: `npm run test:certificates` (30 tests, in-memory Firestore/Storage).

## How security works
* Your existing login keeps working. After a successful login the page also calls `POST /api/session/login`, which re-checks the
  credentials on the server and sets an HttpOnly signed cookie (`lms_session`, 4 h). Every project/certificate API trusts **only that cookie**
  and re-reads the user document on each request, so deactivated students / demoted staff lose access immediately.
* Backend rules (not the UI): certificate download requires project `Accepted` + certificate `Valid` + ownership.
* Certificate code = student ID (document key), so duplicates are impossible; a student holds **one** certificate. The QR carries a separate
  192-bit random token, never personal data. Set `CERT_VERIFY_TOKEN_ONLY=true` to stop people enumerating certificates by typing student IDs.
* Revocation is instant (verify endpoint is never cached).

## API
Session: `POST /api/session/login|logout`, `GET /api/session/me`
Student: `GET /api/student/courses`, `POST /api/projects/upload-urls`, `POST /api/projects/submit`, `GET /api/student/projects`,
`GET /api/student/certificates[/id[/download|/qr]]`, `GET /api/student/notifications`, `PUT /api/student/notifications/{id}/read`
Public: `GET /api/certificate/verify/{token}` (+ `/download` if enabled)
Reviewer: `GET /api/admin/projects[/id]`, `PUT /api/admin/projects/{id}/accept|reject|resubmit`
Admin: `GET /api/admin/certificates`, `GET …/{id}/download`, `PUT …/{id}/revoke|reactivate`

## Known limitations
* Names/titles on the PDF must be Latin script (standard PDF fonts).
* One certificate per student (certificate code = student ID). To issue a second one the first must be removed from Firestore.
* Teachers can review every student's project (not limited to `assignedCourses`).
* Project notifications use a separate `student_notifications` collection; the existing global notifications page is unchanged.
* The logo file (`public/cloudinstitution_logo.png`) is small (75×80); supply a larger one for sharper print.
* Not exercised against real Firebase: tests use in-memory fakes that mimic Firestore's strict behaviours; signed-URL uploads need the CORS step above.

## Silent session (no second login)
The LMS login is client-side, so Projects & Certificates start their own signed session cookie automatically: if an API
returns 401 and the browser has an LMS login, `POST /api/session/resume` re-reads that user from Firestore and issues the
cookie. Nobody has to log in again. If `SESSION_SECRET` is not set, the signing key is derived from `FIREBASE_PRIVATE_KEY`.
To require a fresh password login instead, set `LMS_REQUIRE_SERVER_SESSION=true`.

## Assigned projects (per course)
Admin / teacher: **Projects → Assign projects** creates a project for a course (title, what to build, category, optional due date
and brief link; collection `project_tasks`). Students pick their course on **My Projects**, choose one of the projects assigned to
it, upload their work and submit. The title/category/course always come from the assignment. Admin accepts under **Submissions**,
which issues the certificate the student can then download. Deleting an assignment that already has submissions only hides it.

## No service-account credentials required
If `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` are not set, the server uses the same public Firebase web config
(`NEXT_PUBLIC_FIREBASE_*`) the rest of the LMS already uses (`lib/server/web-backend.ts`). Project files are then uploaded by the browser
with the Storage SDK, so your Firestore and Storage **rules must allow** reads/writes for `projects`, `project_tasks`, `certificates`,
`certificate_tokens`, `student_notifications` and the Storage paths `project-submissions/**` and `project-tasks/**`. When the service-account
variables are set, they are used instead (stricter). `GET /api/session/health` shows which mode is active.

## When Cloud Storage can't be used
If the browser cannot reach Firebase Storage (bucket not set up, CORS, rules), uploads of up to 50 MB per file automatically fall back to
Firestore (`stored_files` + `file_chunks` collections, same virtual path). Submitting, reviewing and downloading work the same;
downloads are streamed by the server (`lib/server/stored-files.ts`). Files up to 500 MB (the normal limit) need Storage to be set up. Admin project files in this
mode are served from `/api/task-files`. Your Firestore rules must allow those two collections.

## Self-signup learners and paid courses

Outsiders can create an account at `/signup` and buy a course with Razorpay. Learner accounts live in the `learners` collection
(scrypt-hashed passwords, separate from `students`) and see only the courses they bought (`enrollments`). Prices come from
`lib/server/catalog.ts` — the server decides the amount, never the browser.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Required for payments (without them "Buy now" says payments are not enabled) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional but recommended: set the Razorpay webhook to `https://<site>/api/payments/webhook` (events `payment.captured`, `order.paid`) so a course is granted even if the buyer closes the tab right after paying |

If the server runs without service-account credentials, the Firestore rules must also allow `learners`, `orders`, `enrollments`, `payment_requests`, `course_prices`, `course_content_map`, `course_quizzes`, `learner_progress`, `consultations`, `employees`, `employee_attendance`, `employee_leaves`, `holidays`, `hr_companies`, `offer_letters`, `job_settings`, `job_imports` and `student_resumes` (plus write access to `jobs`, which the automatic job search fills).

### Paying through a Razorpay.me page (no API keys)

While `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set, "Buy now" shows the course price and a link to the payment page
(`PAYMENT_LINK_URL`, default `https://razorpay.me/@cloudinsthireprivatelimited`). The learner pays, enters the payment ID or UTR from the
receipt and taps "I have paid". The request appears under **Admin → Enrollments → Payments waiting for confirmation**; after checking
it in the Razorpay dashboard an admin approves it, which unlocks the course. Nothing unlocks without that approval.

## Automatic job search

Admin → Jobs has an "Automatic job search" panel. It searches public job boards (Remotive and Arbeitnow need no key; Adzuna India needs `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, free at developer.adzuna.com — the best source for Bangalore jobs), keeps jobs whose title or skills match your course keywords (full stack, Python, AI, data analytics, cloud, Linux…) and that are in India, and writes them to the same `jobs` collection students read. Auto jobs close when they expire; manually posted jobs are never touched; a job an admin deletes is not re-imported.
- **Automatic refresh (no scheduler needed):** whenever a student or admin opens the jobs page and the last search is over 12 hours old (and "Search every day" is on), the search runs by itself via `/api/jobs/refresh`. Optionally, any free pinger or scheduler can also call `/api/cron/jobs-sync` with `Authorization: Bearer $CRON_SECRET` (set `CRON_SECRET` first).
- **On demand:** the "Find jobs now" button.

## ATS resume builder (student jobs)

When applying, a student can press "Build ATS resume for this job". The resume is tailored by plain keyword matching (no AI service, no cost): the job's skills are read from its title, requirements and description, the student's matching skills and most relevant projects are moved to the top, a role-specific summary line is added, and an ATS score with tips is shown. Skills the student does not have are never added; the job's other keywords appear as tick-boxes ("I have this"). The PDF is single-column plain text with standard headings, so applicant-tracking systems can read it, and "Use this resume" attaches it to the application. The student's details are saved in `student_resumes/{studentId}` (and in the browser), so the next application starts filled in. Allow client read/write on `student_resumes` in the Firestore rules, as for `job_applications`.

**Upload an existing resume:** in the apply form, once a student has chosen a PDF/DOCX resume, "Make an ATS version of my resume" reads it on the server (`/api/student/resume/parse`, using `unpdf` and `mammoth`; nothing is stored), fills the builder form from it, and the student checks the sections before building the tailored ATS PDF, which then replaces the upload. The builder also has its own upload button. Old `.doc` files and scanned (image-only) PDFs are refused with a clear message.

**Jobs on other websites:** jobs found by the automatic search (marked `auto`) show "Build ATS resume" and "Apply on <site>" instead of the in-app form. The builder downloads the tailored PDF and opens the job's own application page in a new tab, where the student uploads it. These applications happen on the other site, so they are not counted in the admin applicants list. Jobs you post by hand keep the in-app apply form.

**LinkedIn, Naukri and other portals:** these sites have no public job feed and forbid scraping, so the search reaches them through two job-search services that return their listings with a link to the original posting. Add either (or both) key to the server environment; a source without its key is skipped quietly.
- `JSEARCH_API_KEY` — JSearch on RapidAPI (rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch): Google-for-Jobs results from LinkedIn, Naukri, Indeed, Glassdoor and more, with experience requirements. It has a small free plan (a few hundred searches a month), so the search uses at most 6 queries per run.
- `JOOBLE_API_KEY` — Jooble (jooble.org/api/about, free key): aggregates Naukri and many other portals.
Students apply by being sent to the posting on its own portal (the job's `portal` field records which one).
