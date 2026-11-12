import { NextResponse } from "next/server"
import { readJsonOptional, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { emailVtu } from "@/lib/server/vtu-service"

export const maxDuration = 60

/** Email the letter (again). Optional { mail_subject, mail_body } replaces this offer's draft first. */
export const POST = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const b = await readJsonOptional<any>(req)
  return NextResponse.json({ email: await emailVtu(id, b.mail_subject !== undefined || b.mail_body !== undefined ? { subject: b.mail_subject, body: b.mail_body } : undefined) })
})
