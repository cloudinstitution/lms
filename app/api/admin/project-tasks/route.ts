import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { adminListTasks, createTask, listAllCourses, type TaskInput } from "@/lib/server/projects-service"
import { assertSameOrigin, requireReviewer } from "@/lib/server/session"

/** GET /api/admin/project-tasks — every project assigned to a course (admin / teacher), with the course list for the form. */
export const GET = withApi(async (req) => {
  await requireReviewer(req)
  const [tasks, courses] = await Promise.all([adminListTasks(), listAllCourses()])
  return NextResponse.json({ tasks, courses })
})

/** POST /api/admin/project-tasks { course_id, course_name, title, description, category?, due_date?, resource_url? } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "task-write", 60)
  const staff = await requireReviewer(req)
  const task = await createTask(staff, await readJson<TaskInput>(req))
  return NextResponse.json({ task }, { status: 201 })
})
