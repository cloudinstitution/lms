import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { verifyPayment } from "@/lib/server/learners-service"
import { assertSameOrigin, requireLearner } from "@/lib/server/session"

/** POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature } — grants the course after a valid signature. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "pay-verify", 30)
  const learner = await requireLearner(req)
  const body = await readJson<Record<string, unknown>>(req)
  const r = await verifyPayment(learner, body)
  return NextResponse.json({ success: true, course_id: r.course_id })
})
