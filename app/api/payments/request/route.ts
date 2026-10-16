import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { createPaymentRequest } from "@/lib/server/learners-service"
import { assertSameOrigin, requireLearner } from "@/lib/server/session"

/** POST /api/payments/request { course_id, reference } — opening the payment page (no reference) or "I have paid" (with reference): queued for an admin to confirm. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "pay-request", 30)
  const learner = await requireLearner(req)
  const body = await readJson<{ course_id?: unknown; reference?: unknown }>(req)
  const r = await createPaymentRequest(learner, body.course_id, body.reference)
  return NextResponse.json(r, { status: r.created ? 201 : 200 })
})
