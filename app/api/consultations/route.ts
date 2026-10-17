import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { createConsultation } from "@/lib/server/consultations-service"
import { assertSameOrigin } from "@/lib/server/session"

/** POST /api/consultations { name, phone, email?, interest?, message? } — public "Schedule a Consultation" request. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "consultation", 5)
  return NextResponse.json(await createConsultation(await readJson(req)), { status: 201 })
})
