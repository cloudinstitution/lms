import { NextResponse } from "next/server"
import { setCertificateStatus } from "@/lib/server/certificates-service"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

/** PUT /api/admin/certificates/{certificate_id}/reactivate */
export const PUT = withApi<{ certificateId: string }>(async (req, { certificateId }) => {
  assertSameOrigin(req)
  await requireSection(req, "certificates")
  return NextResponse.json({ certificate: await setCertificateStatus(decodeURIComponent(certificateId), "Valid", null, req) })
})
