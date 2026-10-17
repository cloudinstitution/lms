import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { listEnrollments } from "@/lib/server/learners-service"
import { progressFor, activityFor } from "@/lib/server/learning-service"
import { requireLearner } from "@/lib/server/session"

/** GET /api/learner/me — the signed-in learner, the courses they own and how far along they are. */
export const GET = withApi(async (req) => {
  const learner = await requireLearner(req)
  const enrollments = await listEnrollments(learner)
  const withProgress = await Promise.all(enrollments.map(async (e) => ({ ...e, progress: await progressFor(learner.docId, e.course_id) })))
  return NextResponse.json({ learner: { name: learner.name, email: learner.email }, enrollments: withProgress, activity: await activityFor(learner.docId) })
})
