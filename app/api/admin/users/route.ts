import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"
import { siteBaseUrl } from "@/lib/server/certificate-config"
import { createStaff, emailStaffLogin, listStaff } from "@/lib/server/staff-service"

export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ users: await listStaff() })
})

export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  const body = await readJson(req)
  const user = await createStaff(body)
  // The account exists either way; if the email can't be sent the admin is told and can resend it.
  let email_sent = false, email_error: string | undefined
  if (body.send_email !== false) {
    try { await emailStaffLogin(user.id, `${siteBaseUrl(req)}/login`); email_sent = true } catch (e) { email_error = e instanceof Error ? e.message : "Could not send the email" }
  }
  return NextResponse.json({ user, email_sent, email_error }, { status: 201 })
})
