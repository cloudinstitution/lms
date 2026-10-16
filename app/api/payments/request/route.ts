import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { createPaymentRequest } from "@/lib/server/learners-service"
import { assertSameOrigin, requireLearner } from "@/lib/server/session"

/** POST /api/payments/request { course_id, reference } — "I have paid": queued for an admin to confirm. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "pay-request", 10)
  const learner = await requireLearner(req)
  const body = await readJson<{ course_id?: unknown; reference?: unknown }>(req)
  return NextResponse.json(await createPaymentRequest(learner, body.course_id, body.reference), { status: 201 })
})
