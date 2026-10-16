import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { adminAddEnrollment, adminListEnrollments } from "@/lib/server/learners-service"
import { progressForMany } from "@/lib/server/learning-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** GET /api/admin/enrollments — online buyers, their courses and payments (admin only). */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  const data = await adminListEnrollments()
  const progress = await progressForMany(data.enrollments.map((e) => ({ learner_id: e.learner_id, course_id: e.course_id })))
  return NextResponse.json({ ...data, enrollments: data.enrollments.map((e, i) => ({ ...e, progress: progress[i] })) })
})

/** POST /api/admin/enrollments { email, course_id, reference? } — unlock a course for a payment seen in the Razorpay dashboard. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  const admin = await requireAdmin(req)
  const body = await readJson<{ email?: unknown; course_id?: unknown; reference?: unknown }>(req)
  return NextResponse.json(await adminAddEnrollment(admin.name, body), { status: 201 })
})
