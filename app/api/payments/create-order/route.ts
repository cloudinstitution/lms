import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { createOrder } from "@/lib/server/learners-service"
import { assertSameOrigin, requireLearner } from "@/lib/server/session"

/** POST /api/payments/create-order { course_id } — the amount always comes from the server catalogue. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "pay-order", 20)
  const learner = await requireLearner(req)
  const body = await readJson<{ course_id?: unknown }>(req)
  return NextResponse.json(await createOrder(learner, body.course_id))
})
