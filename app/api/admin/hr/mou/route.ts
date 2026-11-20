import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { createMou, emailMou, getMouMailTemplate, getMouTemplateFile, listMous } from "@/lib/server/mou-service"

export const maxDuration = 60

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const [mous, draft, file] = await Promise.all([listMous(), getMouMailTemplate(), getMouTemplateFile()])
  return NextResponse.json({ mous, draft, template: { custom: file.custom, name: file.name, updated_at: file.updated_at ?? null } })
})

/** POST { company, address?, name?, designation?, email?, phone?, business?, mou_date?, mail_subject?, mail_body?, send_email? } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const body = await readJson<any>(req)
  const mou = await createMou(body)
  const wantsEmail = body?.send_email !== false && Boolean(mou.email)
  const email = !wantsEmail ? { sent: false, skipped: true, reason: mou.email ? "not requested" : "no email address" } : await emailMou(mou.id)
  return NextResponse.json({ mou: { ...mou, email_status: email.sent ? "sent" : wantsEmail ? "failed" : "not_sent" }, email }, { status: 201 })
})
