import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { listEnrollments } from "@/lib/server/learners-service"
import { requireLearner } from "@/lib/server/session"

/** GET /api/learner/me — the signed-in learner and the courses they own. */
export const GET = withApi(async (req) => {
  const learner = await requireLearner(req)
  return NextResponse.json({ learner: { name: learner.name, email: learner.email }, enrollments: await listEnrollments(learner) })
})
