import { NextResponse } from "next/server"
import { handleWebhook } from "@/lib/server/learners-service"
import { withApi } from "@/lib/server/http"

/** POST /api/payments/webhook — Razorpay server-to-server confirmation (signature-checked). Set RAZORPAY_WEBHOOK_SECRET. */
export const POST = withApi(async (req) => {
  const raw = await req.text()
  await handleWebhook(raw, req.headers.get("x-razorpay-signature"))
  return NextResponse.json({ ok: true })
})
