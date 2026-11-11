import { NextResponse } from "next/server"
import { createInternship, listInternships } from "@/lib/server/hr-service"
import { emailInternship } from "@/lib/server/internship-service"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const maxDuration = 60

export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ internships: await listInternships() })
})

/** POST { company_id, candidate_name, candidate_email, position, paid, stipend_amount, start_date, end_date?, duration_value, duration_unit, location, work_mode, offer_date?, send_email? } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  const body = await readJson<any>(req)
  const offer = await createInternship(body)
  const email = body?.send_email === false ? { sent: false, skipped: true } : await emailInternship(offer.id)
  return NextResponse.json({ internship: { ...offer, email_status: email.sent ? "sent" : body?.send_email === false ? "not_sent" : "failed" }, email }, { status: 201 })
})
