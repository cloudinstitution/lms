import { NextResponse } from "next/server"
import { setCertificateStatus } from "@/lib/server/certificates-service"
import { readJsonOptional, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** PUT /api/admin/certificates/{certificate_id}/revoke   { reason? } — takes effect on the QR page immediately. */
export const PUT = withApi<{ certificateId: string }>(async (req, { certificateId }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  const body = await readJsonOptional<{ reason?: string }>(req)
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : null
  return NextResponse.json({ certificate: await setCertificateStatus(decodeURIComponent(certificateId), "Revoked", reason, req) })
})
