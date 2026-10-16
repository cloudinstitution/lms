import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { adminCourseContent, setCourseContent } from "@/lib/server/learners-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** GET /api/admin/course-content — which lessons course each sold course uses, and how many lessons it has. */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json(await adminCourseContent())
})

/** PUT /api/admin/course-content { course_id, lessons_course } */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  const admin = await requireAdmin(req)
  const body = await readJson<{ course_id?: unknown; lessons_course?: unknown }>(req)
  return NextResponse.json(await setCourseContent(admin.name, body.course_id, body.lessons_course))
})
