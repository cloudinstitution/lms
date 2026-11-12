import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { siteBaseUrl } from "@/lib/server/certificate-config"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"
import { emailStaffLogin } from "@/lib/server/staff-service"

/** Send (or resend) the user their login details. */
export const POST = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  await emailStaffLogin(id, `${siteBaseUrl(req)}/login`)
  return NextResponse.json({ ok: true })
})
