import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { submitProject } from "@/lib/server/projects-service"
import { assertSameOrigin, requireStudent } from "@/lib/server/session"
import type { SubmittedFile } from "@/lib/server/storage"

/**
 * POST /api/projects/submit
 * Step 2: after the files were uploaded, record the submission. Only the fields below are read from the body;
 * status, student, dates and certificate fields are always decided on the server.
 * Pass `project_id` to resubmit a Rejected / "Resubmission Required" project.
 */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "submit", 20)
  const student = await requireStudent(req)
  const body = await readJson<{
    task_id?: unknown
    course_id?: unknown
    project_title?: unknown
    project_description?: unknown
    category?: unknown
    project_id?: unknown
    files?: unknown
  }>(req)

  const project = await submitProject(student, {
    task_id: body.task_id,
    course_id: body.course_id,
    project_title: body.project_title,
    project_description: body.project_description,
    category: body.category,
    project_id: body.project_id,
    files: Array.isArray(body.files) ? (body.files as SubmittedFile[]) : [],
  })
  return NextResponse.json({ project }, { status: 201 })
})
