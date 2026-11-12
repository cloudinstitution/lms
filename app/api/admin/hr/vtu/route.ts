import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { createVtuInternship, emailVtu, getVtuTemplate, listVtuInternships } from "@/lib/server/vtu-service"

export const maxDuration = 60

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const [offers, template] = await Promise.all([listVtuInternships(), getVtuTemplate()])
  return NextResponse.json({ offers, template })
})

/** POST { candidate_name, candidate_email, program, weeks?, offer_date?, usn?, college?, coordinator_name?, coordinator_title?, mail_subject?, mail_body?, send_email? } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const body = await readJson<any>(req)
  const offer = await createVtuInternship(body)
  const email = body?.send_email === false ? { sent: false, skipped: true } : await emailVtu(offer.id)
  return NextResponse.json({ offer: { ...offer, email_status: email.sent ? "sent" : body?.send_email === false ? "not_sent" : "failed" }, email }, { status: 201 })
})
