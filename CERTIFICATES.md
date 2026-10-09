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
