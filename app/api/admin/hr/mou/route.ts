import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { createMou, emailMou, listMous } from "@/lib/server/mou-service"

export const maxDuration = 60

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json({ mous: await listMous() })
})

/** POST { issuer_id?, signer_name?, signer_title?, digital_signature?, company, address?, name?, designation?, email?, phone?, business?, mou_date?, mail_subject?, mail_body?, send_email? } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const body = await readJson<any>(req)
  const mou = await createMou(body)
  const wantsEmail = body?.send_email !== false && Boolean(mou.email)
  const email = !wantsEmail ? { sent: false, skipped: true, reason: mou.email ? "not requested" : "no email address" } : await emailMou(mou.id)
  return NextResponse.json({ mou: { ...mou, email_status: email.sent ? "sent" : wantsEmail ? "failed" : "not_sent" }, email }, { status: 201 })
})
