import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { adminCreateQuiz, adminListQuizzes } from "@/lib/server/learning-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** GET /api/admin/course-quizzes?course_id=3 — quizzes (with answers) for a sold course. */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ quizzes: await adminListQuizzes(new URL(req.url).searchParams.get("course_id")) })
})

/** POST /api/admin/course-quizzes { course_id, title, after_lesson, pass_mark?, questions: [{question, options, answer}] } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  const body = await readJson<Record<string, unknown>>(req)
  return NextResponse.json({ quiz: await adminCreateQuiz(body.course_id, body) }, { status: 201 })
})
